import { describe, it, expect } from "vitest";
import { migrateV1ToV2, migrateToCurrent } from "./migrate";
import { parseJournal, needsMigration, isFromNewerBuild } from "./schema";
import type { Profile, Session, State } from "./legacy";

const profile: Profile = {
  name: "Alex",
  goal: "Build consistency",
  days: 3,
  equipment: "Dumbbells",
  experience: "Returning",
  unit: "kg",
  weight: "",
  height: "",
};

/** A finished session as v1 stored it: unfinished sets already stripped away. */
const finishedKg: Session = {
  id: "s-1",
  name: "Full body A",
  startedAt: "2026-09-01T10:00:00.000Z",
  finishedAt: "2026-09-01T10:42:00.000Z",
  unit: "kg",
  entries: [
    {
      exerciseId: "goblet",
      targetReps: "8–10",
      sets: [
        { id: "set-1", reps: 8, weight: 20, done: true },
        { id: "set-2", reps: 8, weight: 20, done: true },
      ],
    },
    {
      exerciseId: "row",
      sets: [{ id: "set-3", reps: 10, weight: 14, done: true }],
    },
  ],
};

/** An older session logged in pounds, to prove units are never rewritten. */
const finishedLb: Session = {
  id: "s-2",
  name: "Full body B",
  startedAt: "2026-08-20T09:00:00.000Z",
  finishedAt: "2026-08-20T09:35:00.000Z",
  unit: "lb",
  entries: [
    {
      exerciseId: "press",
      sets: [{ id: "set-4", reps: 10, weight: 35, done: true }],
    },
  ],
};

/** Mid-workout: some sets done, one half-typed, one untouched. */
const active: Session = {
  id: "s-3",
  name: "Full body A",
  startedAt: "2026-10-16T08:00:00.000Z",
  unit: "kg",
  planId: "plan-1",
  dayId: "day-1",
  planName: "My foundation",
  entries: [
    {
      exerciseId: "goblet",
      targetReps: "8–10",
      sets: [
        { id: "set-5", reps: 8, weight: 22.5, done: true },
        { id: "set-6", reps: 0, weight: 22.5, done: false },
        { id: "set-7", reps: 0, weight: 0, done: false },
      ],
    },
  ],
};

const legacy: State = {
  profile,
  sessions: [finishedKg, finishedLb],
  active,
  plans: [
    {
      id: "plan-1",
      name: "My foundation",
      days: [
        {
          id: "day-1",
          name: "Full body A",
          entries: [{ exerciseId: "goblet", sets: 3, repsMin: 8, repsMax: 10 }],
        },
      ],
    },
  ],
  activePlanId: "plan-1",
  planProgress: { "plan-1": 1 },
  planDraft: null,
};

