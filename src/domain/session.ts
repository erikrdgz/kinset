/**
 * Session state transitions as explicit commands.
 *
 * The audited screen rebuilt the entire journal inline for every edit, which is how
 * "finish" could advance a plan twice and how a substitution could collide with an
 * array index. Here every change is a named command validated against the current
 * status, and the reducer is pure so the same operation can be replayed safely.
 */
import {
  findExercise,
  type EquipmentItem,
  type ExerciseDefinition,
} from "./exercises";
import type { Session2, SessionExercise, SetRecord } from "./schema";

export const DEFAULT_REST_SECONDS = 90;

export type Command =
  | { type: "editSet"; entryId: string; setId: string; reps?: number; load?: number }
  | { type: "completeSet"; entryId: string; setId: string; at?: number }
  | { type: "uncompleteSet"; entryId: string; setId: string }
  | { type: "addSet"; entryId: string; setId: string }
  | { type: "removeSet"; entryId: string; setId: string }
  | { type: "skipExercise"; entryId: string; skipped: boolean }
  | { type: "noteExercise"; entryId: string; note: string }
  | {
      type: "replaceExercise";
      entryId: string;
      replacementId: string;
      newEntryId: string;
      newSetIds: string[];
    }
  | { type: "startRest"; seconds?: number; at?: number }
  | { type: "adjustRest"; deltaSeconds: number; at?: number }
  | { type: "skipRest" }
  | { type: "pause"; at?: number }
  | { type: "resume"; at?: number }
  | { type: "finish"; at?: number }
  | { type: "discard" };

export class CommandError extends Error {}

/** A set is loggable when its reps are a positive whole number and its load is sane. */
export function validPerformed(value: { reps?: number; load?: number }) {
  const reps = value.reps ?? 0;
  const load = value.load ?? 0;
  return (
    Number.isSafeInteger(reps) &&
    reps > 0 &&
    Number.isFinite(load) &&
    load >= 0 &&
    load <= 2000
  );
}

function mapEntry(
  session: Session2,
  entryId: string,
  fn: (entry: SessionExercise) => SessionExercise,
): Session2 {
  let found = false;
  const entries = session.entries.map((e) => {
    if (e.entryId !== entryId) return e;
    found = true;
    return fn(e);
  });
  if (!found) throw new CommandError(`No session entry "${entryId}".`);
  return { ...session, entries };
}

function mapSet(
  session: Session2,
  entryId: string,
  setId: string,
  fn: (set: SetRecord) => SetRecord,
): Session2 {
  return mapEntry(session, entryId, (entry) => {
    let found = false;
    const sets = entry.sets.map((s) => {
      if (s.id !== setId) return s;
      found = true;
      return fn(s);
    });
    if (!found) throw new CommandError(`No set "${setId}".`);
    return { ...entry, sets };
  });
}

function isPaused(session: Session2) {
  const last = session.intervals[session.intervals.length - 1];
  return !last || Boolean(last.endedAt);
}

function closeInterval(session: Session2, at: number): Session2 {
  if (isPaused(session)) return session;
  const intervals = session.intervals.slice();
  intervals[intervals.length - 1] = {
    ...intervals[intervals.length - 1],
    endedAt: new Date(at).toISOString(),
  };
  return { ...session, intervals };
}

/**
 * Apply one command. Throws `CommandError` for a transition that is not allowed, so a
 * caller can surface the reason rather than writing an impossible state.
 */
