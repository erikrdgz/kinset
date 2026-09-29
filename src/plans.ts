import { z } from "zod";
import {
  exercises,
  program,
  type Profile,
  type Session,
  type State,
} from "./domain";
const entrySchema = z
  .object({
    exerciseId: z
      .string()
      .refine(
        (id) => exercises.some((e) => e.id === id),
        "Choose an exercise from the library.",
      ),
    sets: z.number().int().min(1).max(10),
    repsMin: z.number().int().min(1).max(100),
    repsMax: z.number().int().min(1).max(100),
  })
  .refine(
    (e) => e.repsMax >= e.repsMin,
    "Maximum reps must be at least the minimum.",
  );
export const planSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Name your plan.").max(60),
    days: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1, "Name each workout day.").max(50),
          entries: z
            .array(entrySchema)
            .min(1, "Add at least one exercise to every day.")
            .max(20)
            .refine(
              (entries) =>
                new Set(entries.map((e) => e.exerciseId)).size ===
                entries.length,
              "An exercise can appear only once per day.",
            ),
        }),
      )
      .min(1)
      .max(7),
  })
  .refine(
    (p) => new Set(p.days.map((d) => d.id)).size === p.days.length,
    "Day identifiers must be unique.",
  );
export type WorkoutPlan = z.infer<typeof planSchema>;
export type PlanDay = WorkoutPlan["days"][number];
export type PlanEntry = PlanDay["entries"][number];
export function defaultEntry(exerciseId: string): PlanEntry {
  const e = exercises.find((e) => e.id === exerciseId)!;
  const numbers = e.reps.match(/\d+/g)!.map(Number);
  return {
    exerciseId,
    sets: 3,
    repsMin: numbers[0],
    repsMax: numbers[1] || numbers[0],
  };
}
export function newPlan(): WorkoutPlan {
  return {
    id: crypto.randomUUID(),
    name: "",
    days: [{ id: crypto.randomUUID(), name: "Day 1", entries: [] }],
  };
}
export function foundationPlan(p: Profile): WorkoutPlan {
  return {
    id: crypto.randomUUID(),
    name: "My foundation",
    days: Array.from({ length: p.days }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Full body ${String.fromCharCode(65 + i)}`,
      entries: program(p, i).map((e) => ({
        ...defaultEntry(e.id),
        sets: p.experience === "New to training" ? 2 : 3,
      })),
    })),
  };
}
export function targetReps(entry: PlanEntry) {
  return entry.repsMin === entry.repsMax
    ? String(entry.repsMin)
    : `${entry.repsMin}–${entry.repsMax}`;
}
export function nextWorkout(data: State) {
  const custom = data.plans?.find((p) => p.id === data.activePlanId);
  if (custom && custom.days.length) {
    const index = (data.planProgress?.[custom.id] || 0) % custom.days.length;
    const day = custom.days[index];
    return {
      name: day.name,
      planName: custom.name,
      planId: custom.id,
      dayId: day.id,
      entries: day.entries,
    };
  }
  const p = data.profile!;
  return {
    name: `Full body ${data.sessions.length % 2 ? "B" : "A"}`,
    planName: `${p.days}-day foundation`,
    planId: undefined,
    dayId: undefined,
    entries: program(p, data.sessions.length).map((e) => ({
      ...defaultEntry(e.id),
      sets: p.experience === "New to training" ? 2 : 3,
    })),
  };
}
export function startWorkout(
  p: Profile,
  workout: ReturnType<typeof nextWorkout>,
): Session {
  return {
    id: crypto.randomUUID(),
    name: workout.name,
    planId: workout.planId,
    dayId: workout.dayId,
    planName: workout.planName,
    startedAt: new Date().toISOString(),
    unit: p.unit,
    entries: workout.entries.map((e) => ({
      exerciseId: e.exerciseId,
      targetReps:
        targetReps(e) +
        (exercises.find((x) => x.id === e.exerciseId)!.reps.includes("/ side")
          ? " / side"
          : ""),
      sets: Array.from({ length: e.sets }, () => ({
        id: crypto.randomUUID(),
        reps: 0,
        weight: 0,
        done: false,
      })),
    })),
  };
}
export function advancePlan(data: State, finished: Session) {
  if (!finished.planId) return data.planProgress;
  const plan = data.plans?.find((p) => p.id === finished.planId);
  if (!plan) return data.planProgress;
  const day = plan.days.findIndex((d) => d.id === finished.dayId);
  return {
    ...data.planProgress,
    [plan.id]:
      ((day >= 0 ? day : data.planProgress?.[plan.id] || 0) + 1) %
      plan.days.length,
  };
}
