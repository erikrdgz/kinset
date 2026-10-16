import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  completedSessions,
  exerciseTrend,
  findExercise,
  formatLoad,
  loadVolume,
  muscleNames,
  workingSetsByMuscle,
  type Journal,
  type Profile,
  type Unit,
} from "../../domain";

/**
 * Progress.
 *
 * The reference dashboard this borrows its shape from is a nutrition app, so only its
 * craft is taken: the period selector, the card rhythm, and values printed next to their
 * chart. Every metric here is strength training, each states how it is counted, and a
 * single session renders as a point rather than a line. Missing weeks are missing, not
 * zero.
 */
const periods = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "quarter", label: "3 months", days: 90 },
  { id: "year", label: "Year", days: 365 },
] as const;

export function Progress({
  journal,
  profile,
  exerciseId,
  onSelectExercise,
  onOpenSession,
}: {
  journal: Journal;
  profile: Profile;
  exerciseId?: string;
  onSelectExercise: (id: string | undefined) => void;
  onOpenSession: (id: string) => void;
}) {
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("month");
  const unit = profile.unit as Unit;
  const days = periods.find((p) => p.id === period)!.days;
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [days]);

  const sessions = completedSessions(journal);
  const inPeriod = sessions.filter(
    (s) => Date.parse(s.finishedAt ?? "") >= since.getTime(),
  );
  const volume = loadVolume(journal, unit, since);
  const coverage = workingSetsByMuscle(journal, since);

  // Movements the user has actually logged, most recent first.
  const logged = useMemo(() => {
    const seen = new Map<string, string>();
    for (const session of sessions)
      for (const entry of session.entries)
        if (entry.sets.some((s) => s.done) && !seen.has(entry.exerciseId))
          seen.set(entry.exerciseId, entry.exerciseName);
    return [...seen.entries()];
  }, [sessions]);

  const selected = exerciseId ?? logged[0]?.[0];
  const trend = selected
    ? exerciseTrend(journal, selected, unit)
    : { points: [], basis: "load" as const };

  if (!sessions.length)
    return (
      <div className="progress">
        <h1>Progress</h1>
        <div className="empty-inline">
          <p>
            <strong>No finished workouts yet.</strong>
          </p>
          <p className="muted">
            Charts appear once you have completed a session. One session shows as a
            single point; a trend needs a few.
          </p>
        </div>
      </div>
    );

  return (
    <div className="progress">
      <h1>Progress</h1>

      <div className="period-row" role="group" aria-label="Period">
        {periods.map((p) => (
          <button
            key={p.id}
            className={period === p.id ? "chip selected" : "chip"}
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="card">
        <h2>Sessions</h2>
        <p className="big-number tabular">{inPeriod.length}</p>
        <p className="muted">
          completed in the last {days} days. Counted once per finished session, however
          many times it syncs.
        </p>
      </section>

      <section className="card">
        <h2>Load moved</h2>
        <p className="big-number tabular">
          {volume.includedSets ? formatLoad(volume.total, unit) : "—"}
        </p>
        <p className="muted">
          {volume.includedSets} comparable set
          {volume.includedSets === 1 ? "" : "s"}
          {volume.excludedSets > 0 && `, ${volume.excludedSets} excluded`}.
        </p>
        <p className="fine">{volume.convention}</p>
      </section>

      <section className="card">
        <h2>Movement trend</h2>
        {logged.length > 1 && (
          <label className="field">
            <span className="sr-only">Movement</span>
            <select
              value={selected}
              onChange={(e) => onSelectExercise(e.target.value)}
            >
              {logged.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {trend.points.length === 0 ? (
          <p className="muted">
            No comparable sets recorded for this movement yet.
          </p>
        ) : trend.points.length === 1 ? (
          <>
            <p className="big-number tabular">
              {formatValue(trend.points[0].value, trend.basis, unit)}
            </p>
            <p className="muted">
              One session so far, on{" "}
              {new Date(trend.points[0].at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              . That is a point, not yet a trend.
            </p>
          </>
        ) : (
          <TrendChart points={trend.points} basis={trend.basis} unit={unit} />
        )}
        <p className="fine">
          {trend.basis === "reps"
            ? "Most reps in a working set per session. This movement carries no external load, so there is no weight to chart."
            : `Heaviest working set per session, converted to ${unit} for comparison. Original logs keep the unit they were recorded in.`}
        </p>
      </section>

      <section className="card">
        <h2>Muscle coverage</h2>
        {coverage.primary.size === 0 ? (
          <p className="muted">No working sets recorded in this period.</p>
        ) : (
          <ul className="coverage-list">
            {[...coverage.primary.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([muscle, count]) => {
                const max = Math.max(...coverage.primary.values());
                return (
                  <li key={muscle}>
                    <span>{muscleNames[muscle]}</span>
                    <span className="coverage-bar" aria-hidden="true">
                      <i style={{ inlineSize: `${(count / max) * 100}%` }} />
                    </span>
                    <span className="tabular">{count}</span>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="fine">{coverage.method} This describes training exposure. It is not a measure of recovery or readiness.</p>
      </section>

      <section className="card">
        <h2>History</h2>
        <ul className="history-list">
          {sessions.slice(0, 20).map((s) => {
            const done = s.entries.flatMap((e) => e.sets.filter((x) => x.done));
            return (
              <li key={s.id}>
                <button onClick={() => onOpenSession(s.id)}>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {new Date(s.finishedAt!).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </small>
                  </span>
                  <span className="tabular muted">{done.length} sets</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/**
 * A small line chart with its values printed beside it, plus a table alternative, so
 * the data is reachable without seeing the drawing. No interpolation is invented
 * between sessions — the points are the sessions.
 */
/** Renders a trend value in the unit its basis implies. */
function formatValue(value: number, basis: "load" | "reps", unit: Unit) {
  return basis === "reps" ? `${Math.round(value)} reps` : formatLoad(value, unit);
}

function TrendChart({
  points,
  basis,
  unit,
}: {
  points: Array<{ at: string; value: number }>;
  basis: "load" | "reps";
  unit: Unit;
}) {
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || 1;
  const w = 100;
  const h = 40;
  const coords = points.map((p, i) => ({
    x: (i / Math.max(points.length - 1, 1)) * w,
    y: h - ((p.value - min) / span) * h,
  }));
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = latest.value - previous.value;

  return (
    <>
      <p className="big-number tabular">
        {formatValue(latest.value, basis, unit)}
      </p>
      <p className={`delta ${delta >= 0 ? "up" : "down"} tabular`}>
        {delta === 0
          ? "Same as last session"
          : `${delta > 0 ? "+" : "−"}${formatValue(Math.abs(delta), basis, unit)} vs last session`}
      </p>
      <svg
        className="trend"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend across ${points.length} sessions, from ${formatValue(points[0].value, basis, unit)} to ${formatValue(latest.value, basis, unit)}`}
      >
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="1.8" />
        ))}
      </svg>
      <details className="trend-table">
        <summary>Show values</summary>
        <table>
          <caption className="sr-only">Best set per session</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">{basis === "reps" ? "Most reps" : "Heaviest set"}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.at}>
                <th scope="row">
                  {new Date(p.at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </th>
                <td className="tabular">{formatValue(p.value, basis, unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

export default Progress;
