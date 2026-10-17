import { describe, it, expect } from "vitest";
import {
  ACCURACY_LIMIT_M,
  acceptSample,
  activeSeconds,
  averagePace,
  buildTrack,
  formatPace,
  haversine,
  projectRoute,
  splits,
  trimForSharing,
  type RouteSample,
  type RunActivity,
} from "./running";

const T0 = Date.parse("2026-10-16T08:00:00.000Z");

/** A straight run east from a fixed point, one sample per second at `speed` m/s. */
function straightRun(count: number, speed = 3, accuracy = 8): RouteSample[] {
  const metresPerDegLon = 111320 * Math.cos((51.5 * Math.PI) / 180);
  return Array.from({ length: count }, (_, i) => ({
    seq: i,
    t: T0 + i * 1000,
    lat: 51.5,
    lon: -0.12 + (i * speed) / metresPerDegLon,
    accuracy,
  }));
}

function activity(samples: RouteSample[]): RunActivity {
  return {
    id: "r1",
    schemaVersion: 1,
    type: "run",
    source: "gps",
    status: "finished",
    title: "Run",
    startedAt: new Date(T0).toISOString(),
    finishedAt: new Date(T0 + samples.length * 1000).toISOString(),
    intervals: [
      {
        startedAt: new Date(T0).toISOString(),
        endedAt: new Date(T0 + samples.length * 1000).toISOString(),
      },
    ],
    samples,
    foregroundOnly: true,
    rejected: {},
    gaps: [],
  };
}

describe("distance", () => {
  it("measures a known separation", () => {
    // One degree of latitude is about 111 km.
    const d = haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("sums accepted segments only", () => {
    const track = buildTrack(straightRun(101, 3));
    // 100 segments at ~3 m/s.
    expect(track.distance).toBeGreaterThan(295);
    expect(track.distance).toBeLessThan(305);
    expect(track.samples).toHaveLength(101);
  });
});

describe("sample filtering", () => {
  it("rejects a fix too vague to measure with, and counts it", () => {
    const samples = straightRun(5);
    samples[2] = { ...samples[2], accuracy: ACCURACY_LIMIT_M + 10 };
    const track = buildTrack(samples);
    expect(track.samples).toHaveLength(4);
    expect(track.rejected.accuracy).toBe(1);
  });

  it("rejects an impossible jump rather than crediting the distance", () => {
    const samples = straightRun(5);
    // A 2 km sideways leap in one second: a bad fix, not a sprint.
    samples[3] = { ...samples[3], lat: 51.52 };
    const track = buildTrack(samples);
    expect(track.rejected.impossibleSpeed).toBe(1);
    expect(track.distance).toBeLessThan(50);
  });

  it("rejects replayed and out-of-order samples", () => {
    const samples = straightRun(4);
    const duplicate = { ...samples[2] };
    const track = buildTrack([...samples, duplicate]);
    expect(track.rejected.duplicateSequence).toBe(1);
    expect(track.samples).toHaveLength(4);
  });

  it("accepts the first sample with no predecessor", () => {
    expect(acceptSample(straightRun(1)[0], null).accept).toBe(true);
  });
});

describe("gaps", () => {
  it("records a reception gap and does not draw a line across it", () => {
    const first = straightRun(10, 3);
    // Five minutes of silence, then the runner reappears a kilometre away.
    const metresPerDegLon = 111320 * Math.cos((51.5 * Math.PI) / 180);
    const second = Array.from({ length: 5 }, (_, i) => ({
      seq: 100 + i,
      t: T0 + 300_000 + i * 1000,
      lat: 51.5,
      lon: -0.12 + (1000 + i * 3) / metresPerDegLon,
      accuracy: 8,
    }));
    const track = buildTrack([...first, ...second]);

    expect(track.gaps).toHaveLength(1);
    expect(track.gaps[0].seconds).toBeGreaterThan(200);
    // The 1 km the runner covered unrecorded is not credited to them.
    expect(track.distance).toBeLessThan(100);
    // The samples either side are both kept.
    expect(track.samples).toHaveLength(15);
  });
});

describe("pace", () => {
  it("returns no pace rather than infinity before any distance", () => {
    expect(averagePace(0, 60, "km")).toBeNull();
    expect(formatPace(null, "km")).toBe("—");
  });

  it("formats a familiar pace", () => {
    // 3 m/s is 1000 m in 333.3 s → 5:33 per km.
    expect(formatPace(averagePace(1000, 333.33, "km"), "km")).toBe("5:33 /km");
  });

  it("handles rounding at the minute boundary", () => {
    expect(formatPace(359.6, "km")).toBe("6:00 /km");
  });
});

describe("splits", () => {
  it("produces one split per unit plus a partial remainder", () => {
    // 1500 m at 3 m/s.
    const result = splits(activity(straightRun(501, 3)), "km");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].partial).toBe(false);
    expect(result[0].distance).toBe(1000);
    // ~333 s for the first kilometre.
    expect(result[0].seconds).toBeGreaterThan(320);
    expect(result[0].seconds).toBeLessThan(345);
    expect(result[result.length - 1].partial).toBe(true);
  });

  it("flags a split whose pace is unreliable because it spans a gap", () => {
    const metresPerDegLon = 111320 * Math.cos((51.5 * Math.PI) / 180);
    const first = straightRun(200, 3);
    const second = Array.from({ length: 200 }, (_, i) => ({
      seq: 1000 + i,
      t: T0 + 400_000 + i * 1000,
      lat: 51.5,
      lon: -0.12 + (600 + i * 3) / metresPerDegLon,
      accuracy: 8,
    }));
    const result = splits(activity([...first, ...second]), "km");
    expect(result.some((s) => s.spansGap)).toBe(true);
  });

  it("has no splits for a manually entered activity", () => {
    const manual: RunActivity = {
      ...activity([]),
      source: "manual",
      manualDistance: 5000,
      manualSeconds: 1800,
    };
    expect(splits(manual, "km")).toEqual([]);
    expect(activeSeconds(manual)).toBe(1800);
  });
});

