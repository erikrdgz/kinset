/**
 * The versioned journal schema.
 *
 * Everything that crosses a boundary — IndexedDB, the cloud row, an imported export —
 * is parsed through here. A record that fails to parse is quarantined with its raw
 * contents intact so the user can export and recover it; it is never silently replaced
 * with an empty journal.
 *
 * What v2 adds over the audited shape, and why:
 *
 * - `schemaVersion`, so an old client can refuse a newer journal instead of overwriting it.
 * - `entryId` per session exercise, distinct from `exerciseId`, so the same movement can
 *   appear twice in one session and reordering cannot change identity.
 * - `planned` separate from `performed`, so a summary can show what was skipped. Legacy
 *   finished sessions were already stripped of unfinished sets, so they carry
 *   `plannedDetailAvailable: false` rather than an invented skip count.
 * - `loadSemantics` per set, because an existing dumbbell log is genuinely ambiguous
 *   between per-hand and combined. Migrated sets say `unspecifiedLegacy` instead of
 *   guessing.
 * - `exerciseName` snapshotted at log time, so retiring a movement cannot rename or
 *   erase history.
 * - `rest` and `intervals` on the session, so a rest timer survives a reload and active
 *   duration excludes explicit pauses.
 */
import { z } from "zod";
import { planSchema } from "../plans";
import { profileSchema } from "./legacy";

export const SCHEMA_VERSION = 2;

const isoString = z.string().min(1);

export const loadSemanticsSchema = z.enum([
  "none",
  "perDumbbell",
  "combinedExternal",
  "machineStack",
  "addedBodyweight",
  "assistance",
  "unspecifiedLegacy",
]);

export const setTypeSchema = z.enum(["working", "warmup"]);

export const sideSchema = z.enum(["both", "left", "right"]);

/**
 * A value as logged. `reps`/`load` are the raw numbers the user typed, in the session's
 * original unit; canonical comparisons are derived elsewhere and never written back.
 */
const measuredSchema = z.object({
  reps: z.number().int().min(0).max(10000).optional(),
  load: z.number().min(0).max(2000).optional(),
  seconds: z.number().int().min(0).max(86400).optional(),
});

export const setRecordSchema = z.object({
  id: z.string().min(1),
  setType: setTypeSchema.default("working"),
  side: sideSchema.default("both"),
  loadSemantics: loadSemanticsSchema,
  /** What the session asked for. Absent on legacy records. */
  planned: measuredSchema.optional(),
  /**
   * Values typed into the row but not yet confirmed. Kept separate from `performed` so
   * a suggestion can be shown differently from a result, and so an interrupted session
   * does not lose half-entered numbers.
   */
  input: measuredSchema.optional(),
  /** What was actually done. Present once completed. */
  performed: measuredSchema.optional(),
  done: z.boolean(),
  completedAt: isoString.optional(),
  effort: z.number().int().min(1).max(10).optional(),
  note: z.string().max(500).optional(),
});
export type SetRecord = z.infer<typeof setRecordSchema>;

export const sessionExerciseSchema = z.object({
  /** Identity of this slot in the session, independent of which movement fills it. */
  entryId: z.string().min(1),
  exerciseId: z.string().min(1),
  /** Snapshotted so history survives the movement being renamed or retired. */
  exerciseName: z.string().min(1),
  order: z.number().int().min(0),
  targetReps: z.string().optional(),
  /** Set when this slot replaced another movement mid-session. */
  substitutedFrom: z
    .object({ exerciseId: z.string(), exerciseName: z.string() })
    .optional(),
  skipped: z.boolean().default(false),
  note: z.string().max(500).optional(),
  sets: z.array(setRecordSchema),
});
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;

/** A stretch of wall-clock time the session was actually running. */
export const intervalSchema = z.object({
  startedAt: isoString,
  endedAt: isoString.optional(),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1).default(1),
  type: z.enum(["strength"]).default("strength"),
  status: z.enum(["active", "finished", "discarded"]),
  name: z.string().min(1),
  startedAt: isoString,
  finishedAt: isoString.optional(),
  /** The unit the numbers were typed in. Never rewritten by a later preference change. */
  unit: z.enum(["kg", "lb"]),
  timezone: z.string().optional(),
  planId: z.string().optional(),
  dayId: z.string().optional(),
  planName: z.string().optional(),
  /**
   * False for sessions migrated from v1, where unfinished sets were discarded at finish
   * time and cannot be recovered.
   */
  plannedDetailAvailable: z.boolean().default(true),
  intervals: z.array(intervalSchema).default([]),
  /** Epoch ms the current rest ends. Persisted so a reload does not lose the timer. */
  restUntil: z.number().int().optional(),
  restSeconds: z.number().int().min(5).max(900).optional(),
  note: z.string().max(2000).optional(),
  entries: z.array(sessionExerciseSchema),
});
export type Session2 = z.infer<typeof sessionSchema>;

export const journalSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  profile: profileSchema.nullable(),
  sessions: z.array(sessionSchema),
  active: sessionSchema.nullable(),
  plans: z.array(planSchema).optional(),
  activePlanId: z.string().nullable().optional(),
  planProgress: z.record(z.string(), z.number()).optional(),
  planDraft: planSchema.nullable().optional(),
  demoSeed: z.number().optional(),
  /** Set once a v1 journal has been migrated, so the work is never repeated. */
  migratedAt: isoString.optional(),
});
export type Journal = z.infer<typeof journalSchema>;

export const emptyJournal: Journal = {
  schemaVersion: SCHEMA_VERSION,
  profile: null,
  sessions: [],
  active: null,
};

export type ParseResult =
  | { ok: true; journal: Journal }
  | { ok: false; issues: string[]; raw: unknown };

/**
 * Parse a record from any boundary. A failure returns the raw value alongside the
 * issues so the caller can quarantine it; losing a journal is worse than refusing to
 * open one.
 */
export function parseJournal(raw: unknown): ParseResult {
  const result = journalSchema.safeParse(raw);
  if (result.success) return { ok: true, journal: result.data };
  return {
    ok: false,
    raw,
    issues: result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    ),
  };
}

/** Whether a stored record predates v2 and therefore needs migrating. */
export function needsMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  return version === undefined || version === 1;
}

/**
 * A journal written by a newer build than this one. Overwriting it would destroy work
 * done on an updated device, so the app shows an update-required state instead.
 */
export function isFromNewerBuild(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === "number" && version > SCHEMA_VERSION;
}
