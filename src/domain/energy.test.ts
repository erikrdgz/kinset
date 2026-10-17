import { describe, expect, it } from "vitest";
import { bodyWeightKg, energyDurationMs, estimateTrainingEnergy, grossEnergyKcal } from "./energy";
import type { Profile } from "./legacy";
import type { Journal, Session2 } from "./schema";

const profile: Profile = { name: "Alex", goal: "Build strength", days: 3, equipment: "Dumbbells", experience: "Training regularly", unit: "kg", weight: 70, height: "" };
const start = "2026-10-16T08:00:00.000Z";
const end = "2026-10-16T08:30:00.000Z";
function session(overrides: Partial<Session2> = {}): Session2 {
  return { id: "session-1", version: 1, type: "strength", status: "finished", name: "Strength", startedAt: start, finishedAt: end, unit: "kg", plannedDetailAvailable: true, intervals: [{ startedAt: start, endedAt: end }], entries: [{ entryId: "entry-1", exerciseId: "goblet", exerciseName: "Goblet squat", order: 0, skipped: false, sets: [{ id: "set-1", setType: "working", side: "both", loadSemantics: "combinedExternal", done: true, performed: { reps: 10, load: 20 } }] }], ...overrides };
}
function journal(sessions: Session2[]): Journal {
  return { schemaVersion: 2, profile, sessions, active: null };
}

describe("gross training energy", () => {
  it("uses the Compendium's kcal/kg/hour convention, including resting energy", () => {
    expect(grossEnergyKcal(3.5, 70, 30 * 60000)).toBe(122.5);
    expect(grossEnergyKcal(3, 70, 30 * 60000)).toBe(105);
    expect(grossEnergyKcal(1, 70, 3600000)).toBe(70);
  });
  it("converts user body mass before calculating and never treats pounds as kg", () => {
    expect(bodyWeightKg(154.323583526, "lb")).toBeCloseTo(70, 6);
    const kg = estimateTrainingEnergy(journal([session()]), profile);
    const lb = estimateTrainingEnergy(journal([session()]), { ...profile, weight: 154.323583526, unit: "lb" });
    expect(lb.kcal).toBeCloseTo(kg.kcal!, 6);
  });
  it("does not invent body mass or equate missing calories with zero", () => {
    const result = estimateTrainingEnergy(journal([session()]), { ...profile, weight: "" });
    expect(result.kcal).toBeNull();
    expect(result.weightKg).toBeNull();
    expect(result.durationMs).toBe(1800000);
    expect(result.points).toEqual([]);
  });
  it("omits paused gaps and merges overlapping clock ranges", () => {
    const tracked = session({ intervals: [
      { startedAt: start, endedAt: "2026-10-16T08:10:00.000Z" },
      { startedAt: "2026-10-16T08:05:00.000Z", endedAt: "2026-10-16T08:15:00.000Z" },
      { startedAt: "2026-10-16T08:20:00.000Z", endedAt: end },
    ] });
    expect(energyDurationMs(tracked)).toBe(25 * 60000);
    expect(estimateTrainingEnergy(journal([tracked]), profile).kcal).toBeCloseTo(102.083333);
  });
  it("never extends a missing finish time to now or trusts malformed intervals", () => {
    const invalid = [
      session({ intervals: [] }),
      session({ intervals: [{ startedAt: start }] }),
      session({ finishedAt: undefined }),
      session({ intervals: [{ startedAt: end, endedAt: start }] }),
      session({ intervals: [{ startedAt: "invalid", endedAt: end }] }),
      session({ intervals: [{ startedAt: start, endedAt: "2026-10-17T08:00:00.000Z" }] }),
      session({ plannedDetailAvailable: false }),
    ];
    for (const value of invalid) expect(energyDurationMs(value)).toBeNull();
    const result = estimateTrainingEnergy(journal(invalid.map((s, index) => ({ ...s, id: `invalid-${index}` }))), profile);
    expect(result.kcal).toBeNull();
    expect(result.excludedSessions).toBe(7);
  });
  it("excludes implausibly long clocks and invalid arithmetic inputs", () => {
    const overnight = session({ finishedAt: "2026-10-16T15:00:00.000Z", intervals: [{ startedAt: start, endedAt: "2026-10-16T15:00:00.000Z" }] });
    expect(energyDurationMs(overnight)).toBeNull();
    for (const weight of [0, -1, NaN, Infinity, 19, 401]) expect(bodyWeightKg(weight, "kg")).toBeNull();
    expect(grossEnergyKcal(3.5, 70, -1)).toBeNull();
    expect(grossEnergyKcal(3.5, 70, Infinity)).toBeNull();
    expect(grossEnergyKcal(NaN, 70, 1000)).toBeNull();
    expect(grossEnergyKcal(3.5, 70, 7 * 3600000)).toBeNull();
  });
  it("deduplicates finished sessions and excludes active, discarded and empty ones", () => {
    const s = session();
    const result = estimateTrainingEnergy(journal([s, s, session({ id: "active", status: "active" }), session({ id: "discarded", status: "discarded" }), session({ id: "empty", entries: [] })]), profile);
    expect(result.kcal).toBe(122.5);
    expect(result.includedSessions).toBe(1);
  });
  it("uses the unchanged bodyweight MET only for wholly bodyweight sessions", () => {
    const bodyweight = session();
    bodyweight.entries[0] = { ...bodyweight.entries[0], exerciseId: "squat" };
    expect(estimateTrainingEnergy(journal([bodyweight]), profile).kcal).toBe(105);
  });
  it("recalculates historic estimates from the stated current bodyweight", () => {
    expect(estimateTrainingEnergy(journal([session()]), { ...profile, weight: 80 }).kcal).toBe(140);
    expect(estimateTrainingEnergy(journal([]), profile).kcal).toBeNull();
  });
});
