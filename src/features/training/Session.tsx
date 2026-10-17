import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  HelpCircle,
  List,
  Minimize2,
  Plus,
  Repeat,
  SkipForward,
  Timer,
} from "lucide-react";
import {
  activeDuration,
  assumedEquipment,
  CommandError,
  completedSetCount,
  DEFAULT_REST_SECONDS,
  findExercise,
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
import { SlideToFinish } from "./SlideToFinish";
import "./session.css";

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
  const [setFeedback, setSetFeedback] = useState(false);
  const doneSets = completedSetCount(session);
  const plannedSets = plannedSetCount(session);
  const lastDoneCount = useRef(doneSets);

  useEffect(() => {
    const justCompleted = doneSets > lastDoneCount.current;
    lastDoneCount.current = doneSets;
    if (!justCompleted) {
      setSetFeedback(false);
      return;
    }
    setSetFeedback(true);
    const timeout = setTimeout(() => setSetFeedback(false), 2200);
    return () => clearTimeout(timeout);
  }, [doneSets]);

  const entries = session.entries;
  const entry = entries[Math.min(index, entries.length - 1)];
  const definition = entry ? findExercise(entry.exerciseId) : undefined;
  const rest = restRemaining(session, now);
  const elapsed = activeDuration(session, now);
  const bodyweightOnly = definition?.measurement.load === "none";
  const completion = plannedSets ? Math.round((doneSets / plannedSets) * 100) : 0;
  const entryDone = entry?.sets.filter((s) => s.done).length ?? 0;
  const nextSetIndex = entry?.sets.findIndex((s) => !s.done) ?? -1;
  const nextEntry = [...entries.slice(index + 1), ...entries.slice(0, index)]
    .find((e) => !e.skipped && e.sets.some((s) => !s.done));
  const nextLabel = nextSetIndex >= 0 && !entry?.skipped
    ? `Set ${nextSetIndex + 1} · ${entry?.exerciseName}`
    : nextEntry?.exerciseName ?? "Session ready to finish";

  // Typing must never be interrupted by the screen moving underneath the keyboard.
  const typing = useRef(false);

  const exercisesDone = entries.filter(
    (e) => !e.skipped && e.sets.every((s) => s.done),
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
      <div className="session training-console">
        <p className="muted">This session has no movements left.</p>
        <button className="primary" onClick={onDiscard}>
          Close session
        </button>
      </div>
    );

  return (
    <div className="session training-console">
      <header className="session-bar">
        <button
          className="icon-button"
          aria-label="Minimize workout"
          onClick={onMinimize}
        >
          <Minimize2 size={20} />
        </button>
        <div className="session-bar-title">
          <span className="console-live"><i aria-hidden="true" /> IN SESSION</span>
          <strong>{session.name}</strong>
        </div>
        <button
          className="icon-button"
          aria-label="All movements"
          onClick={() => setOverview(true)}
        >
          <List size={20} />
        </button>
      </header>

      <div className="console-telemetry">
        <div className="console-elapsed">
          <span>Elapsed time</span>
          <strong className="tabular">
            {formatClock(Math.floor(elapsed.ms / 1000))}
            {!elapsed.exact && <abbr title="Approximate"> ~</abbr>}
          </strong>
        </div>
        <div className="console-completion">
          <span className="console-completion-copy">
            <strong className="tabular">{doneSets}<span> / {plannedSets}</span></strong>
            <small>sets logged</small>
          </span>
          <div className="console-progress-ring" role="progressbar" aria-label="Sets logged" aria-valuenow={doneSets} aria-valuemin={0} aria-valuemax={plannedSets}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle className="console-ring-track" cx="32" cy="32" r="27" />
              <circle className="console-ring-value" cx="32" cy="32" r="27" pathLength="100" strokeDasharray={`${completion} 100`} />
            </svg>
            <span className="tabular">{completion}<small>%</small></span>
          </div>
        </div>
      </div>

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

      <div className="session-exercise" key={entry.entryId}>
        <div className="exercise-head">
          <div>
            <p className="eyebrow tabular">
              <span className="console-movement-index">{String(index + 1).padStart(2, "0")}</span>
              Movement {index + 1} of {entries.length}
            </p>
            <h1>{entry.exerciseName}</h1>
            <div className="console-prescription">
              <span><strong>{entry.targetReps ?? "—"}</strong> target reps</span>
              {definition && !bodyweightOnly && <span>{loadLabel(definition)}</span>}
            </div>
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

        <div className="console-set-heading">
          <span>Working sets</span>
          <span className="tabular" data-complete={entryDone === entry.sets.length}>
            {entry.skipped ? "Skipped today" : `${entryDone} / ${entry.sets.length} complete`}
          </span>
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
                <tr key={set.id} className={set.done ? "done" : ""} data-current={!entry.skipped && si === nextSetIndex ? "true" : undefined}>
                  <th scope="row" className="tabular">
                    <span className="console-set-number">{String(si + 1).padStart(2, "0")}</span>
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
                      onClick={(event) => {
                        if (set.done)
                          dispatch({
                            type: "uncompleteSet",
                            entryId: entry.entryId,
                            setId: set.id,
                          });
                        else {
                          if (!Number.isInteger(set.input?.reps) || (set.input?.reps ?? 0) < 1) {
                            setError("Enter the reps you completed before logging this set.");
                            event.currentTarget.closest("tr")?.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus();
                            return;
                          }
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
                      <Check size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="console-set-feedback" data-visible={setFeedback} role="status" aria-live="polite">
          {setFeedback ? <><Check size={14} aria-hidden="true" /> Set logged. Keep building.</> : <span>Confirm each set when you finish.</span>}
        </div>

        <div className="set-actions">
          <button
            className="primary session-add-set"
            onClick={() =>
              dispatch({
                type: "addSet",
                entryId: entry.entryId,
                setId: crypto.randomUUID(),
              })
            }
          >
            <Plus size={20} aria-hidden="true" />
            Add set
          </button>
          <div className="session-secondary-actions">
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
          Next movement
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>

      {/* The timer stays in reach while the set inputs remain available. */}
      {rest > 0 && (
        <div className="rest-strip" role="timer" aria-label={`Rest, ${rest} seconds left`}>
          <div className="console-rest-heading"><Timer size={14} aria-hidden="true" /> RECOVER</div>
          <div className="console-rest-main">
            <strong className="tabular">{formatClock(rest)}</strong>
            <div className="console-rest-actions">
              <button className="quiet" aria-label="Shorten rest by 15 seconds" onClick={() => dispatch({ type: "adjustRest", deltaSeconds: -15 })}>−15s</button>
              <button className="quiet" aria-label="Extend rest by 15 seconds" onClick={() => dispatch({ type: "adjustRest", deltaSeconds: 15 })}>+15s</button>
              <button className="quiet" onClick={() => dispatch({ type: "skipRest" })}>Skip <SkipForward size={13} aria-hidden="true" /></button>
            </div>
          </div>
          <span className="rest-next"><span>UP NEXT</span> {nextLabel}</span>
          <div className="console-rest-track" aria-hidden="true"><span style={{ width: `${Math.min(100, (rest / (session.restSeconds ?? DEFAULT_REST_SECONDS)) * 100)}%` }} /></div>
        </div>
      )}

      <div className="session-foot">
        <button className="quiet session-desktop-finish" onClick={() => setConfirmFinish(true)}>
          Finish workout
          <ArrowUpRight size={19} aria-hidden="true" />
        </button>
        <div className="session-mobile-finish">
          {doneSets > 0
            ? <SlideToFinish key={session.id} onComplete={onFinish} />
            : <button className="quiet session-empty-finish" onClick={() => setConfirmFinish(true)}>End session <ArrowUpRight size={19} aria-hidden="true" /></button>}
        </div>
        <p className="muted tabular">
          {doneSets} of {plannedSets} sets logged · Your session saves as you go
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
