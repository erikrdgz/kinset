import { describe, it, expect } from "vitest";
import {
  assumedEquipment,
  canPerform,
  equipmentUnion,
  exerciseDefinitions,
  findExercise,
  publishedExercises,
} from "./exercises";
import { buildLineup, substitutionsFor, fullBodySlots } from "./selection";
import { exercises as legacyExercises } from "./legacy";
import {
  activeDuration,
  completedSessions,
  convertLoad,
  exerciseBest,
  exerciseTrend,
  formatBest,
  loadVolume,
  workingSetsByMuscle,
} from "./metrics";
import type { Journal, Session2 } from "./schema";

describe("structured catalog", () => {
  it("keeps every original exercise, with its ID and name unchanged", () => {
    // The catalog grew; none of the original thirty may be renamed or dropped, because
    // history resolves through these IDs.
    for (const legacy of legacyExercises) {
      const def = findExercise(legacy.id);
      expect(def, `missing definition for ${legacy.id}`).toBeDefined();
      expect(def!.name).toBe(legacy.name);
      expect(def!.browseGroup).toBe(legacy.muscle);
    }
  });

  it("is no longer 43% legs", () => {
    // The audited catalog was 13 legs to 2 core, which is why a balanced lineup could
    // not be built from it.
    const counts = new Map<string, number>();
    for (const e of publishedExercises)
      counts.set(e.browseGroup, (counts.get(e.browseGroup) ?? 0) + 1);
    const total = publishedExercises.length;
    expect(total).toBeGreaterThanOrEqual(90);

    const legShare = (counts.get("Legs") ?? 0) / total;
    expect(legShare).toBeLessThan(0.33);
    // Every group carries real weight now; none is a rounding error.
    for (const group of ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"])
      expect(counts.get(group) ?? 0, group).toBeGreaterThanOrEqual(10);
  });

  it("has a unique ID for every movement", () => {
    const ids = exerciseDefinitions.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every movement pattern the selector can ask for", () => {
    const covered = new Set(
      publishedExercises.filter((e) => e.role === "strength").flatMap((e) => e.patterns),
    );
    for (const slot of fullBodySlots)
      expect(
        slot.patterns.some((p) => covered.has(p)),
        slot.label,
      ).toBe(true);
  });

  it("gives every movement at least one pattern and one primary muscle", () => {
    for (const e of exerciseDefinitions) {
      expect(e.patterns.length, e.id).toBeGreaterThan(0);
      expect(e.primaryMuscles.length, e.id).toBeGreaterThan(0);
      // A muscle is either a prime mover or a supporter, never counted as both.
      for (const m of e.primaryMuscles)
        expect(e.supportingMuscles, e.id).not.toContain(m);
    }
  });

  it("claims no reviewed technique or media it does not have", () => {
    for (const e of exerciseDefinitions) {
      expect(e.review.techniqueReviewed, e.id).toBe(false);
      expect(e.media.provider, e.id).toBeNull();
      expect(e.media.deliveryMode, e.id).toBe("none");
      expect(e.media.offlineAllowed, e.id).toBe(false);
    }
  });

  it("states the furniture a bodyweight label used to hide", () => {
    // An incline push-up is labelled Bodyweight but needs something to push off.
    expect(findExercise("pushup")!.requires).toContain("elevatedSurface");
    // A one-arm row needs a bench to brace against, not just a dumbbell.
    expect(findExercise("row")!.requires).toEqual(
      expect.arrayContaining(["dumbbellSingle", "benchOrSupport"]),
    );
    expect(findExercise("seatedpress")!.requires).toContain("seatWithBack");
  });

  it("requires every piece of equipment, not merely one of them", () => {
    const row = findExercise("row")!;
    expect(canPerform(row, new Set(["dumbbellSingle"]))).toBe(false);
    expect(canPerform(row, new Set(["dumbbellSingle", "benchOrSupport"]))).toBe(
      true,
    );
    expect(equipmentUnion(["row", "pushup"])).toEqual(
      expect.arrayContaining(["dumbbellSingle", "benchOrSupport", "elevatedSurface"]),
    );
  });
});

describe("lineup selection", () => {
  it("reports an unmet pull rather than substituting a hip extension or a stretch", () => {
    // Two separate failures guarded here. The audited one: no Back movement was
    // Bodyweight, so the pull slot fell through to a glute bridge silently. The one the
    // expansion introduced: a child's-pose lat stretch shares the vertical-pull pattern,
    // and serving it as a working pull would be the same lie in nicer clothes.
    const bodyweight = assumedEquipment("Bodyweight");
    const lineup = buildLineup(bodyweight, 7);

    const pull = lineup.unmet.find((u) => u.slot.id === "pull");
    expect(pull, "pull should be reported as unmet").toBeDefined();
    expect(pull!.reason).toContain("pull");

    // Whatever was filled genuinely matches its slot, and is a working movement.
    for (const { slot, exercise } of lineup.filled) {
      expect(exercise.patterns.some((p) => slot.patterns.includes(p))).toBe(true);
      expect(exercise.role).toBe("strength");
    }
    expect(lineup.filled.map((f) => f.slot.id)).not.toContain("pull");
  });

  it("fills the pull once the user actually has something to pull on", () => {
    const withBar = new Set([
      ...assumedEquipment("Bodyweight"),
      "pullUpBar" as const,
    ]);
    const lineup = buildLineup(withBar, 7);
    const pull = lineup.filled.find((f) => f.slot.id === "pull");
    expect(pull).toBeDefined();
    expect(pull!.exercise.role).toBe("strength");
  });

  it("fills every slot when the equipment is there, without repeating a movement", () => {
    const gym = assumedEquipment("Full gym");
    const lineup = buildLineup(gym, 3);
    expect(lineup.unmet).toEqual([]);
    expect(lineup.filled).toHaveLength(fullBodySlots.length);
    expect(new Set(lineup.filled.map((f) => f.exercise.id)).size).toBe(
      fullBodySlots.length,
    );
    for (const { exercise } of lineup.filled)
      expect(canPerform(exercise, gym)).toBe(true);
  });

  it("is stable for a seed and varies across seeds", () => {
    const gym = assumedEquipment("Full gym");
    const ids = (seed: number) =>
      buildLineup(gym, seed).filled.map((f) => f.exercise.id).join();
    expect(ids(42)).toBe(ids(42));
    expect(new Set(Array.from({ length: 20 }, (_, i) => ids(i))).size).toBeGreaterThan(1);
  });

  it("names the equipment that would unlock a missing slot", () => {
    const pull = buildLineup(assumedEquipment("Bodyweight"), 1).unmet.find(
      (u) => u.slot.id === "pull",
    )!;
    expect(pull.missingEquipment.length).toBeGreaterThan(0);
    expect(pull.reason).toMatch(/dumbbell|bench|pulldown/i);
  });
});

describe("substitution matching", () => {
  it("offers same-pattern movements and explains each one", () => {
    const options = substitutionsFor("goblet", assumedEquipment("Dumbbells"));
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.sharedPatterns.length).toBeGreaterThan(0);
      expect(option.reason).toBeTruthy();
      expect(option.exercise.id).not.toBe("goblet");
    }
    expect(options.map((o) => o.exercise.id)).toContain("sumo");
  });

  it("never offers a movement sharing only a browse group", () => {
    // Glute bridge and lat pulldown are both reachable from leg/back browsing, but
    // neither shares a pattern with the other.
    const options = substitutionsFor("pulldown", assumedEquipment("Full gym"));
    expect(options.map((o) => o.exercise.id)).not.toContain("bridge");
    for (const option of options)
      expect(
        option.exercise.patterns.some((p) =>
          findExercise("pulldown")!.patterns.includes(p),
        ),
      ).toBe(true);
  });

  it("returns nothing rather than a bad swap when equipment rules it out", () => {
    const options = substitutionsFor("pulldown", assumedEquipment("Bodyweight"));
    expect(options).toEqual([]);
  });

  it("never offers a stretch as a substitute for a working movement", () => {
    const options = substitutionsFor("pulldown", assumedEquipment("Full gym"));
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option.exercise.role).toBe("strength");
    expect(options.map((o) => o.exercise.id)).not.toContain("childslat");
  });

  it("only ever offers published movements", () => {
    const options = substitutionsFor("curl", assumedEquipment("Full gym"));
    const publishedIds = new Set(publishedExercises.map((e) => e.id));
    for (const option of options) expect(publishedIds.has(option.exercise.id)).toBe(true);
  });
});

