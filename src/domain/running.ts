/**
 * Run activities: model, filtering and derived metrics.
 *
 * Deliberately separate from the strength journal. Route samples are append-only and
 * grow without bound, and the cloud journal row is capped at 5 MB — putting a track in
 * there would eventually destroy someone's training history. Runs get their own storage
 * and their own sync path.
 *
 * On honesty, which matters more here than anywhere else in the app:
 *
 * - Distance is the sum of *accepted* segments. Samples with poor accuracy, impossible
 *   speeds or non-monotonic timestamps are rejected and counted, not quietly included.
 * - A gap in reception is a gap. Nothing interpolates across it, and the distance a
 *   runner covered while unrecorded is not invented — it is reported as missing.
 * - Nothing computes calories, VO2 max, training load or recovery. There is no basis
 *   for any of them here.
 * - Elevation is carried only when the source supplies it with a usable vertical
 *   accuracy; it is never derived from latitude and longitude.
 */

export type RouteSample = {
  /** Monotonic within an activity, so replayed native events can be deduplicated. */
  seq: number;
  t: number;
  lat: number;
  lon: number;
  /** Horizontal accuracy in metres, as reported by the source. */
  accuracy: number;
  altitude?: number;
  verticalAccuracy?: number;
  /** Source-reported speed in m/s, when available. Never used as distance. */
  speed?: number;
  heading?: number;
};

export type RejectionReason =
  | "accuracy"
  | "impossibleSpeed"
  | "staleTimestamp"
  | "duplicateSequence";

export type RunStatus = "recording" | "paused" | "finished" | "discarded";

export type RunActivity = {
  id: string;
  schemaVersion: 1;
  type: "run" | "walk";
  /** `gps` was recorded; `manual` was typed in and has no route. */
  source: "gps" | "manual";
  status: RunStatus;
  title: string;
  startedAt: string;
  finishedAt?: string;
  timezone?: string;
  /** Wall-clock stretches the recorder was actually running. */
  intervals: Array<{ startedAt: string; endedAt?: string }>;
  /** Empty for a manual activity. */
  samples: RouteSample[];
  /** Metres, entered by hand for a manual activity. */
  manualDistance?: number;
  manualSeconds?: number;
  note?: string;
  /**
   * Whether this was captured by a recorder the OS could suspend. True for every web
   * recording, and surfaced in the UI rather than hidden.
   */
  foregroundOnly: boolean;
  rejected: Partial<Record<RejectionReason, number>>;
  /** Stretches with no samples, in seconds, so the UI can show them as unrecorded. */
  gaps: Array<{ fromSeq: number; toSeq: number; seconds: number }>;
};

/** Beyond this, a fix is too vague to measure a segment with. */
export const ACCURACY_LIMIT_M = 50;
/** ~43 km/h. Faster than a sprint means a bad fix, not a fast runner. */
export const MAX_SPEED_MS = 12;
/** A silence longer than this is a gap, not a straight line. */
export const GAP_SECONDS = 30;

const EARTH_R = 6371008.8;

/** Great-circle distance in metres. */
export function haversine(
  a: Pick<RouteSample, "lat" | "lon">,
  b: Pick<RouteSample, "lat" | "lon">,
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type AcceptResult = {
  accept: boolean;
  reason?: RejectionReason;
};

/**
 * Whether to accept a sample given the last accepted one.
 *
 * A rejected sample is dropped from the track but counted, so the summary can say the
 * reception was poor rather than presenting a confident wrong number.
 */
export function acceptSample(
  sample: RouteSample,
  previous: RouteSample | null,
): AcceptResult {
  if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lon))
    return { accept: false, reason: "accuracy" };
  if (sample.accuracy > ACCURACY_LIMIT_M)
    return { accept: false, reason: "accuracy" };
  if (!previous) return { accept: true };
  if (sample.seq <= previous.seq)
    return { accept: false, reason: "duplicateSequence" };
  if (sample.t <= previous.t) return { accept: false, reason: "staleTimestamp" };

  const seconds = (sample.t - previous.t) / 1000;
  const metres = haversine(previous, sample);
  // Across a long gap the implied speed is meaningless, so speed is not the test;
  // the gap itself is recorded and the segment is not counted as distance.
  if (seconds <= GAP_SECONDS && metres / seconds > MAX_SPEED_MS)
    return { accept: false, reason: "impossibleSpeed" };
  return { accept: true };
}