describe("v1 → v2 migration", () => {
  it("preserves every identity, count and unit", () => {
    const { journal, report } = migrateV1ToV2(legacy);
    expect(report.ok).toBe(true);
    expect(report.discrepancies).toEqual([]);
    expect(report.source.setIds).toEqual(report.target.setIds);
    expect(report.source.units).toEqual({ kg: 2, lb: 1 });

    expect(journal.sessions.map((s) => s.id)).toEqual(["s-1", "s-2"]);
    expect(journal.active?.id).toBe("s-3");
    expect(journal.sessions[1].unit).toBe("lb");
    expect(journal.sessions[1].entries[0].sets[0].performed).toEqual({
      reps: 10,
      load: 35,
    });
    expect(journal.plans?.[0].id).toBe("plan-1");
    expect(journal.activePlanId).toBe("plan-1");
    expect(journal.planProgress).toEqual({ "plan-1": 1 });
    expect(parseJournal(journal).ok).toBe(true);
  });

  it("gives entries stable IDs that survive a rerun", () => {
    const first = migrateV1ToV2(legacy, new Date("2026-10-16T00:00:00.000Z"));
    const second = migrateV1ToV2(legacy, new Date("2026-10-16T00:00:00.000Z"));
    expect(second.journal).toEqual(first.journal);

    const ids = first.journal.sessions[0].entries.map((e) => e.entryId);
    expect(ids).toEqual(["s-1#0", "s-1#1"]);
    // An entry ID is its own thing, not the exercise ID.
    expect(ids[0]).not.toBe(first.journal.sessions[0].entries[0].exerciseId);
  });

  it("is idempotent: migrating an already-migrated journal changes nothing", () => {
    const once = migrateToCurrent(legacy, new Date("2026-10-16T00:00:00.000Z"));
    const twice = migrateToCurrent(
      once.journal,
      new Date("2026-10-17T00:00:00.000Z"),
    );
    expect(twice.report).toBeNull();
    expect(twice.journal).toEqual(once.journal);
  });

  it("marks v1 finished sessions as missing their skipped detail, and invents nothing", () => {
    const { journal, report } = migrateV1ToV2(legacy);
    expect(report.sessionsWithoutPlannedDetail).toBe(2);
    for (const session of journal.sessions) {
      expect(session.plannedDetailAvailable).toBe(false);
      // Every surviving set is a completed one; no skipped placeholders were added.
      expect(session.entries.flatMap((e) => e.sets).every((s) => s.done)).toBe(
        true,
      );
    }
    // The in-progress session kept all three sets, so its detail is intact.
    expect(journal.active?.plannedDetailAvailable).toBe(true);
    expect(journal.active?.entries[0].sets).toHaveLength(3);
  });

  it("never guesses what a legacy dumbbell number meant", () => {
    const { journal } = migrateV1ToV2(legacy);
    const semantics = journal.sessions
      .flatMap((s) => s.entries)
      .flatMap((e) => e.sets)
      .map((s) => s.loadSemantics);
    expect(new Set(semantics)).toEqual(new Set(["unspecifiedLegacy"]));
  });

  it("keeps half-typed values as input rather than as a result", () => {
    const { journal } = migrateV1ToV2(legacy);
    const sets = journal.active!.entries[0].sets;
    expect(sets[0].performed).toEqual({ reps: 8, load: 22.5 });
    expect(sets[0].input).toBeUndefined();
    // Typed weight, no reps, never confirmed: preserved, but not a record.
    expect(sets[1].done).toBe(false);
    expect(sets[1].performed).toBeUndefined();
    expect(sets[1].input).toEqual({ load: 22.5 });
    // Untouched set carries nothing at all.
    expect(sets[2].input).toBeUndefined();
  });

  it("renders an unknown exercise ID instead of crashing", () => {
    const retired: State = {
      ...legacy,
      active: null,
      sessions: [
        {
          ...finishedKg,
          id: "s-9",
          entries: [
            {
              exerciseId: "retired-movement",
              sets: [{ id: "set-9", reps: 5, weight: 40, done: true }],
            },
          ],
        },
      ],
    };
    const { journal, report } = migrateV1ToV2(retired);
    expect(report.ok).toBe(true);
    expect(report.unknownExerciseIds).toEqual(["retired-movement"]);
    const entry = journal.sessions[0].entries[0];
    expect(entry.exerciseId).toBe("retired-movement");
    expect(entry.exerciseName).toContain("retired-movement");
    expect(parseJournal(journal).ok).toBe(true);
  });

  it("handles a sparse journal with no plans, draft or active session", () => {
    const sparse: State = { profile, sessions: [], active: null };
    const { journal, report } = migrateV1ToV2(sparse);
    expect(report.ok).toBe(true);
    expect(journal.sessions).toEqual([]);
    expect(journal.active).toBeNull();
    expect(journal.plans).toBeUndefined();
    expect(parseJournal(journal).ok).toBe(true);
  });

  it("carries an unsaved plan draft across", () => {
    const withDraft: State = {
      ...legacy,
      planDraft: {
        id: "draft-1",
        name: "Half-built",
        days: [
          {
            id: "d-1",
            name: "Day 1",
            entries: [{ exerciseId: "curl", sets: 3, repsMin: 10, repsMax: 12 }],
          },
        ],
      },
    };
    const { journal, report } = migrateV1ToV2(withDraft);
    expect(report.ok).toBe(true);
    expect(report.source.drafts).toBe(1);
    expect(journal.planDraft?.id).toBe("draft-1");
  });
});

describe("schema boundaries", () => {
  it("recognises what needs migrating and what came from a newer build", () => {
    expect(needsMigration(legacy)).toBe(true);
    expect(needsMigration({ schemaVersion: 1 })).toBe(true);
    expect(needsMigration({ schemaVersion: 2 })).toBe(false);
    expect(isFromNewerBuild({ schemaVersion: 99 })).toBe(true);
    expect(isFromNewerBuild({ schemaVersion: 2 })).toBe(false);
  });

  it("quarantines a malformed record with its raw contents instead of emptying it", () => {
    const broken = { schemaVersion: 2, profile: null, sessions: "nope" };
    const result = parseJournal(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.raw).toBe(broken);
      expect(result.issues.join(" ")).toContain("sessions");
    }
  });
});
