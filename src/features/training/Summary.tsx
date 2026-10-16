import { Check } from "lucide-react";
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
    <div className="summary">
      <div className="summary-mark" aria-hidden="true">
        <Check size={28} />
      </div>
      <h1>{session.name}</h1>
      <p className="muted">
        {new Date(session.finishedAt ?? session.startedAt).toLocaleDateString(
          undefined,
          { weekday: "long", month: "long", day: "numeric" },
        )}
      </p>

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

      {volume.excludedSets > 0 && (
        <p className="fine">
          {volume.excludedSets} set{volume.excludedSets === 1 ? " is" : "s are"} left
          out of that total. {volume.convention}
        </p>
      )}

      {records.length > 0 && (
        <section>
          <h2>Best so far</h2>
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

      <section>
        <h2>What you did</h2>
        <ul className="summary-list">
          {session.entries.map((entry) => {
            const done = entry.sets.filter((s) => s.done);
            return (
              <li key={entry.entryId}>
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
                          ? `${s.performed.load}×${s.performed.reps}`
                          : `${s.performed?.reps ?? 0} reps`,
                      )
                      .join("  ·  ")}
                  </p>
                )}
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
        </button>
        <button className="quiet" onClick={onViewHistory}>
          View all history
        </button>
      </div>
    </div>
  );
}

export default Summary;
