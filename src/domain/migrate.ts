/**
 * v1 → v2 journal migration.
 *
 * Properties this must hold, from 04-engineering-plan.md:
 *
 * - **Deterministic and rerunnable.** New identifiers are derived from existing ones
 *   rather than generated, so running the migration twice produces byte-identical output
 *   and an interrupted run cannot duplicate anything.
 * - **Nothing invented.** v1 discarded unfinished sets at finish time. Those sets are
 *   gone; a migrated finished session is marked `plannedDetailAvailable: false` rather
 *   than given a fabricated skip count.
 * - **Nothing reinterpreted.** A v1 dumbbell log is genuinely ambiguous between per-hand
 *   and combined load, so every migrated set carries `unspecifiedLegacy` instead of a
 *   guess. Units are preserved exactly as typed.
 * - **Nothing lost.** Unknown exercise IDs survive as a readable placeholder carrying the
 *   raw ID. Half-typed values on an in-progress set are preserved as input.
 * - **Reconciled.** The caller gets counts from both sides and must compare them before
 *   the result is allowed to replace anything.
 */
import { resolveExerciseName } from "./exercises";
import type { Session as LegacySession, State as LegacyState } from "./legacy";
import {
  SCHEMA_VERSION,
  type Journal,
  type SessionExercise,
  type Session2,
  type SetRecord,
} from "./schema";

export type MigrationCounts = {
  sessions: number;
  activeSessions: number;
  entries: number;
  sets: number;
  completedSets: number;
  plans: number;
  planDays: number;
  drafts: number;
  /** Set IDs, so identity preservation can be checked and not just counted. */
  setIds: string[];
  units: Record<string, number>;
};

export type MigrationReport = {
  source: MigrationCounts;
  target: MigrationCounts;
  ok: boolean;
  discrepancies: string[];
  unknownExerciseIds: string[];
  /** Sessions whose skipped work v1 had already discarded and cannot be recovered. */
  sessionsWithoutPlannedDetail: number;
};

function countLegacy(state: LegacyState): MigrationCounts {
  const all = [...state.sessions, ...(state.active ? [state.active] : [])];
  const units: Record<string, number> = {};
  const setIds: string[] = [];
  let entries = 0;
  let sets = 0;
  let completedSets = 0;
  for (const s of all) {
    units[s.unit] = (units[s.unit] || 0) + 1;
    for (const e of s.entries) {
      entries += 1;
      for (const set of e.sets) {
        sets += 1;
        setIds.push(set.id);
        if (set.done) completedSets += 1;
      }
    }
  }
  return {
    sessions: state.sessions.length,
    activeSessions: state.active ? 1 : 0,
    entries,
    sets,
    completedSets,
    plans: state.plans?.length ?? 0,
    planDays: (state.plans ?? []).reduce((n, p) => n + p.days.length, 0),
    drafts: state.planDraft ? 1 : 0,
    setIds: setIds.sort(),
    units,
  };
}

function countJournal(journal: Journal): MigrationCounts {
  const all = [...journal.sessions, ...(journal.active ? [journal.active] : [])];
  const units: Record<string, number> = {};
  const setIds: string[] = [];
  let entries = 0;
  let sets = 0;
  let completedSets = 0;
  for (const s of all) {
    units[s.unit] = (units[s.unit] || 0) + 1;
    for (const e of s.entries) {
      entries += 1;
      for (const set of e.sets) {
        sets += 1;
        setIds.push(set.id);
        if (set.done) completedSets += 1;
      }
    }
  }
  return {
    sessions: journal.sessions.length,
    activeSessions: journal.active ? 1 : 0,
    entries,
    sets,
    completedSets,
    plans: journal.plans?.length ?? 0,
    planDays: (journal.plans ?? []).reduce((n, p) => n + p.days.length, 0),
    drafts: journal.planDraft ? 1 : 0,
    setIds: setIds.sort(),
    units,
  };
}

function migrateSet(set: LegacySession["entries"][number]["sets"][number]): SetRecord {
  return {
    id: set.id,
    setType: "working",
    side: "both",
    // v1 never recorded whether a dumbbell number meant one hand or two.
    loadSemantics: "unspecifiedLegacy",
    done: set.done,
    ...(set.done
      ? { performed: { reps: set.reps, load: set.weight } }
      : // Values typed but never confirmed stay as input rather than becoming a record.
        set.reps || set.weight
        ? { input: { reps: set.reps || undefined, load: set.weight || undefined } }
        : {}),
  };
}

