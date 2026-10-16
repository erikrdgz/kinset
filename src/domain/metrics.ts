/**
 * Metric definitions.
 *
 * Each function here states its counting rule, because a number without one is how an
 * app ends up claiming "86% recovered". Nothing in this file infers readiness, recovery,
 * tissue damage or physiological state; these describe recorded training exposure only.
 */
import { findExercise, type MuscleId } from "./exercises";
import type { Journal, Session2 } from "./schema";

const LB_PER_KG = 2.2046226218;

export type Unit = "kg" | "lb";

/** Convert for comparison only. The original logged value is never overwritten. */
export function convertLoad(value: number, from: Unit, to: Unit) {
  if (from === to) return value;
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

export function formatLoad(value: number, unit: Unit) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}

/**
 * Completed sessions. Deduplicated by ID, so a repeated finish or a sync replay cannot
 * inflate the count, and empty sessions do not count as training.
 */
export function completedSessions(journal: Journal): Session2[] {
  const seen = new Set<string>();
  const out: Session2[] = [];
  for (const s of journal.sessions) {
    if (s.status !== "finished" || seen.has(s.id)) continue;
    if (!s.entries.some((e) => e.sets.some((x) => x.done))) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

/**
 * Active duration: elapsed time inside recorded intervals, minus every explicit pause.
 * A session left open in a forgotten tab therefore does not report its wall-clock gap as
 * exercise time — but a *migrated* session has only one interval spanning start to
 * finish, so `exact` is false for those and the UI should say the duration is
 * approximate rather than presenting it as measured.
 */
export function activeDuration(session: Session2, now = Date.now()) {
  let ms = 0;
  for (const interval of session.intervals) {
    const start = Date.parse(interval.startedAt);
    const end = interval.endedAt ? Date.parse(interval.endedAt) : now;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start)
      ms += end - start;
  }
  return {
    ms,
    exact: session.intervals.length > 1 || session.plannedDetailAvailable,
  };
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Weekly consistency: completed sessions against sessions the user explicitly planned.
 * Returns the raw pair rather than a percentage, so a caller cannot accidentally present
 * "0 of 0" as zero percent adherence.
 */
export function weeklyConsistency(
  journal: Journal,
  weekStart: Date,
  plannedPerWeek: number,
) {
  const start = weekStart.getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const completed = completedSessions(journal).filter((s) => {
    const at = Date.parse(s.finishedAt ?? "");
    return Number.isFinite(at) && at >= start && at < end;
  }).length;
  return { completed, planned: plannedPerWeek };
}

export type SetWithContext = {
  session: Session2;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  load: number;
  unit: Unit;
  at: string;
};

/** Every completed working set, newest first. The one input most metrics share. */
export function completedWorkingSets(journal: Journal): SetWithContext[] {
  const out: SetWithContext[] = [];
  for (const session of completedSessions(journal))
    for (const entry of session.entries)
      for (const set of entry.sets) {
        if (!set.done || set.setType !== "working" || !set.performed) continue;
        const { reps, load } = set.performed;
        if (reps === undefined) continue;
        out.push({
          session,
          exerciseId: entry.exerciseId,
          exerciseName: entry.exerciseName,
          reps,
          load: load ?? 0,
          unit: session.unit,
          at: set.completedAt ?? session.finishedAt ?? session.startedAt,
        });
      }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * The heaviest comparable set for a movement, converted into the display unit.
 *
 * Comparability is deliberately strict: the same exercise ID, the same measurement kind
 * and the same load semantics. Legacy sets carry `unspecifiedLegacy` semantics, so they
 * are excluded from a best rather than being compared against sets whose meaning is
 * known. The original value and its unit are returned alongside the converted one.
 */
export function exerciseBest(
  journal: Journal,
  exerciseId: string,
  displayUnit: Unit,
) {
  const definition = findExercise(exerciseId);
  if (!definition) return null;
  /**
   * A movement with no external load has nothing to rank by weight — every set would
   * tie at zero and report "0 kg", which is not a record, it is a unit error. Those
   * rank by reps instead, and the caller renders them accordingly.
   */
  const basis: "load" | "reps" =
    definition.measurement.load === "none" ? "reps" : "load";
  let best: { set: SetWithContext; converted: number } | null = null;
  let excludedLegacy = 0;

  for (const session of completedSessions(journal))
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      for (const set of entry.sets) {
        if (!set.done || !set.performed || set.setType !== "working") continue;
        if (set.loadSemantics === "unspecifiedLegacy") {
          excludedLegacy += 1;
          continue;
        }
        if (set.loadSemantics !== definition.measurement.load) continue;
        const { reps, load } = set.performed;
        if (reps === undefined || load === undefined) continue;
        const converted =
          basis === "reps" ? reps : convertLoad(load, session.unit, displayUnit);
        if (!best || converted > best.converted)
          best = {
            converted,
            set: {
              session,
              exerciseId,
              exerciseName: entry.exerciseName,
              reps,
              load,
              unit: session.unit,
              at: set.completedAt ?? session.finishedAt ?? session.startedAt,
            },
          };
      }
    }
  return best ? { ...best, basis, excludedLegacy } : null;
}

/** How a best should read: a weight for loaded movements, a rep count otherwise. */
export function formatBest(
  best: NonNullable<ReturnType<typeof exerciseBest>>,
  unit: Unit,
) {
  return best.basis === "reps"
    ? `${best.set.reps} reps`
    : `${formatLoad(best.converted, unit)} × ${best.set.reps}`;
}

/**
 * Working sets attributed to muscles.
 *
 * Primary muscles only by default: counting a set once for every muscle it touches
 * would make the totals add up to more training than was done. Supporting work is
 * returned separately so it can be shown without being conflated.
 */
export function workingSetsByMuscle(journal: Journal, since?: Date) {
  const primary = new Map<MuscleId, number>();
  const supporting = new Map<MuscleId, number>();
  const cutoff = since?.getTime() ?? -Infinity;

  for (const set of completedWorkingSets(journal)) {
    if (Date.parse(set.at) < cutoff) continue;
    const definition = findExercise(set.exerciseId);
    if (!definition) continue;
    for (const m of definition.primaryMuscles)
      primary.set(m, (primary.get(m) ?? 0) + 1);
    for (const m of definition.supportingMuscles)
      supporting.set(m, (supporting.get(m) ?? 0) + 1);
  }
  return {
    primary,
    supporting,
    method:
      "Each completed working set counts once for each of its primary muscles. Supporting muscles are counted separately and are not added to the primary totals.",
  };
}

/**
 * Load-volume under one stated convention: completed working sets only, reps × external
 * load, converted to the display unit.
 *
 * Records whose load cannot be compared — bodyweight with no external load, machine
 * stack settings, assistance, and legacy sets of unknown semantics — are excluded and
 * counted, so the figure is never a sum of incompatible units pretending to be a total.
 */
export function loadVolume(
  journal: Journal,
  displayUnit: Unit,
  since?: Date,
) {
  const cutoff = since?.getTime() ?? -Infinity;
  let total = 0;
  let included = 0;
  let excluded = 0;

  for (const session of completedSessions(journal))
    for (const entry of session.entries) {
      const definition = findExercise(entry.exerciseId);
      for (const set of entry.sets) {
        if (!set.done || !set.performed || set.setType !== "working") continue;
        if (Date.parse(set.completedAt ?? session.finishedAt ?? "") < cutoff)
          continue;
        const comparable =
          definition &&
          (set.loadSemantics === "perDumbbell" ||
            set.loadSemantics === "combinedExternal" ||
            set.loadSemantics === "addedBodyweight");
        const { reps, load } = set.performed;
        if (!comparable || reps === undefined || !load) {
          excluded += 1;
          continue;
        }
        // Two dumbbells moved for the same reps is twice the external load.
        const multiplier = set.loadSemantics === "perDumbbell" ? 2 : 1;
        total += reps * convertLoad(load, session.unit, displayUnit) * multiplier;
        included += 1;
      }
    }
  return {
    total,
    unit: displayUnit,
    includedSets: included,
    excludedSets: excluded,
    convention:
      "Completed working sets only: reps × external load, counting both dumbbells where the load is per dumbbell. Bodyweight, machine-stack, assisted and pre-v2 records are excluded because their loads are not comparable.",
  };
}

export type TrendPoint = { at: string; value: number };

/**
 * A trend for one movement: the best comparable working set per session.
 *
 * Loaded movements trend on weight in the display unit; movements with no external load
 * trend on reps, since plotting a bodyweight squat's weight would draw a flat line at
 * zero. `basis` tells the caller which it is so the axis can be labelled truthfully.
 *
 * One session yields one point, and a caller must not draw a single point as a line.
 */
export function exerciseTrend(
  journal: Journal,
  exerciseId: string,
  displayUnit: Unit,
): { points: TrendPoint[]; basis: "load" | "reps" } {
  const definition = findExercise(exerciseId);
  if (!definition) return { points: [], basis: "load" };
  const basis: "load" | "reps" =
    definition.measurement.load === "none" ? "reps" : "load";
  const points: TrendPoint[] = [];
  for (const session of completedSessions(journal)) {
    let best = 0;
    let found = false;
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      for (const set of entry.sets) {
        if (!set.done || !set.performed || set.setType !== "working") continue;
        if (set.loadSemantics !== definition.measurement.load) continue;
        const { load, reps } = set.performed;
        if (load === undefined || reps === undefined) continue;
        const value =
          basis === "reps" ? reps : convertLoad(load, session.unit, displayUnit);
        if (value > best) best = value;
        found = true;
      }
    }
    if (found)
      points.push({
        at: session.finishedAt ?? session.startedAt,
        value: best,
      });
  }
  return {
    points: points.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    basis,
  };
}
