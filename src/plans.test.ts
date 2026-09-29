import { describe, it, expect } from "vitest";
import {
  newPlan,
  planSchema,
  defaultEntry,
  nextWorkout,
  startWorkout,
  advancePlan,
  foundationPlan,
} from "./plans";
import { emptyState, finishSession, type Profile, type State } from "./domain";
const profile: Profile = {
  name: "Test",
  goal: "Build consistency",
  days: 3,
  equipment: "Dumbbells",
  experience: "Returning",
  unit: "lb",
  height: "",
  weight: "",
};
const makePlan = () => {
  const p = newPlan();
  p.name = "My split";
  p.days[0].entries = [
    { ...defaultEntry("lateral"), sets: 4, repsMin: 12, repsMax: 15 },
  ];
  p.days.push({ id: "lower", name: "Lower", entries: [defaultEntry("split")] });
  return p;
};
describe("custom workout plans", () => {
  it("opens legacy journals with a foundation routine", () => {
    const next = nextWorkout({ ...emptyState, profile });
    expect(next.planId).toBeUndefined();
    expect(next.entries).toHaveLength(4);
  });
  it("validates empty days, unknown exercises, duplicates and reversed rep ranges", () => {
    const plan = makePlan();
    expect(planSchema.safeParse(plan).success).toBe(true);
    for (const entries of [
      [],
      [{ ...defaultEntry("curl"), exerciseId: "missing" }],
      [defaultEntry("curl"), defaultEntry("curl")],
      [{ ...defaultEntry("curl"), repsMin: 20, repsMax: 10 }],
      [{ ...defaultEntry("curl"), sets: 0 }],
    ]) {
      expect(
        planSchema.safeParse({ ...plan, days: [{ ...plan.days[0], entries }] })
          .success,
      ).toBe(false);
    }
  });
  it("snapshots custom targets and preserves a workout when its plan changes", () => {
    const plan = makePlan();
    const data: State = {
      ...emptyState,
      profile,
      plans: [plan],
      activePlanId: plan.id,
    };
    const session = startWorkout(profile, nextWorkout(data));
    expect(session.entries[0].sets).toHaveLength(4);
    expect(session.entries[0].targetReps).toBe("12–15");
    expect(session.unit).toBe("lb");
    plan.days[0].entries[0].sets = 1;
    plan.days[0].entries[0].repsMin = 8;
    expect(session.entries[0].sets).toHaveLength(4);
    expect(session.entries[0].targetReps).toBe("12–15");
    expect(new Set(session.entries[0].sets.map((s) => s.id)).size).toBe(4);
  });
  it("advances completed plan days independently from foundation history and wraps", () => {
    const plan = makePlan();
    let data: State = {
      ...emptyState,
      profile,
      plans: [plan],
      activePlanId: plan.id,
    };
    for (const expectedDay of [
      plan.days[0].id,
      plan.days[1].id,
      plan.days[0].id,
    ]) {
      const s = startWorkout(profile, nextWorkout(data));
      expect(s.dayId).toBe(expectedDay);
      s.entries[0].sets[0] = { ...s.entries[0].sets[0], reps: 12, done: true };
      const finished = finishSession(s);
      data = {
        ...data,
        planProgress: advancePlan(data, finished),
        sessions: [finished, ...data.sessions],
      };
    }
  });
  it("falls back safely when an active plan was deleted and retains its session", () => {
    const plan = makePlan();
    const data: State = {
      ...emptyState,
      profile,
      plans: [plan],
      activePlanId: plan.id,
    };
    const session = startWorkout(profile, nextWorkout(data));
    expect(nextWorkout({ ...data, plans: [] }).planId).toBeUndefined();
    expect(session.planId).toBe(plan.id);
    expect(advancePlan({ ...data, plans: [] }, session)).toBeUndefined();
  });
  it("copies starter programming into independent editable days", () => {
    const plan = foundationPlan(profile);
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(plan.days).toHaveLength(3);
    expect(new Set(plan.days.map((d) => d.id)).size).toBe(3);
  });
  it("survives journal serialization including an unfinished draft", () => {
    const plan = makePlan();
    const data: State = {
      ...emptyState,
      profile,
      plans: [plan],
      activePlanId: plan.id,
      planDraft: newPlan(),
      planProgress: { [plan.id]: 1 },
    };
    const restored = JSON.parse(JSON.stringify(data));
    expect(nextWorkout(restored).dayId).toBe("lower");
    expect(restored.planDraft.days).toHaveLength(1);
  });
});