function finished(
  id: string,
  unit: "kg" | "lb",
  at: string,
  sets: Array<{ id: string; exerciseId: string; reps: number; load: number; semantics?: string }>,
): Session2 {
  return {
    id,
    version: 1,
    type: "strength",
    status: "finished",
    name: "Session",
    startedAt: at,
    finishedAt: at,
    unit,
    plannedDetailAvailable: true,
    intervals: [{ startedAt: at, endedAt: at }],
    entries: sets.map((s, i) => ({
      entryId: `${id}#${i}`,
      exerciseId: s.exerciseId,
      exerciseName: findExercise(s.exerciseId)?.name ?? s.exerciseId,
      order: i,
      skipped: false,
      sets: [
        {
          id: s.id,
          setType: "working" as const,
          side: "both" as const,
          loadSemantics: (s.semantics ??
            findExercise(s.exerciseId)!.measurement.load) as never,
          done: true,
          performed: { reps: s.reps, load: s.load },
          completedAt: at,
        },
      ],
    })),
  };
}

const journal: Journal = {
  schemaVersion: 2,
  profile: null,
  active: null,
  sessions: [
    finished("s1", "kg", "2026-10-01T10:00:00.000Z", [
      { id: "x1", exerciseId: "goblet", reps: 8, load: 20 },
      { id: "x2", exerciseId: "squat", reps: 15, load: 0 },
    ]),
    finished("s2", "kg", "2026-10-08T10:00:00.000Z", [
      { id: "x3", exerciseId: "goblet", reps: 8, load: 24 },
    ]),
    // A pre-v2 record whose load meaning was never stored.
    finished("s3", "kg", "2026-09-01T10:00:00.000Z", [
      { id: "x4", exerciseId: "goblet", reps: 8, load: 100, semantics: "unspecifiedLegacy" },
    ]),
  ],
};

