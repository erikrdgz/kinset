import { describe, expect, it } from "vitest";
import { emptyJournal, findExercise, type Profile } from "../../domain";
import { nextWorkout, buildSession } from "./workout";
import { planSchema } from "../../plans";

const profile: Profile = { name: "Test", goal: "Build strength", days: 3, equipment: "Dumbbells", experience: "Getting back into it", unit: "kg", weight: "", height: "" };

describe("first workout from the full catalog", () => {
  it.each(["Dumbbells", "Full gym", "Bodyweight"] as const)("generates and snapshots %s without a legacy lookup", (equipment) => {
    const current = { ...profile, equipment };
    const workout = nextWorkout(emptyJournal, current);
    expect(workout.entries.length).toBeGreaterThan(0);
    expect(planSchema.safeParse({ id: "first", name: "First plan", days: [{id: "day", name: workout.name, entries: workout.entries}] }).success).toBe(true);
    const session = buildSession(current, workout);
    expect(session.entries.length).toBe(workout.entries.length);
    session.entries.forEach((entry) => {
      expect(entry.exerciseName).toBe(findExercise(entry.exerciseId)?.name);
      expect(entry.sets[0].planned?.reps).toBeGreaterThan(0);
    });
  });
});
