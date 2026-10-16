/**
 * Turning a plan into a session, and the facts the training screens need about it.
 */
import { demoIds } from "../../motion/catalog";
import {
  assumedEquipment,
  buildLineup,
  convertLoad,
  DEFAULT_REST_SECONDS,
  findExercise,
  type Journal,
  type Profile,
  type Session2,
  type SessionExercise,
  type Unit,
} from "../../domain";
import { defaultEntry, targetReps, type PlanEntry } from "../../plans";
import type { Lineup } from "../../domain";

export type Workout = {
  name: string;
  planName: string;
  planId?: string;
  dayId?: string;
  entries: PlanEntry[];
  /** Slots the selector could not fill. Shown to the user rather than hidden. */
  unmet: Lineup["unmet"];
};

/**
 * The next workout.
 *
 * A custom plan is used verbatim. Otherwise a balanced lineup is generated from the
 * equipment the user said they have — and any slot it cannot fill is reported back
 * instead of being quietly replaced by whatever movement happened to fit.
 */
export function nextWorkout(journal: Journal, profile: Profile): Workout {
  const custom = journal.plans?.find((p) => p.id === journal.activePlanId);
  if (custom && custom.days.length) {
    const index =
      (journal.planProgress?.[custom.id] || 0) % custom.days.length;
    const day = custom.days[index];
    return {
      name: day.name,
      planName: custom.name,
      planId: custom.id,
      dayId: day.id,
      entries: day.entries,
      unmet: [],
    };
  }

  const finished = journal.sessions.filter((s) => s.status === "finished").length;
  const seed = journal.demoSeed ?? 1;
  const lineup = buildLineup(
    assumedEquipment(profile.equipment),
    seed + finished * 7919,
    undefined,
    journal.demoSeed === undefined ? undefined : (id) => demoIds.has(id),
  );
  const sets = profile.experience === "New to training" ? 2 : 3;

  return {
    name: `Full body ${finished % 2 ? "B" : "A"}`,
    planName: `${profile.days}-day foundation`,
    entries: lineup.filled.map((f) => ({
      ...defaultEntry(f.exercise.id),
      sets,
    })),
    unmet: lineup.unmet,
  };
}

/** Reps text for a prescription, including the per-side qualifier. */
export function prescriptionText(entry: PlanEntry) {
  const definition = findExercise(entry.exerciseId);
  return (
    targetReps(entry) + (definition?.measurement.perSide ? " / side" : "")
  );
}

/**
 * Build a v2 session from a workout. Every entry gets its own identity and a snapshot of
 * the movement's name, so the record survives the catalog changing underneath it.
 */
export function buildSession(
  profile: Profile,
  workout: Workout,
  now = new Date(),
): Session2 {
  return {
    id: crypto.randomUUID(),
    version: 1,
    type: "strength",
    status: "active",
    name: workout.name,
    startedAt: now.toISOString(),
    unit: profile.unit,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(workout.planId ? { planId: workout.planId } : {}),
    ...(workout.dayId ? { dayId: workout.dayId } : {}),
    planName: workout.planName,
    plannedDetailAvailable: true,
    intervals: [{ startedAt: now.toISOString() }],
    restSeconds: DEFAULT_REST_SECONDS,
    entries: workout.entries.map((entry, index): SessionExercise => {
      const definition = findExercise(entry.exerciseId);
      return {
        entryId: crypto.randomUUID(),
        exerciseId: entry.exerciseId,
        exerciseName: definition?.name ?? entry.exerciseId,
        order: index,
        targetReps: prescriptionText(entry),
        skipped: false,
        sets: Array.from({ length: entry.sets }, () => ({
          id: crypto.randomUUID(),
          setType: "working" as const,
          side: "both" as const,
          loadSemantics: definition?.measurement.load ?? "none",
          // What the plan asked for, kept distinct from what gets performed.
          planned: { reps: entry.repsMin },
          done: false,
        })),
      };
    }),
  };
}

/**
 * A duration range, derived from the prescription and the configured rest.
 *
 * Rep-based lifting has no exact duration, so this is deliberately a band and the UI
 * must present it as one. Roughly 3–5 seconds per rep plus the rest between sets, with
 * a allowance for setting up each movement.
 */
export function estimateDuration(
  entries: PlanEntry[],
  restSeconds = DEFAULT_REST_SECONDS,
) {
  let low = 0;
  let high = 0;
  for (const entry of entries) {
    const reps = (entry.repsMin + entry.repsMax) / 2;
    const work = entry.sets * reps;
    low += work * 3 + (entry.sets - 1) * restSeconds + 45;
    high += work * 5 + (entry.sets - 1) * (restSeconds + 25) + 90;
  }
  const round = (seconds: number) => Math.max(5, Math.round(seconds / 60 / 5) * 5);
  return { min: round(low), max: round(high) };
}

export function durationText(range: { min: number; max: number }) {
  return range.min === range.max
    ? `About ${range.min} min`
    : `About ${range.min}–${range.max} min`;
}

export type Previous = {
  reps: number;
  load: number;
  unit: Unit;
  /** The value converted into the session's unit, for display beside today's input. */
  converted: number;
  /** True when the original was logged in a different unit from the current session. */
  convertedFrom: boolean;
  /** True when the load's meaning was never recorded, so it is shown but not compared. */
  ambiguous: boolean;
};

/**
 * The last time this movement was performed.
 *
 * The audited query required the previous session to share the current session's unit,
 * so switching kg to lb made a user's whole history appear to vanish. Here the original
 * value and unit are preserved and a converted figure is offered alongside, flagged so
 * the interface can say where the number came from.
 */
export function previousPerformance(
  journal: Journal,
  exerciseId: string,
  unit: Unit,
  setIndex: number,
): Previous | null {
  for (const session of journal.sessions) {
    if (session.status !== "finished") continue;
    const entry = session.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    const done = entry.sets.filter((s) => s.done && s.performed);
    const set = done[setIndex] ?? done[done.length - 1];
    if (!set?.performed || set.performed.reps === undefined) continue;
    const load = set.performed.load ?? 0;
    return {
      reps: set.performed.reps,
      load,
      unit: session.unit,
      converted: convertLoad(load, session.unit, unit),
      convertedFrom: session.unit !== unit,
      ambiguous: set.loadSemantics === "unspecifiedLegacy",
    };
  }
  return null;
}

/** Advance the plan rotation. Called once per finished session, never on a retry. */
export function advancePlan(journal: Journal, finished: Session2) {
  if (!finished.planId) return journal.planProgress;
  const plan = journal.plans?.find((p) => p.id === finished.planId);
  if (!plan) return journal.planProgress;
  const day = plan.days.findIndex((d) => d.id === finished.dayId);
  return {
    ...journal.planProgress,
    [plan.id]:
      ((day >= 0 ? day : journal.planProgress?.[plan.id] || 0) + 1) %
      plan.days.length,
  };
}
