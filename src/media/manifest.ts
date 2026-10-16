/**
 * The movement media manifest.
 *
 * You asked for a GIF library instead of the procedural 3D, and this is the layer that
 * makes one droppable. It is deliberately provider-independent: Kinset owns the exercise
 * IDs, and a manifest entry maps one of those IDs onto whatever asset you end up
 * licensing — a local GIF, a local short video, or a remote URL from a supplier.
 *
 * What it does not do is invent sources. The manifest ships empty, because no media is
 * licensed yet, and every screen degrades to the written guide rather than to a broken
 * image. Populate `public/movements/manifest.json` and the players light up with no
 * further code changes.
 *
 * The rights fields are not decoration. `offlineAllowed` decides whether the service
 * worker may cache an asset, and several candidate suppliers' terms forbid storing video
 * at all — so an entry that says `streamOnly` must never end up in a download pack.
 * `expiresAt` exists because signed URLs are not permanent identifiers.
 */
import { findExercise } from "../domain";

export type MediaKind = "gif" | "video" | "image";

export type MediaEntry = {
  /** A Kinset exercise ID. Supplier IDs are external references, never the key. */
  exerciseId: string;
  kind: MediaKind;
  /** Local path under public/, or an absolute URL for a supplier-hosted asset. */
  src: string;
  /** Still frame shown before playback, and the Library row thumbnail. */
  poster?: string;
  width?: number;
  height?: number;
  /** Who made it and under what licence. Rendered wherever the asset is shown. */
  attribution?: string;
  licenseId?: string;
  provider?: string;
  providerAssetId?: string;
  /** `owned` may be cached and packaged offline; `streamOnly` may not. */
  deliveryMode: "owned" | "streamOnly";
  offlineAllowed: boolean;
  /** ISO date after which the asset must be refetched or treated as missing. */
  expiresAt?: string;
  rightsCheckedAt?: string;
  /** Mirrors the catalog's own gate: media can ship before a reviewer has seen it. */
  techniqueReviewed?: boolean;
};

export type MediaManifest = {
  version: 1;
  /** Prepended to every relative `src` and `poster`. */
  basePath?: string;
  entries: MediaEntry[];
};

export const emptyManifest: MediaManifest = { version: 1, entries: [] };

let manifest: MediaManifest = emptyManifest;
let loaded = false;
let loading: Promise<MediaManifest> | null = null;

/**
 * Load the manifest once. A missing or malformed file is not an error worth breaking
 * the app over — it simply means no media, which is the state the app is designed to
 * work in anyway.
 */
export function loadManifest(): Promise<MediaManifest> {
  if (loaded) return Promise.resolve(manifest);
  if (loading) return loading;
  loading = fetch(`${import.meta.env.BASE_URL}movements/manifest.json`)
    .then((r) => (r.ok ? r.json() : emptyManifest))
    .then((json) => {
      manifest = isManifest(json) ? json : emptyManifest;
      loaded = true;
      return manifest;
    })
    .catch(() => {
      loaded = true;
      return manifest;
    });
  return loading;
}

function isManifest(value: unknown): value is MediaManifest {
  if (!value || typeof value !== "object") return false;
  const m = value as MediaManifest;
  return m.version === 1 && Array.isArray(m.entries);
}

/** Replace the manifest directly. Used by tests and by the validation script. */
export function setManifest(next: MediaManifest) {
  manifest = isManifest(next) ? next : emptyManifest;
  loaded = true;
}

function resolve(path: string, basePath?: string) {
  if (/^https?:\/\//.test(path)) return path;
  const base = basePath ?? `${import.meta.env.BASE_URL}movements/`;
  return `${base}${path}`.replace(/([^:])\/\/+/g, "$1/");
}

export type ResolvedMedia = MediaEntry & {
  resolvedSrc: string;
  resolvedPoster?: string;
  expired: boolean;
};

/** The media for one movement, or null when there is none — the normal case today. */
export function mediaFor(
  exerciseId: string,
  now = new Date(),
): ResolvedMedia | null {
  const entry = manifest.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry) return null;
  const expired = Boolean(
    entry.expiresAt && Date.parse(entry.expiresAt) < now.getTime(),
  );
  return {
    ...entry,
    expired,
    resolvedSrc: resolve(entry.src, manifest.basePath),
    resolvedPoster: entry.poster
      ? resolve(entry.poster, manifest.basePath)
      : undefined,
  };
}

/** Assets the service worker is permitted to cache. Stream-only never qualifies. */
export function cacheableAssets(): string[] {
  return manifest.entries
    .filter((e) => e.deliveryMode === "owned" && e.offlineAllowed)
    .flatMap((e) =>
      [e.src, e.poster].filter(Boolean).map((p) => resolve(p!, manifest.basePath)),
    );
}

export type ManifestProblem = { exerciseId: string; problem: string };

/**
 * Validate a manifest against the catalog. Run by `npm run check:media` so a bad entry
 * is caught before it ships rather than rendering as a broken image in a gym.
 */
export function validateManifest(
  candidate: MediaManifest,
  knownId: (id: string) => boolean = (id) => Boolean(findExercise(id)),
): ManifestProblem[] {
  const problems: ManifestProblem[] = [];
  const seen = new Set<string>();

  for (const entry of candidate.entries) {
    const id = entry.exerciseId;
    if (!knownId(id))
      problems.push({ exerciseId: id, problem: "no exercise with this ID" });
    if (seen.has(id))
      problems.push({ exerciseId: id, problem: "duplicate entry" });
    seen.add(id);

    if (!entry.src)
      problems.push({ exerciseId: id, problem: "missing src" });
    if (!entry.licenseId)
      problems.push({
        exerciseId: id,
        problem: "missing licenseId — provenance is required before an asset ships",
      });
    if (entry.deliveryMode === "streamOnly" && entry.offlineAllowed)
      problems.push({
        exerciseId: id,
        problem:
          "stream-only assets cannot be marked offlineAllowed; that combination would cache media the licence forbids storing",
      });
    if (entry.expiresAt && Number.isNaN(Date.parse(entry.expiresAt)))
      problems.push({ exerciseId: id, problem: "expiresAt is not a date" });
  }
  return problems;
}

/** Coverage, for the implementation ledger. */
export function mediaCoverage(totalPublished: number) {
  const withMedia = manifest.entries.length;
  const reviewed = manifest.entries.filter((e) => e.techniqueReviewed).length;
  return { withMedia, reviewed, totalPublished };
}