describe("metrics", () => {
  it("counts a finished session once however often it is replayed", () => {
    const duplicated: Journal = {
      ...journal,
      sessions: [...journal.sessions, journal.sessions[0]],
    };
    expect(completedSessions(duplicated)).toHaveLength(3);
  });

  it("ignores a finished session with nothing logged", () => {
    const empty = finished("s4", "kg", "2026-10-10T10:00:00.000Z", []);
    expect(
      completedSessions({ ...journal, sessions: [...journal.sessions, empty] }),
    ).toHaveLength(3);
  });

  it("excludes an ambiguous legacy load from a personal best", () => {
    const best = exerciseBest(journal, "goblet", "kg")!;
    // 100 kg is the heaviest number present, but its meaning is unknown.
    expect(best.set.load).toBe(24);
    expect(best.excludedLegacy).toBe(1);
  });

  it("converts for comparison without rewriting the original log", () => {
    expect(convertLoad(20, "kg", "lb")).toBeCloseTo(44.09, 1);
    expect(convertLoad(20, "kg", "kg")).toBe(20);
    const best = exerciseBest(journal, "goblet", "lb")!;
    expect(best.converted).toBeCloseTo(52.91, 1);
    // The record still reports what was typed, in the unit it was typed in.
    expect(best.set.load).toBe(24);
    expect(best.set.unit).toBe("kg");
  });

  it("attributes sets to primary muscles only, keeping supporting work separate", () => {
    const { primary, supporting } = workingSetsByMuscle(journal);
    // Three goblet squats plus one bodyweight squat, all quad-primary.
    expect(primary.get("quadriceps")).toBe(4);
    expect(primary.get("glutes")).toBe(4);
    // Supporting muscles are tracked, but not added into the primary count.
    expect(supporting.get("erectors")).toBe(4);
    expect(primary.get("erectors")).toBeUndefined();
  });

  it("excludes incomparable records from load-volume and says how many", () => {
    const volume = loadVolume(journal, "kg");
    // Only the two combined-external goblet sets qualify: 8×20 + 8×24.
    expect(volume.total).toBe(352);
    expect(volume.includedSets).toBe(2);
    // Bodyweight squat and the legacy record are excluded, not silently summed.
    expect(volume.excludedSets).toBe(2);
    expect(volume.convention).toContain("excluded");
  });

  it("produces one trend point per session and never interpolates", () => {
    const { points, basis } = exerciseTrend(journal, "goblet", "kg");
    expect(basis).toBe("load");
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.value)).toEqual([20, 24]);
    expect(Date.parse(points[0].at)).toBeLessThan(Date.parse(points[1].at));
  });

  it("ranks a movement with no external load by reps, not by a zero weight", () => {
    // A bodyweight squat logged at 0 kg has no weight to compare; ranking it by load
    // would report "0 kg" as a personal best, which is a unit error, not a record.
    const best = exerciseBest(journal, "squat", "kg")!;
    expect(best.basis).toBe("reps");
    expect(best.set.reps).toBe(15);
    expect(best.converted).toBe(15);
    expect(formatBest(best, "kg")).toBe("15 reps");

    const { basis } = exerciseTrend(journal, "squat", "kg");
    expect(basis).toBe("reps");

    // A loaded movement still reads as a weight.
    expect(formatBest(exerciseBest(journal, "goblet", "kg")!, "kg")).toBe(
      "24 kg × 8",
    );
  });

  it("marks a migrated session's duration as approximate", () => {
    const migrated: Session2 = {
      ...journal.sessions[0],
      plannedDetailAvailable: false,
      intervals: [
        { startedAt: "2026-10-01T10:00:00.000Z", endedAt: "2026-10-01T10:40:00.000Z" },
      ],
    };
    const { ms, exact } = activeDuration(migrated);
    expect(ms).toBe(40 * 60_000);
    expect(exact).toBe(false);
  });
});