export type Track = {
  /** Accepted samples, in order. */
  samples: RouteSample[];
  /** Metres, summed over accepted consecutive segments only. */
  distance: number;
  gaps: RunActivity["gaps"];
  rejected: Partial<Record<RejectionReason, number>>;
};

/**
 * Build a track from raw samples. Pure, so a stored activity can be recomputed when the
 * filtering rules improve without the original samples being altered.
 */
export function buildTrack(raw: RouteSample[]): Track {
  const samples: RouteSample[] = [];
  const gaps: RunActivity["gaps"] = [];
  const rejected: Partial<Record<RejectionReason, number>> = {};
  let distance = 0;

  for (const sample of [...raw].sort((a, b) => a.seq - b.seq)) {
    const previous = samples[samples.length - 1] ?? null;
    const { accept, reason } = acceptSample(sample, previous);
    if (!accept) {
      if (reason) rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    if (previous) {
      const seconds = (sample.t - previous.t) / 1000;
      if (seconds > GAP_SECONDS) {
        // Reception was lost. Record the hole; do not draw across it.
        gaps.push({ fromSeq: previous.seq, toSeq: sample.seq, seconds });
      } else {
        distance += haversine(previous, sample);
      }
    }
    samples.push(sample);
  }
  return { samples, distance, gaps, rejected };
}

/** Seconds the recorder was running, excluding explicit pauses. */
export function activeSeconds(activity: RunActivity, now = Date.now()) {
  if (activity.source === "manual") return activity.manualSeconds ?? 0;
  let ms = 0;
  for (const interval of activity.intervals) {
    const start = Date.parse(interval.startedAt);
    const end = interval.endedAt ? Date.parse(interval.endedAt) : now;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start)
      ms += end - start;
  }
  return ms / 1000;
}

export function runDistance(activity: RunActivity) {
  if (activity.source === "manual") return activity.manualDistance ?? 0;
  return buildTrack(activity.samples).distance;
}

export type DistanceUnit = "km" | "mi";

const M_PER_KM = 1000;
const M_PER_MI = 1609.344;

export function metresPer(unit: DistanceUnit) {
  return unit === "km" ? M_PER_KM : M_PER_MI;
}

export function formatDistance(metres: number, unit: DistanceUnit) {
  const value = metres / metresPer(unit);
  return `${value.toFixed(value < 10 ? 2 : 1)} ${unit}`;
}

/**
 * Average pace in seconds per unit. Returns null rather than Infinity when there is no
 * distance yet — a pace of "∞/km" is not information.
 */
export function averagePace(
  metres: number,
  seconds: number,
  unit: DistanceUnit,
) {
  if (metres <= 0 || seconds <= 0) return null;
  return seconds / (metres / metresPer(unit));
}

