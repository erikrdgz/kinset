import { describe, it, expect } from "vitest";
import {
  applyCommand,
  applyAll,
  CommandError,
  completedSetCount,
  nextUnfinished,
  restRemaining,
  DEFAULT_REST_SECONDS,
} from "./session";
import type { Session2 } from "./schema";

const T0 = Date.parse("2026-10-16T08:00:00.000Z");

function session(): Session2 {
  return {
    id: "s-1",
    version: 1,
    type: "strength",
    status: "active",
    name: "Full body A",
    startedAt: new Date(T0).toISOString(),
    unit: "kg",
    plannedDetailAvailable: true,
    intervals: [{ startedAt: new Date(T0).toISOString() }],
    entries: [
      {
        entryId: "e-1",
        exerciseId: "goblet",
        exerciseName: "Goblet squat",
        order: 0,
        skipped: false,
        sets: [
          { id: "a", setType: "working", side: "both", loadSemantics: "combinedExternal", done: false },
          { id: "b", setType: "working", side: "both", loadSemantics: "combinedExternal", done: false },
        ],
      },
      {
        entryId: "e-2",
        exerciseId: "row",
        exerciseName: "Supported dumbbell row",
        order: 1,
        skipped: false,
        sets: [
          { id: "c", setType: "working", side: "both", loadSemantics: "combinedExternal", done: false },
        ],
      },
    ],
  };
}

const log = (s: Session2, entryId: string, setId: string, reps: number, load: number, at = T0) =>
  applyAll(s, [
    { type: "editSet", entryId, setId, reps, load },
    { type: "completeSet", entryId, setId, at },
  ]);

describe("session commands", () => {
  it("records a completed set and starts rest from a stored deadline", () => {
    const next = log(session(), "e-1", "a", 8, 20);
    const set = next.entries[0].sets[0];
    expect(set.done).toBe(true);
    expect(set.performed).toEqual({ reps: 8, load: 20 });
    expect(set.input).toBeUndefined();
    expect(set.completedAt).toBe(new Date(T0).toISOString());
    // The deadline is absolute, so a reload recomputes the same remaining time.
    expect(next.restUntil).toBe(T0 + DEFAULT_REST_SECONDS * 1000);
    expect(restRemaining(next, T0 + 30_000)).toBe(60);
    expect(restRemaining(next, T0 + 999_000)).toBe(0);
  });

  it("refuses a set with no reps and keeps bodyweight loggable", () => {
    const s = session();
    expect(() =>
      applyCommand(s, { type: "completeSet", entryId: "e-1", setId: "a" }),
    ).toThrow(CommandError);
    const bodyweight = log(s, "e-1", "a", 12, 0);
    expect(bodyweight.entries[0].sets[0].performed).toEqual({ reps: 12, load: 0 });
  });

  it("uncompletes a set back into editable input without losing the numbers", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    const undone = applyCommand(done, {
      type: "uncompleteSet",
      entryId: "e-1",
      setId: "a",
    });
    const set = undone.entries[0].sets[0];
    expect(set.done).toBe(false);
    expect(set.performed).toBeUndefined();
    expect(set.input).toEqual({ reps: 8, load: 20 });
    expect(set.completedAt).toBeUndefined();
  });

  it("will not edit or remove a completed set", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    expect(() =>
      applyCommand(done, { type: "editSet", entryId: "e-1", setId: "a", reps: 99 }),
    ).toThrow(CommandError);
    expect(() =>
      applyCommand(done, { type: "removeSet", entryId: "e-1", setId: "a" }),
    ).toThrow(CommandError);
  });

  it("moves focus to the next unfinished set", () => {
    const s = session();
    expect(nextUnfinished(s)?.set.id).toBe("a");
    const after = log(s, "e-1", "a", 8, 20);
    expect(nextUnfinished(after)?.set.id).toBe("b");
    const skipped = applyCommand(after, {
      type: "skipExercise",
      entryId: "e-1",
      skipped: true,
    });
    expect(nextUnfinished(skipped)?.set.id).toBe("c");
  });

  it("adjusts and skips rest without touching the log", () => {
    const resting = log(session(), "e-1", "a", 8, 20);
    const longer = applyCommand(resting, {
      type: "adjustRest",
      deltaSeconds: 15,
      at: T0,
    });
    expect(longer.restUntil).toBe(resting.restUntil! + 15_000);
    // Shortening past the present clamps to zero remaining, never to a negative time.
    const shortened = applyCommand(longer, {
      type: "adjustRest",
      deltaSeconds: -600,
      at: T0,
    });
    expect(restRemaining(shortened, T0)).toBe(0);
    const skipped = applyCommand(longer, { type: "skipRest" });
    expect(skipped.restUntil).toBeUndefined();
    expect(completedSetCount(skipped)).toBe(1);
  });

  it("excludes explicit pauses from active duration and freezes rest", () => {
    const resting = log(session(), "e-1", "a", 8, 20);
    const paused = applyCommand(resting, { type: "pause", at: T0 + 60_000 });
    expect(paused.restUntil).toBeUndefined();
    expect(paused.intervals[0].endedAt).toBe(
      new Date(T0 + 60_000).toISOString(),
    );
    const resumed = applyCommand(paused, { type: "resume", at: T0 + 600_000 });
    expect(resumed.intervals).toHaveLength(2);
    // Pausing twice is harmless.
    expect(applyCommand(paused, { type: "pause" })).toEqual(paused);
  });
});

