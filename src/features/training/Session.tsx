import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  List,
  Minimize2,
  Plus,
  Repeat,
  SkipForward,
  Undo2,
} from "lucide-react";
import {
  activeDuration,
  applyCommand,
  assumedEquipment,
  CommandError,
  completedSetCount,
  findExercise,
  formatDuration,
  loadLabel,
  plannedSetCount,
  restRemaining,
  substitutionsFor,
  type Journal,
  type Profile,
  type Session2,
  type Command,
} from "../../domain";
import { previousPerformance } from "./workout";
import { Sheet } from "../../ui/Sheet";
import { HowTo } from "../library/HowTo";

/** One timer for the whole screen, so rows do not each run their own interval. */
function useNow(active: boolean, ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

export function SessionWorkspace({
  session,
  journal,
  profile,
  run,
  onMinimize,
  onFinish,
  onDiscard,
}: {
  session: Session2;
  journal: Journal;
  profile: Profile;
  run: (command: Command) => void;
  onMinimize: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState("");
  const now = useNow(true);

  const entries = session.entries;
  const entry = entries[Math.min(index, entries.length - 1)];
  const definition = entry ? findExercise(entry.exerciseId) : undefined;
  const rest = restRemaining(session, now);
  const elapsed = activeDuration(session, now);
  const bodyweightOnly = definition?.measurement.load === "none";

  // Typing must never be interrupted by the screen moving underneath the keyboard.
  const typing = useRef(false);

  const exercisesDone = entries.filter(
    (e) => e.skipped || e.sets.every((s) => s.done),
  ).length;

  const dispatch = (command: Command) => {
    try {
      run(command);
      setError("");
    } catch (e) {
      setError(
        e instanceof CommandError ? e.message : "That change could not be applied.",
      );
    }
  };

  if (!entry)
    return (
      <div className="session">
        <p className="muted">This session has no movements left.</p>
        <button className="primary" onClick={onDiscard}>
          Close session
        </button>
      </div>
    );

  return (
    <div className="session">
      <header className="session-bar">
        <button
          className="icon-button"
          aria-label="Minimize workout"
          onClick={onMinimize}
        >
          <Minimize2 size={20} />
        </button>
        <div className="session-bar-title">
          <strong>{session.name}</strong>
          <span className="tabular">
            {formatDuration(elapsed.ms)}
            {!elapsed.exact && <abbr title="Approximate"> ~</abbr>} ·{" "}
            {exercisesDone} of {entries.length} movements
          </span>
        </div>
        <button
          className="icon-button"
          aria-label="All movements"
          onClick={() => setOverview(true)}
        >
          <List size={20} />
        </button>
      </header>

      <div
        className="session-progress"
        role="progressbar"
        aria-label="Movements completed"
        aria-valuenow={exercisesDone}
        aria-valuemin={0}
        aria-valuemax={entries.length}
      >
        {entries.map((e) => (
          <span
            key={e.entryId}
            data-state={
              e.skipped
                ? "skipped"
                : e.sets.every((s) => s.done)
                  ? "done"
                  : e.entryId === entry.entryId
                    ? "current"
                    : "ahead"
            }
          />
        ))}
      </div>

      {error && (
        <p className="session-error" role="alert">
          {error}
        </p>
      )}

      <div className="session-exercise">
        <div className="exercise-head">
          <div>
            <p className="eyebrow tabular">
              Movement {index + 1} of {entries.length}
            </p>
            <h1>{entry.exerciseName}</h1>
            <p className="muted">
              Target {entry.targetReps ?? "—"}
              {definition && !bodyweightOnly && ` · ${loadLabel(definition)}`}
            </p>
            {entry.substitutedFrom && (
              <p className="fine">
                Replaced {entry.substitutedFrom.exerciseName} for this session.
              </p>
            )}
          </div>
          {/* One tap to instruction, from the movement being performed. */}
          <button
            className="help-button"
            onClick={() => setHelpFor(entry.exerciseId)}
          >
            <HelpCircle size={18} aria-hidden="true" />
            How to
          </button>
        </div>

        <table className="set-table">
          <caption className="sr-only">
            Sets for {entry.exerciseName}. Suggested values are marked as suggestions
            until you confirm them.
          </caption>
          <thead>
            <tr>
              <th scope="col">Set</th>
              <th scope="col">Last time</th>
              {!bodyweightOnly && (
                <th scope="col">{session.unit.toUpperCase()}</th>
              )}
              <th scope="col">Reps</th>
              <th scope="col">
                <span className="sr-only">Complete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entry.sets.map((set, si) => {
              const previous = previousPerformance(
                journal,
                entry.exerciseId,
                session.unit,
                si,
              );
              const value = set.done ? set.performed : set.input;
              const suggested = !set.done && !set.input?.reps && set.planned?.reps;
              return (
                <tr key={set.id} className={set.done ? "done" : ""}>
                  <th scope="row" className="tabular">
                    {si + 1}
                  </th>
                  <td className="previous tabular">
                    {previous ? (
                      <>
                        {bodyweightOnly
                          ? `${previous.reps}`
                          : `${round(previous.converted)} × ${previous.reps}`}
                        {previous.convertedFrom && (
                          <abbr
                            title={`Logged as ${previous.load} ${previous.unit}`}
                          >
                            *
                          </abbr>
                        )}
                        {previous.ambiguous && (
                          <abbr title="Logged before Kinset recorded what the weight referred to">
                            †
                          </abbr>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  {!bodyweightOnly && (
                    <td>
                      <input
                        className="tabular"
                        aria-label={`${entry.exerciseName} set ${si + 1} weight in ${session.unit}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="2000"
                        step="0.5"
                        disabled={set.done}
                        value={value?.load ?? ""}
                        placeholder="0"
                        onFocus={() => (typing.current = true)}
                        onBlur={() => (typing.current = false)}
                        onChange={(e) =>
                          dispatch({
                            type: "editSet",
                            entryId: entry.entryId,
                            setId: set.id,
                            load: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  )}
                  <td>
                    <input
                      className={`tabular ${suggested ? "suggested" : ""}`}
                      aria-label={`${entry.exerciseName} set ${si + 1} reps`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      disabled={set.done}
                      value={value?.reps ?? ""}
                      placeholder={set.planned?.reps ? String(set.planned.reps) : "0"}
                      onFocus={() => (typing.current = true)}
                      onBlur={() => (typing.current = false)}
                      onChange={(e) =>
                        dispatch({
                          type: "editSet",
                          entryId: entry.entryId,
                          setId: set.id,
                          reps: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className={`check ${set.done ? "checked" : ""}`}
                      aria-pressed={set.done}
                      aria-label={`${set.done ? "Undo" : "Complete"} ${entry.exerciseName} set ${si + 1}`}
                      onClick={() => {
                        if (set.done)
                          dispatch({
                            type: "uncompleteSet",
                            entryId: entry.entryId,
                            setId: set.id,
                          });
                        else {
                          // Bodyweight needs no typed zero: fill the load implicitly.
                          if (bodyweightOnly)
                            dispatch({
                              type: "editSet",
                              entryId: entry.entryId,
                              setId: set.id,
                              load: 0,
                            });
                          dispatch({
                            type: "completeSet",
                            entryId: entry.entryId,
                            setId: set.id,
                          });
                        }
                      }}
                    >
                      {set.done ? <Undo2 size={18} /> : <Check size={20} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="set-actions">
          <button
            className="quiet"
            onClick={() =>
              dispatch({
                type: "addSet",
                entryId: entry.entryId,
                setId: crypto.randomUUID(),
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add set
          </button>
          <button className="quiet" onClick={() => setReplacing(entry.entryId)}>
            <Repeat size={16} aria-hidden="true" />
            Replace
          </button>
          <button
            className="quiet"
            onClick={() =>
              dispatch({
                type: "skipExercise",
                entryId: entry.entryId,
                skipped: !entry.skipped,
              })
            }
          >
            <SkipForward size={16} aria-hidden="true" />
            {entry.skipped ? "Unskip" : "Skip for today"}
          </button>
        </div>
      </div>

      <nav className="exercise-nav" aria-label="Move between movements">
        <button
          className="quiet"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          Previous
        </button>
        <button
          className="quiet"
          disabled={index >= entries.length - 1}
          onClick={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
        >
          Next
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>

      {/* Rest is a strip, not a takeover: the interface stays usable throughout. */}
      {rest > 0 && (
        <div className="rest-strip" role="timer" aria-label={`Rest, ${rest} seconds left`}>
          <strong className="tabular">{formatClock(rest)}</strong>
          <span className="rest-next">
            Next: set{" "}
            {entry.sets.findIndex((s) => !s.done) + 1 || entry.sets.length} of{" "}
            {entry.exerciseName}
          </span>
          <button
            className="quiet"
            onClick={() => dispatch({ type: "adjustRest", deltaSeconds: -15 })}
          >
            −15
          </button>
          <button
            className="quiet"
            onClick={() => dispatch({ type: "adjustRest", deltaSeconds: 15 })}
          >
            +15
          </button>
          <button className="quiet" onClick={() => dispatch({ type: "skipRest" })}>
            Skip
          </button>
        </div>
      )}

      <div className="session-foot">
        <button className="primary" onClick={() => setConfirmFinish(true)}>
          Finish workout
        </button>
        <p className="muted tabular">
          {completedSetCount(session)} of {plannedSetCount(session)} sets logged
        </p>
      </div>

      {overview && (
        <Sheet title="All movements" onClose={() => setOverview(false)}>
          <ol className="overview-list">
            {entries.map((e, i) => {
              const complete = e.sets.filter((s) => s.done).length;
              return (
                <li key={e.entryId}>
                  <button
                    onClick={() => {
                      setIndex(i);
                      setOverview(false);
                    }}
                    aria-current={i === index ? "true" : undefined}
                  >
                    <span className="overview-name">
                      <strong>{e.exerciseName}</strong>
                      <small>
                        {e.skipped
                          ? "Skipped today"
                          : `${complete} of ${e.sets.length} sets`}
                      </small>
                    </span>
                    {complete === e.sets.length && !e.skipped && (
                      <Check size={18} aria-label="Complete" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </Sheet>
      )}

      {helpFor && (
        <HowTo exerciseId={helpFor} onClose={() => setHelpFor(null)} />
      )}

      {replacing && (
        <ReplaceSheet
          session={session}
          entryId={replacing}
          profile={profile}
          onClose={() => setReplacing(null)}
          onReplace={(replacementId, setCount) => {
            dispatch({
              type: "replaceExercise",
              entryId: replacing,
              replacementId,
              newEntryId: crypto.randomUUID(),
              newSetIds: Array.from({ length: setCount }, () => crypto.randomUUID()),
            });
            setReplacing(null);
          }}
        />
      )}

      {confirmFinish && (
        <FinishSheet
          session={session}
          onClose={() => setConfirmFinish(false)}
          onFinish={onFinish}
          onDiscard={onDiscard}
        />
      )}
    </div>
  );
}

/**
 * Replacing a movement mid-session.
 *
 * Options are matched by movement pattern and by the full equipment requirement, each
 * with the reason shown. When nothing matches, the sheet says so and offers to skip —
 * it does not fall back to a movement that merely shares a browse label.
 */
function ReplaceSheet({
  session,
  entryId,
  profile,
  onClose,
  onReplace,
}: {
  session: Session2;
  entryId: string;
  profile: Profile;
  onClose: () => void;
  onReplace: (replacementId: string, setCount: number) => void;
}) {
  const entry = session.entries.find((e) => e.entryId === entryId)!;
  const completed = entry.sets.filter((s) => s.done).length;
  const remaining = entry.sets.length - completed;
  const options = useMemo(
    () => substitutionsFor(entry.exerciseId, assumedEquipment(profile.equipment)),
    [entry.exerciseId, profile.equipment],
  );

  return (
    <Sheet title={`Replace ${entry.exerciseName}`} onClose={onClose}>
      {completed > 0 && (
        <p className="notice-inline" role="note">
          Your {completed} completed set{completed === 1 ? "" : "s"} stay in the
          record. The replacement takes over the remaining {remaining}.
        </p>
      )}
      {options.length ? (
        <ul className="replace-list">
          {options.map((option) => (
            <li key={option.exercise.id}>
              <button
                onClick={() => onReplace(option.exercise.id, Math.max(remaining, 1))}
              >
                <span>
                  <strong>{option.exercise.name}</strong>
                  <small>{option.reason}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-inline">
          <p>
            <strong>No matching movement is available.</strong>
          </p>
          <p className="muted">
            Nothing in the library trains the same pattern with the equipment you have.
            Rather than swap in something that works different muscles, skip this
            movement for today.
          </p>
        </div>
      )}
    </Sheet>
  );
}

/** Finish review: completed against skipped, stated plainly. */
function FinishSheet({
  session,
  onClose,
  onFinish,
  onDiscard,
}: {
  session: Session2;
  onClose: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const done = completedSetCount(session);
  const planned = plannedSetCount(session);

  if (!done)
    return (
      <Sheet title="Nothing logged yet" onClose={onClose}>
        <p className="muted">
          No sets have been completed, so there is no workout to save. You can keep
          going, or discard this session.
        </p>
        <button className="primary" onClick={onClose}>
          Keep training
        </button>
        <button className="quiet danger" onClick={onDiscard}>
          Discard session
        </button>
      </Sheet>
    );

  return (
    <Sheet title="Finish workout" onClose={onClose}>
      <p className="tabular finish-count">
        <strong>{done}</strong> of {planned} planned sets logged
      </p>
      <ul className="finish-list">
        {session.entries.map((entry) => {
          const complete = entry.sets.filter((s) => s.done).length;
          return (
            <li key={entry.entryId}>
              <span>{entry.exerciseName}</span>
              <span className="tabular muted">
                {entry.skipped
                  ? "Skipped"
                  : `${complete}/${entry.sets.length}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="fine">
        Everything you planned is kept, including what you skipped, so the summary can
        show the whole session.
      </p>
      <button className="primary" onClick={onFinish}>
        Finish and save
      </button>
      <button className="quiet" onClick={onClose}>
        Keep training
      </button>
    </Sheet>
  );
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default SessionWorkspace;