function migrateSession(session: LegacySession, unknown: Set<string>): Session2 {
  const finished = Boolean(session.finishedAt);
  return {
    id: session.id,
    version: 1,
    type: "strength",
    status: finished ? "finished" : "active",
    name: session.name,
    startedAt: session.startedAt,
    ...(session.finishedAt ? { finishedAt: session.finishedAt } : {}),
    unit: session.unit,
    ...(session.planId ? { planId: session.planId } : {}),
    ...(session.dayId ? { dayId: session.dayId } : {}),
    ...(session.planName ? { planName: session.planName } : {}),
    // A finished v1 session had its unfinished sets removed; that detail is unrecoverable.
    plannedDetailAvailable: !finished,
    intervals: [
      {
        startedAt: session.startedAt,
        ...(session.finishedAt ? { endedAt: session.finishedAt } : {}),
      },
    ],
    entries: session.entries.map((entry, index): SessionExercise => {
      const name = resolveExerciseName(entry.exerciseId);
      if (name.startsWith("Unknown movement")) unknown.add(entry.exerciseId);
      return {
        // Derived, not generated: rerunning the migration yields the same IDs.
        entryId: `${session.id}#${index}`,
        exerciseId: entry.exerciseId,
        exerciseName: name,
        order: index,
        ...(entry.targetReps ? { targetReps: entry.targetReps } : {}),
        skipped: false,
        sets: entry.sets.map(migrateSet),
      };
    }),
  };
}

/**
 * Migrate a v1 journal. Pure: it reads nothing and writes nothing. The caller is
 * responsible for checking `report.ok` before letting the result replace stored data.
 */
export function migrateV1ToV2(state: LegacyState, now = new Date()): {
  journal: Journal;
  report: MigrationReport;
} {
  const unknown = new Set<string>();
  const sessions = state.sessions.map((s) => migrateSession(s, unknown));
  const active = state.active ? migrateSession(state.active, unknown) : null;

  const journal: Journal = {
    schemaVersion: SCHEMA_VERSION,
    profile: state.profile,
    sessions,
    active,
    ...(state.plans ? { plans: state.plans } : {}),
    ...(state.activePlanId !== undefined
      ? { activePlanId: state.activePlanId }
      : {}),
    ...(state.planProgress ? { planProgress: state.planProgress } : {}),
    ...(state.planDraft !== undefined ? { planDraft: state.planDraft } : {}),
    ...(state.demoSeed !== undefined ? { demoSeed: state.demoSeed } : {}),
    migratedAt: now.toISOString(),
  };

  const source = countLegacy(state);
  const target = countJournal(journal);
  const discrepancies: string[] = [];
  const compare = (field: keyof MigrationCounts, label: string) => {
    if (JSON.stringify(source[field]) !== JSON.stringify(target[field]))
      discrepancies.push(
        `${label}: ${JSON.stringify(source[field])} → ${JSON.stringify(target[field])}`,
      );
  };
  compare("sessions", "sessions");
  compare("activeSessions", "active sessions");
  compare("entries", "exercise entries");
  compare("sets", "sets");
  compare("completedSets", "completed sets");
  compare("plans", "plans");
  compare("planDays", "plan days");
  compare("drafts", "drafts");
  compare("setIds", "set identities");
  compare("units", "units");

  return {
    journal,
    report: {
      source,
      target,
      ok: discrepancies.length === 0,
      discrepancies,
      unknownExerciseIds: [...unknown],
      sessionsWithoutPlannedDetail: sessions.filter(
        (s) => !s.plannedDetailAvailable,
      ).length,
    },
  };
}

/**
 * Bring any stored shape up to the current version. Already-current journals are
 * returned untouched, which is what makes a rerun safe.
 */
export function migrateToCurrent(
  raw: unknown,
  now = new Date(),
): { journal: Journal; report: MigrationReport | null } {
  const version = (raw as { schemaVersion?: number } | null)?.schemaVersion;
  if (version === SCHEMA_VERSION)
    return { journal: raw as Journal, report: null };
  const { journal, report } = migrateV1ToV2(raw as LegacyState, now);
  return { journal, report };
}
