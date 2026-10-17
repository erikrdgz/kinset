import { ArrowUpRight, Check } from "lucide-react";
import {
  activeDuration,
  exerciseBest,
  formatDuration,
  formatBest,
  formatLoad,
  loadVolume,
  type Journal,
  type Session2,
  type Unit,
} from "../../domain";
import "./session.css";

/**
 * The session summary.
 *
 * One restrained moment of completion, then facts. Partial completion is shown
 * neutrally — a session where four of six movements were done is a workout, not a
 * failure — and every derived number states its rule, because a total that silently
 * mixes bodyweight holds, machine settings and dumbbell loads is not a total.
 */
export function Summary({
  session,
  journal,
  onDone,
  onViewHistory,
}: {
  session: Session2;
  journal: Journal;
  onDone: () => void;
  onViewHistory: () => void;
}) {
  const unit = session.unit as Unit;
  const elapsed = activeDuration(session);
  const completed = session.entries.flatMap((e) => e.sets.filter((s) => s.done));
  const planned = session.entries.flatMap((e) => e.sets);
  const skippedExercises = session.entries.filter(
    (e) => e.skipped || !e.sets.some((s) => s.done),
  );
  const volume = loadVolume({ ...journal, sessions: [session] }, unit);

  // A record only counts if it survives comparison against the whole history.
  const records = session.entries
    .map((entry) => {
      const best = exerciseBest(journal, entry.exerciseId, unit);
      if (!best) return null;
      const inThisSession = entry.sets.some(
        (s) => s.done && s.completedAt === best.set.at,
      );
      return inThisSession ? { name: entry.exerciseName, best } : null;
    })
    .filter(Boolean) as Array<{
    name: string;
    best: NonNullable<ReturnType<typeof exerciseBest>>;
  }>;

  return (
    <div className="summary training-summary">
      <header className="summary-hero">
        <div className="summary-save-state">
        <div className="summary-mark" aria-hidden="true">
          <Check size={17} />
        </div>
        <p className="eyebrow">Session saved</p>
        </div>
        <h1>{session.name}</h1>
        <p className="muted">
          {new Date(session.finishedAt ?? session.startedAt).toLocaleDateString(
            undefined,
            { weekday: "long", month: "long", day: "numeric" },
          )}
        </p>
      </header>

      <div className="summary-performance">
      <dl className="summary-stats">
        <div>
          <dt>Sets logged</dt>
          <dd className="tabular">
            {completed.length}
            <small>of {planned.length} planned</small>
          </dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd className="tabular">
            {formatDuration(elapsed.ms)}
            {!elapsed.exact && <small>approximate</small>}
          </dd>
        </div>
        <div>
          <dt>Load moved</dt>
          <dd className="tabular">
            {volume.includedSets ? formatLoad(volume.total, unit) : "—"}
            <small>
              {volume.includedSets
                ? `${volume.includedSets} comparable set${volume.includedSets === 1 ? "" : "s"}`
                : "nothing comparable to total"}
            </small>
          </dd>
        </div>
      </dl>
      <div className="summary-completion-track" role="progressbar" aria-label="Planned sets logged" aria-valuemin={0} aria-valuemax={planned.length} aria-valuenow={completed.length}>
        <span style={{ width: `${planned.length ? completed.length / planned.length * 100 : 0}%` }} />
      </div>
      </div>

      {volume.excludedSets > 0 && (
        <details className="summary-volume-note">
          <summary>About your load total</summary>
          <p className="fine">
          {volume.excludedSets} set{volume.excludedSets === 1 ? " is" : "s are"} left
          out of that total. {volume.convention}
          </p>
        </details>
      )}

      {records.length > 0 && (
        <section className="summary-records">
          <div className="training-section-heading"><h2>Best so far</h2><span className="tabular">{records.length} {records.length === 1 ? "record" : "records"}</span></div>
          <ul className="record-list">
            {records.map((r) => (
              <li key={r.name}>
                <strong>{r.name}</strong>
                <span className="tabular">{formatBest(r.best, unit)}</span>
              </li>
            ))}
          </ul>
          <p className="fine">
            Compared against sets of the same movement recorded the same way. It will be
            recalculated if you edit or delete this session.
          </p>
        </section>
      )}

      <section className="summary-breakdown">
        <div className="training-section-heading"><h2>The work</h2><span>{session.unit.toUpperCase()} · reps</span></div>
        <ul className="summary-list">
          {session.entries.map((entry, i) => {
            const done = entry.sets.filter((s) => s.done);
            return (
              <li key={entry.entryId} data-logged={done.length > 0}>
                <span className="summary-movement-index tabular" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div className="summary-movement-content">
                <div className="summary-row">
                  <strong>{entry.exerciseName}</strong>
                  <span className="tabular muted">
                    {entry.skipped
                      ? "Skipped"
                      : `${done.length}/${entry.sets.length} sets`}
                  </span>
                </div>
                {done.length > 0 && (
                  <p className="tabular summary-sets">
                    {done
                      .map((s) =>
                        s.performed?.load
                          ? `${formatLoad(s.performed.load, unit)} × ${s.performed.reps}`
                          : `${s.performed?.reps ?? 0} ${s.performed?.reps === 1 ? "rep" : "reps"}`,
                      )
                      .join("  ·  ")}
                  </p>
                )}
                </div>
              </li>
            );
          })}
        </ul>
        {skippedExercises.length > 0 && session.plannedDetailAvailable && (
          <p className="fine">
            {skippedExercises.length} movement
            {skippedExercises.length === 1 ? "" : "s"} went unlogged. They stay in the
            record so this session reads accurately later.
          </p>
        )}
      </section>

      <div className="summary-actions">
        <button className="primary" onClick={onDone}>
          Done
          <Check size={18} aria-hidden="true" />
        </button>
        <button className="quiet" onClick={onViewHistory}>
          View history <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Summary;
