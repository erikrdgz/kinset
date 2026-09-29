import { describe, it, expect } from "vitest";
import {
  profileSchema,
  program,
  startSession,
  finishSession,
  validSet,
  completedSets,
  shuffledProgram,
  exercises,
  type Profile,
} from "./domain";
const profile: Profile = {
  name: "Alex",
  goal: "Build consistency",
  days: 3,
  equipment: "Dumbbells",
  experience: "New to training",
  unit: "kg",
  weight: "",
  height: "",
};
describe("training journal", () => {
  it("uses only equipment available to the user", () => {
    for (const equipment of ["Dumbbells", "Bodyweight", "Full gym"] as const)
      for (let n = 0; n < 4; n++) {
        const plan = program({ ...profile, equipment }, n);
        expect(plan).toHaveLength(4);
        for (const e of plan)
          expect(
            e.equipment === "Bodyweight" ||
              e.equipment === equipment ||
              equipment === "Full gym",
          ).toBe(true);
      }
  });
  it("keeps historical units and gives each set a distinct identity", () => {
    const s = startSession(profile);
    expect(s.unit).toBe("kg");
    expect(
      new Set(s.entries.flatMap((e) => e.sets.map((s) => s.id))).size,
    ).toBe(8);
  });
  it("requires a completed set and excludes uncompleted sets from history", () => {
    const s = startSession(profile);
    expect(() => finishSession(s)).toThrow();
    s.entries[0].sets[0] = {
      ...s.entries[0].sets[0],
      done: true,
      reps: 8,
      weight: 10,
    };
    const finished = finishSession(s);
    expect(completedSets(finished)).toBe(1);
    expect(finished.entries).toHaveLength(1);
    expect(finished.entries[0].sets).toHaveLength(1);
    expect(finished.finishedAt).toBeTruthy();
  });
  it("rejects invalid logging values but allows bodyweight", () => {
    const s = { id: "a", done: false, reps: 8, weight: 0 };
    expect(validSet(s)).toBe(true);
    expect(validSet({ ...s, reps: 1200 })).toBe(true);
    expect(validSet({ ...s, reps: Infinity })).toBe(false);
    expect(validSet({ ...s, reps: 0 })).toBe(false);
    expect(validSet({ ...s, reps: 1.5 })).toBe(false);
    expect(validSet({ ...s, weight: -1 })).toBe(false);
    expect(validSet({ ...s, weight: Infinity })).toBe(false);
  });
  it("validates profile bounds", () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, days: 9 }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ ...profile, name: "" }).success).toBe(
      false,
    );
  });
});

describe("shuffled demo lineup", () => {
  it("is stable per seed, varied across seeds, and fits the equipment", () => {
    const a = shuffledProgram(profile, 42).map((e) => e.id);
    expect(shuffledProgram(profile, 42).map((e) => e.id)).toEqual(a);
    expect(new Set(a).size).toBe(4);
    const lineups = new Set(
      Array.from({ length: 20 }, (_, i) =>
        shuffledProgram(profile, i).map((e) => e.id).join(),
      ),
    );
    expect(lineups.size).toBeGreaterThan(1);
    const bodyweight = shuffledProgram({ ...profile, equipment: "Bodyweight" }, 7);
    for (const e of bodyweight)
      expect(exercises.find((x) => x.id === e.id)!.equipment).toBe("Bodyweight");
  });
});
