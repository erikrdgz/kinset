/**
 * Gross energy estimates, not measured or "active" calories.
 *
 * 2024 Compendium: 1 MET = 1 kcal/kg/hour. Resistance training (02054)
 * uses 3.5 MET; general bodyweight resistance (02056) uses 3.0 MET.
 * Values are unchanged. We do not infer vigorous effort from weight lifted.
 * Sources: https://pacompendium.com/ and
 * https://pacompendium.com/conditioning-exercise/
 *
 * The Compendium describes population averages, not precise individual expenditure.
 * Current body mass is an explicit assumption for every historical estimate.
 */
import { findExercise } from "./exercises";
import { completedSessions, convertLoad, type Unit } from "./metrics";
import type { Profile } from "./legacy";
import type { Journal, Session2 } from "./schema";

export const ENERGY_METHOD = {
  resistanceMet: 3.5,
  bodyweightMet: 3,
  // A product guard against accidentally estimating a workout left running overnight.
  maxSessionHours: 6,
  minWeightKg: 20,
  maxWeightKg: 400,
  source: "https://pacompendium.com/",
  activitySource: "https://pacompendium.com/conditioning-exercise/",
} as const;

export function bodyWeightKg(weight: Profile["weight"], unit: Unit): number | null {
  if (typeof weight !== "number" || !Number.isFinite(weight)) return null;
  const kg = convertLoad(weight, unit, "kg");
  return kg >= ENERGY_METHOD.minWeightKg && kg <= ENERGY_METHOD.maxWeightKg ? kg : null;
}

/** Returns null when a recorded clock cannot support even a rough estimate. */
export function energyDurationMs(session: Session2): number | null {
  if (session.status !== "finished" || !session.plannedDetailAvailable || !session.intervals.length) return null;
  const started = Date.parse(session.startedAt);
  const finished = Date.parse(session.finishedAt ?? "");
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished <= started) return null;
  const ranges: Array<[number, number]> = [];
  for (const interval of session.intervals) {
    const start = Date.parse(interval.startedAt);
    const end = Date.parse(interval.endedAt ?? "");
    // Never use Date.now() for finished records with an open clock.
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < started || end > finished) return null;
    ranges.push([start, end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  // Merge overlap so a replayed clock interval cannot double the estimate.
  let total = 0;
  let [start, end] = ranges[0];
  for (const [nextStart, nextEnd] of ranges.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      total += end - start;
      [start, end] = [nextStart, nextEnd];
    }
  }
  total += end - start;
  return total > 0 && total <= ENERGY_METHOD.maxSessionHours * 3600000 ? total : null;
}

export function grossEnergyKcal(met: number, weightKg: number, durationMs: number): number | null {
  if (!Number.isFinite(met) || met <= 0 || met > 30 || !Number.isFinite(weightKg) || weightKg < ENERGY_METHOD.minWeightKg || weightKg > ENERGY_METHOD.maxWeightKg || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > ENERGY_METHOD.maxSessionHours * 3600000) return null;
  return met * weightKg * durationMs / 3600000;
}

export type EnergyPoint = { sessionId: string; at: string; kcal: number; durationMs: number; met: number };
export type EnergyEstimate = {
  kcal: number | null;
  weightKg: number | null;
  durationMs: number;
  includedSessions: number;
  excludedSessions: number;
  points: EnergyPoint[];
};

/** Pass a period-filtered journal to keep the energy window aligned with other charts. */
export function estimateTrainingEnergy(journal: Journal, profile: Profile): EnergyEstimate {
  const weightKg = bodyWeightKg(profile.weight, profile.unit);
  const sessions = completedSessions(journal);
  const points: EnergyPoint[] = [];
  let excludedSessions = 0;
  let durationMs = 0;
  let eligibleSessions = 0;
  for (const session of sessions) {
    const elapsed = energyDurationMs(session);
    if (elapsed === null) {
      excludedSessions += 1;
      continue;
    }
    eligibleSessions += 1;
    durationMs += elapsed;
    if (weightKg === null) continue;
    const performedEntries = session.entries.filter((entry) => entry.sets.some((set) => set.done));
    const bodyweightOnly = performedEntries.every((entry) => findExercise(entry.exerciseId)?.measurement.load === "none");
    const met = bodyweightOnly ? ENERGY_METHOD.bodyweightMet : ENERGY_METHOD.resistanceMet;
    const kcal = grossEnergyKcal(met, weightKg, elapsed)!;
    points.push({ sessionId: session.id, at: session.finishedAt!, kcal, durationMs: elapsed, met });
  }
  return {
    // Missing input is not a zero-calorie workout.
    kcal: weightKg === null || !points.length ? null : points.reduce((sum, point) => sum + point.kcal, 0),
    weightKg,
    durationMs,
    includedSessions: eligibleSessions,
    excludedSessions,
    points: points.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
  };
}