describe("substitution", () => {
  it("keeps completed work and continues the remaining sets on the replacement", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    const swapped = applyCommand(done, {
      type: "replaceExercise",
      entryId: "e-1",
      replacementId: "sumo",
      newEntryId: "e-3",
      newSetIds: ["d"],
    });
    // The original entry survives, holding only what was actually logged.
    expect(swapped.entries[0].entryId).toBe("e-1");
    expect(swapped.entries[0].sets).toHaveLength(1);
    expect(swapped.entries[0].sets[0].performed).toEqual({ reps: 8, load: 20 });
    // The replacement is a new entry with its own identity.
    const fresh = swapped.entries[1];
    expect(fresh.entryId).toBe("e-3");
    expect(fresh.exerciseId).toBe("sumo");
    expect(fresh.substitutedFrom).toEqual({
      exerciseId: "goblet",
      exerciseName: "Goblet squat",
    });
    expect(fresh.sets).toHaveLength(1);
    expect(swapped.entries.map((e) => e.order)).toEqual([0, 1, 2]);
    // Entry IDs stay unique, so a reorder cannot collide.
    expect(new Set(swapped.entries.map((e) => e.entryId)).size).toBe(3);
  });

  it("swaps in place when nothing has been logged yet", () => {
    const swapped = applyCommand(session(), {
      type: "replaceExercise",
      entryId: "e-1",
      replacementId: "sumo",
      newEntryId: "e-3",
      newSetIds: ["d", "e"],
    });
    expect(swapped.entries).toHaveLength(2);
    expect(swapped.entries[0].exerciseId).toBe("sumo");
    expect(swapped.entries[0].sets).toHaveLength(2);
  });

  it("rejects a replacement that is not in the library", () => {
    expect(() =>
      applyCommand(session(), {
        type: "replaceExercise",
        entryId: "e-1",
        replacementId: "not-a-movement",
        newEntryId: "e-3",
        newSetIds: ["d"],
      }),
    ).toThrow(CommandError);
  });
});

describe("finishing", () => {
  it("keeps planned-but-unfinished work in the record", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    const finished = applyCommand(done, { type: "finish", at: T0 + 1800_000 });
    expect(finished.status).toBe("finished");
    expect(finished.plannedDetailAvailable).toBe(true);
    // Three sets were planned; one was done. All three survive.
    expect(finished.entries.flatMap((e) => e.sets)).toHaveLength(3);
    expect(completedSetCount(finished)).toBe(1);
    expect(finished.restUntil).toBeUndefined();
  });

  it("is idempotent, so a double tap cannot produce a second record", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    const once = applyCommand(done, { type: "finish", at: T0 + 1800_000 });
    const twice = applyCommand(once, { type: "finish", at: T0 + 1900_000 });
    expect(twice).toEqual(once);
    expect(twice.finishedAt).toBe(once.finishedAt);
  });

  it("refuses to finish a session with nothing logged", () => {
    expect(() => applyCommand(session(), { type: "finish" })).toThrow(
      CommandError,
    );
  });

  it("rejects further edits once closed", () => {
    const done = log(session(), "e-1", "a", 8, 20);
    const finished = applyCommand(done, { type: "finish" });
    expect(() =>
      applyCommand(finished, { type: "editSet", entryId: "e-1", setId: "b", reps: 5 }),
    ).toThrow(CommandError);
  });
});