export function applyCommand(session: Session2, command: Command): Session2 {
  if (session.status !== "active") {
    // Finishing twice is a normal consequence of a retry or a double tap, so it is a
    // no-op rather than an error. Anything else genuinely should not reach a closed
    // session.
    if (command.type === "finish" || command.type === "discard") return session;
    throw new CommandError("This session is no longer active.");
  }

  switch (command.type) {
    case "editSet":
      return mapSet(session, command.entryId, command.setId, (set) => {
        if (set.done)
          throw new CommandError("Uncomplete the set before changing it.");
        const input = {
          ...set.input,
          ...(command.reps !== undefined ? { reps: command.reps } : {}),
          ...(command.load !== undefined ? { load: command.load } : {}),
        };
        return { ...set, input };
      });

    case "completeSet": {
      const at = command.at ?? Date.now();
      const entry = session.entries.find((e) => e.entryId === command.entryId);
      const set = entry?.sets.find((s) => s.id === command.setId);
      if (!entry || !set) throw new CommandError("That set is no longer here.");
      if (set.done) return session;
      const value = { reps: set.input?.reps, load: set.input?.load ?? 0 };
      if (!validPerformed(value))
        throw new CommandError(
          "Enter a positive whole-number rep count and a weight from 0–2000. Use 0 for bodyweight.",
        );
      const next = mapSet(session, command.entryId, command.setId, (s) => ({
        ...s,
        done: true,
        performed: { reps: value.reps, load: value.load },
        input: undefined,
        completedAt: new Date(at).toISOString(),
      }));
      // Completing a set starts the rest; persistence of the deadline is what makes it
      // survive a reload.
      return applyCommand(next, { type: "startRest", at });
    }

    case "uncompleteSet":
      return mapSet(session, command.entryId, command.setId, (set) => {
        if (!set.done) return set;
        return {
          ...set,
          done: false,
          // The recorded values become editable input again rather than vanishing.
          input: set.performed,
          performed: undefined,
          completedAt: undefined,
        };
      });

    case "addSet":
      return mapEntry(session, command.entryId, (entry) => ({
        ...entry,
        sets: [
          ...entry.sets,
          {
            id: command.setId,
            setType: "working",
            side: "both",
            loadSemantics:
              findExercise(entry.exerciseId)?.measurement.load ?? "none",
            done: false,
          },
        ],
      }));

    case "removeSet":
      return mapEntry(session, command.entryId, (entry) => {
        const set = entry.sets.find((s) => s.id === command.setId);
        if (set?.done)
          throw new CommandError("Completed sets stay in the record.");
        return { ...entry, sets: entry.sets.filter((s) => s.id !== command.setId) };
      });

    case "skipExercise":
      return mapEntry(session, command.entryId, (entry) => ({
        ...entry,
        skipped: command.skipped,
      }));

    case "noteExercise":
      return mapEntry(session, command.entryId, (entry) => ({
        ...entry,
        note: command.note || undefined,
      }));

    case "replaceExercise": {
      const replacement = findExercise(command.replacementId);
      if (!replacement)
        throw new CommandError("That replacement is not in the library.");
      const index = session.entries.findIndex(
        (e) => e.entryId === command.entryId,
      );
      if (index < 0) throw new CommandError("That movement is no longer here.");
      const original = session.entries[index];
      const completed = original.sets.filter((s) => s.done);
      const remaining = original.sets.length - completed.length;

      const fresh: SessionExercise = {
        entryId: command.newEntryId,
        exerciseId: replacement.id,
        exerciseName: replacement.name,
        order: original.order,
        targetReps: `${replacement.defaultReps.min}–${replacement.defaultReps.max}`,
        substitutedFrom: {
          exerciseId: original.exerciseId,
          exerciseName: original.exerciseName,
        },
        skipped: false,
        sets: command.newSetIds
          .slice(0, Math.max(remaining, 1))
          .map((id) => ({
            id,
            setType: "working" as const,
            side: "both" as const,
            loadSemantics: replacement.measurement.load,
            done: false,
          })),
      };

      const entries = session.entries.slice();
      if (completed.length) {
        // Work already logged against the original movement stays in the record; the
        // replacement takes over only the sets that had not been done.
        entries[index] = { ...original, sets: completed };
        entries.splice(index + 1, 0, fresh);
      } else {
        entries[index] = fresh;
      }
      return {
        ...session,
        entries: entries.map((e, i) => ({ ...e, order: i })),
      };
    }

    case "startRest": {
      const at = command.at ?? Date.now();
      const seconds =
        command.seconds ?? session.restSeconds ?? DEFAULT_REST_SECONDS;
      return { ...session, restSeconds: seconds, restUntil: at + seconds * 1000 };
    }

    case "adjustRest": {
      if (!session.restUntil) return session;
      // Clamped against the supplied instant, not the ambient clock: "−15" can shorten
      // the rest to zero but never to a negative remaining time, and a system clock
      // change cannot rewrite a deadline.
      const at = command.at ?? Date.now();
      const restUntil = Math.max(
        at,
        session.restUntil + command.deltaSeconds * 1000,
      );
      return { ...session, restUntil };
    }

    case "skipRest":
      return { ...session, restUntil: undefined };

    case "pause": {
      const at = command.at ?? Date.now();
      if (isPaused(session)) return session;
      // An explicit pause freezes rest too, rather than letting it run down unattended.
      return { ...closeInterval(session, at), restUntil: undefined };
    }

    case "resume": {
      const at = command.at ?? Date.now();
      if (!isPaused(session)) return session;
      return {
        ...session,
        intervals: [
          ...session.intervals,
          { startedAt: new Date(at).toISOString() },
        ],
      };
    }

    case "finish": {
      const at = command.at ?? Date.now();
      if (!session.entries.some((e) => e.sets.some((s) => s.done)))
        throw new CommandError("Log at least one set before finishing.");
      return {
        // Unlike v1, every planned entry and set is kept, so the summary can show what
        // was skipped instead of silently dropping it.
        ...closeInterval(session, at),
        status: "finished",
        finishedAt: new Date(at).toISOString(),
        restUntil: undefined,
      };
    }

    case "discard":
      return { ...session, status: "discarded", restUntil: undefined };
  }
}

/** Apply several commands in order. Useful for replaying an outbox. */
export function applyAll(session: Session2, commands: Command[]) {
  return commands.reduce(applyCommand, session);
}

/** Seconds of rest left, derived from the stored deadline rather than a tick counter. */
export function restRemaining(session: Session2, now = Date.now()) {
  if (!session.restUntil) return 0;
  return Math.max(0, Math.ceil((session.restUntil - now) / 1000));
}

/** The first set that has not been completed, which is where focus belongs. */
export function nextUnfinished(session: Session2) {
  for (const entry of session.entries) {
    if (entry.skipped) continue;
    const set = entry.sets.find((s) => !s.done);
    if (set) return { entry, set };
  }
  return null;
}

export function completedSetCount(session: Session2) {
  return session.entries.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );
}

export function plannedSetCount(session: Session2) {
  return session.entries.reduce((n, e) => n + e.sets.length, 0);
}

/** Equipment the remaining work needs, for a mid-session "what do I still need" view. */
export function remainingEquipment(session: Session2): EquipmentItem[] {
  const needed = new Set<EquipmentItem>();
  for (const entry of session.entries) {
    if (entry.skipped || entry.sets.every((s) => s.done)) continue;
    const def: ExerciseDefinition | undefined = findExercise(entry.exerciseId);
    for (const item of def?.requires ?? []) needed.add(item);
  }
  return [...needed];
}