export function formatPace(secondsPerUnit: number | null, unit: DistanceUnit) {
  if (secondsPerUnit === null || !Number.isFinite(secondsPerUnit)) return "—";
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${mm}:${String(ss).padStart(2, "0")} /${unit}`;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export type Split = {
  index: number;
  /** Metres covered in this split; the final split is usually partial. */
  distance: number;
  seconds: number;
  paceSecondsPerUnit: number | null;
  partial: boolean;
  /** True when a reception gap falls inside this split, so its pace is unreliable. */
  spansGap: boolean;
};

/**
 * Per-unit splits, computed by walking accepted segments and interpolating the crossing
 * point *within* a segment only. That interpolation is between two real fixes a few
 * seconds apart, which is a different thing from inventing a path across a gap.
 */
export function splits(activity: RunActivity, unit: DistanceUnit): Split[] {
  if (activity.source === "manual") return [];
  const track = buildTrack(activity.samples);
  const per = metresPer(unit);
  const out: Split[] = [];

  let covered = 0;
  let splitStartT = track.samples[0]?.t ?? 0;
  let splitDistance = 0;
  let spansGap = false;
  const gapSeqs = new Set(track.gaps.map((g) => g.toSeq));

  for (let i = 1; i < track.samples.length; i++) {
    const a = track.samples[i - 1];
    const b = track.samples[i];
    if (gapSeqs.has(b.seq)) {
      spansGap = true;
      continue;
    }
    let segment = haversine(a, b);
    let segmentStartT = a.t;

    while (splitDistance + segment >= per) {
      const needed = per - splitDistance;
      const fraction = segment === 0 ? 1 : needed / segment;
      const crossT = segmentStartT + (b.t - segmentStartT) * fraction;
      const seconds = (crossT - splitStartT) / 1000;
      out.push({
        index: out.length + 1,
        distance: per,
        seconds,
        paceSecondsPerUnit: seconds > 0 ? seconds : null,
        partial: false,
        spansGap,
      });
      covered += needed;
      segment -= needed;
      segmentStartT = crossT;
      splitStartT = crossT;
      splitDistance = 0;
      spansGap = false;
    }
    splitDistance += segment;
    covered += segment;
  }

  if (splitDistance > 1) {
    const lastT = track.samples[track.samples.length - 1]?.t ?? splitStartT;
    const seconds = (lastT - splitStartT) / 1000;
    out.push({
      index: out.length + 1,
      distance: splitDistance,
      seconds,
      paceSecondsPerUnit: averagePace(splitDistance, seconds, unit),
      partial: true,
      spansGap,
    });
  }
  void covered;
  return out;
}

/**
 * Remove samples within `radiusM` of the start *and* the end before sharing.
 *
 * Trimming only the first and last points is the common mistake: an out-and-back or a
 * loop passes the start again in the middle, which re-exposes it. This removes every
 * sample near either anchor wherever it occurs in the route.
 *
 * This reduces exposure. It does not make a route anonymous, and the UI says so.
 */
export function trimForSharing(
  samples: RouteSample[],
  radiusM: number,
): RouteSample[] {
  if (!samples.length || radiusM <= 0) return samples;
  const start = samples[0];
  const end = samples[samples.length - 1];
  return samples.filter(
    (s) => haversine(s, start) > radiusM && haversine(s, end) > radiusM,
  );
}

/** Project lat/lon onto a unit box for drawing, preserving aspect at this latitude. */
export function projectRoute(samples: RouteSample[], width = 100, height = 100) {
  if (samples.length < 2) return { points: [], width, height };
  const lats = samples.map((s) => s.lat);
  const lons = samples.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  // Longitude degrees shrink with latitude; without this correction routes look stretched.
  const latScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLon = Math.max((maxLon - minLon) * latScale, 1e-6);
  const scale = Math.min(width / spanLon, height / spanLat);
  const offsetX = (width - spanLon * scale) / 2;
  const offsetY = (height - spanLat * scale) / 2;

  const points = samples.map((s) => ({
    seq: s.seq,
    x: offsetX + (s.lon - minLon) * latScale * scale,
    // SVG y grows downward; north should be up.
    y: height - offsetY - (s.lat - minLat) * scale,
  }));
  return { points, width, height };
}

export function newRun(
  type: "run" | "walk",
  source: "gps" | "manual",
  now = new Date(),
): RunActivity {
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    type,
    source,
    status: source === "manual" ? "finished" : "recording",
    title: type === "run" ? "Run" : "Walk",
    startedAt: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    intervals: source === "manual" ? [] : [{ startedAt: now.toISOString() }],
    samples: [],
    foregroundOnly: source === "gps",
    rejected: {},
    gaps: [],
  };
}