describe("privacy trimming", () => {
  it("removes samples near the start and the end", () => {
    const samples = straightRun(200, 3);
    const trimmed = trimForSharing(samples, 100);
    expect(trimmed.length).toBeLessThan(samples.length);
    expect(trimmed.length).toBeGreaterThan(0);
    expect(haversine(trimmed[0], samples[0])).toBeGreaterThan(100);
  });

  it("also removes the middle of a loop that passes back through the start", () => {
    // Out and back: the midpoint is far away, the end returns home.
    const metresPerDegLon = 111320 * Math.cos((51.5 * Math.PI) / 180);
    const out = Array.from({ length: 100 }, (_, i) => ({
      seq: i,
      t: T0 + i * 1000,
      lat: 51.5,
      lon: -0.12 + (i * 3) / metresPerDegLon,
      accuracy: 8,
    }));
    const back = Array.from({ length: 100 }, (_, i) => ({
      seq: 100 + i,
      t: T0 + (100 + i) * 1000,
      lat: 51.5,
      lon: -0.12 + ((100 - i) * 3) / metresPerDegLon,
      accuracy: 8,
    }));
    const samples = [...out, ...back];
    const trimmed = trimForSharing(samples, 60);
    // Every surviving sample is clear of both anchors, including the return leg.
    for (const s of trimmed) {
      expect(haversine(s, samples[0])).toBeGreaterThan(60);
      expect(haversine(s, samples[samples.length - 1])).toBeGreaterThan(60);
    }
  });
});

describe("route projection", () => {
  it("fits the route to the box with north up", () => {
    const { points } = projectRoute(straightRun(50, 3), 100, 100);
    expect(points.length).toBe(50);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-0.01);
      expect(p.x).toBeLessThanOrEqual(100.01);
      expect(p.y).toBeGreaterThanOrEqual(-0.01);
      expect(p.y).toBeLessThanOrEqual(100.01);
    }
  });

  it("returns nothing to draw for a route with a single fix", () => {
    expect(projectRoute(straightRun(1)).points).toEqual([]);
  });
});
