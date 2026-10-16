import { useEffect, useMemo, useState } from "react";
import { Footprints, Info, Pause, Play, Square, Trash2 } from "lucide-react";
import {
  activeSeconds,
  averagePace,
  buildTrack,
  formatClock,
  formatDistance,
  formatPace,
  newRun,
  runDistance,
  splits,
  trimForSharing,
  type DistanceUnit,
  type RunActivity,
} from "../../domain/running";
import { useRunRecorder, recorderErrorText } from "./useRecorder";
import { commitRun, deleteRun, loadRuns } from "../../data/runs";
import { RouteMap } from "../../ui/RouteMap";

/** One ticking clock for the screen rather than one per metric. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Running.
 *
 * The honest position, stated on the screen rather than buried: this records while the
 * app is open and in front of you. Browsers are permitted to stop delivering positions
 * to a hidden page, so a pocketed phone with a locked screen is not something this can
 * promise. Reliable screen-locked recording needs a native recorder, and the brief gates
 * that on a field-test matrix across real devices.
 *
 * Everything else is real: filtered samples, measured distance, splits, pause intervals,
 * a route drawn from the data, and privacy trimming before anything is shared.
 */
export function Run({
  owner,
  unit,
}: {
  owner: string;
  unit: DistanceUnit;
}) {
  const recorder = useRunRecorder(owner);
  const [history, setHistory] = useState<RunActivity[]>([]);
  const [viewing, setViewing] = useState<RunActivity | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    void loadRuns(owner).then(setHistory);
  }, [owner]);

  const recording = recorder.state === "recording" || recorder.state === "acquiring";
  const now = useNow(recording);

  if (viewing)
    return (
      <RunSummary
        activity={viewing}
        unit={unit}
        onBack={() => setViewing(null)}
        onDelete={async () => {
          setHistory(await deleteRun(owner, viewing.id));
          setViewing(null);
        }}
      />
    );

  if (recorder.activity) {
    const activity = recorder.activity;
    const track = buildTrack(activity.samples);
    const seconds = activeSeconds(activity, now);
    const paused = recorder.state === "paused";

    return (
      <div className="run-live">
        <p className="eyebrow">{paused ? "Paused" : activity.title}</p>

        {/* Distance is the headline; everything else is support. */}
        <p className="run-figure tabular" aria-live="off">
          {(track.distance / (unit === "km" ? 1000 : 1609.344)).toFixed(2)}
          <small>{unit.toUpperCase()}</small>
        </p>

        <dl className="run-metrics">
          <div>
            <dt>Time</dt>
            <dd className="tabular">{formatClock(seconds)}</dd>
          </div>
          <div>
            <dt>Avg pace</dt>
            <dd className="tabular">
              {formatPace(averagePace(track.distance, seconds, unit), unit)}
            </dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd className="tabular">
              {recorder.accuracy ? `±${Math.round(recorder.accuracy)} m` : "—"}
            </dd>
          </div>
        </dl>

        {recorder.state === "acquiring" && (
          <p className="notice-inline" role="status">
            <Info size={18} aria-hidden="true" />
            <span>Waiting for a position. This can take a moment outdoors.</span>
          </p>
        )}

        {recorder.wasInterrupted && (
          <p className="notice-inline" role="status">
            <Info size={18} aria-hidden="true" />
            <span>
              Kinset was in the background. Your browser may have stopped recording
              during that time, so this route may have a gap.
            </span>
          </p>
        )}

        {track.gaps.length > 0 && (
          <p className="fine">
            {track.gaps.length} break{track.gaps.length === 1 ? "" : "s"} in reception
            so far. Distance covered during a break is not counted.
          </p>
        )}

        <RouteMap samples={activity.samples} className="run-live-map" />

        <div className="run-controls">
          {paused ? (
            <button className="primary big" onClick={recorder.resume}>
              <Play size={20} aria-hidden="true" />
              Resume
            </button>
          ) : (
            <button className="quiet big" onClick={recorder.pause}>
              <Pause size={20} aria-hidden="true" />
              Pause
            </button>
          )}
          {/* Finish is deliberately separated from pause. */}
          <button
            className={paused ? "quiet" : "quiet"}
            onClick={async () => {
              const finished = await recorder.finish();
              if (finished) {
                setHistory(await loadRuns(owner));
                setViewing(finished);
              }
            }}
          >
            <Square size={18} aria-hidden="true" />
            Finish
          </button>
        </div>
        <button className="quiet danger run-discard" onClick={recorder.discard}>
          Discard this run
        </button>
      </div>
    );
  }

  return (
    <div className="run">
      <h1>Run</h1>

      <section className="notice-inline" role="note">
        <Info size={18} aria-hidden="true" />
        <div>
          <strong>Recording needs the app open and on screen.</strong>
          <p>
            Browsers are allowed to stop sending location to a hidden page, so a locked
            phone in a pocket will not record reliably. Screen-locked tracking needs a
            native app, which is not built yet. Until then, keep Kinset in front of you
            or enter the run by hand afterwards.
          </p>
        </div>
      </section>

      {recorder.error && (
        <p className="notice-inline" role="alert">
          <Info size={18} aria-hidden="true" />
          <span>{recorderErrorText[recorder.error]}</span>
        </p>
      )}

      <div className="run-start-options">
        <button className="primary big" onClick={() => recorder.start("run")}>
          <Footprints size={20} aria-hidden="true" />
          Start a run
        </button>
        <button className="quiet" onClick={() => recorder.start("walk")}>
          Start a walk
        </button>
        <button className="quiet" onClick={() => setManual(true)}>
          Add a run by hand
        </button>
      </div>

      <p className="fine">
        Location is only requested when you start, never during sign-up. Routes stay on
        this device unless you choose to share one.
      </p>

      {manual && (
        <ManualRun
          owner={owner}
          unit={unit}
          onClose={() => setManual(false)}
          onSaved={async () => {
            setHistory(await loadRuns(owner));
            setManual(false);
          }}
        />
      )}

      <h2>Your runs</h2>
      {history.length === 0 ? (
        <div className="empty-inline">
          <p>
            <strong>No runs recorded yet.</strong>
          </p>
          <p className="muted">
            Recorded and hand-entered runs both appear here, alongside your strength
            sessions in Progress.
          </p>
        </div>
      ) : (
        <ul className="rule-list">
          {history.map((activity) => {
            const metres = runDistance(activity);
            const seconds = activeSeconds(activity);
            return (
              <li key={activity.id}>
                <button onClick={() => setViewing(activity)}>
                  <span className="rule-index tabular">
                    {activity.source === "manual" ? "⌨" : "▸"}
                  </span>
                  <span className="rule-name">
                    <strong>{activity.title}</strong>
                    <small>
                      {new Date(activity.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {activity.source === "manual" ? " · entered by hand" : ""}
                    </small>
                  </span>
                  <span className="rule-value tabular">
                    {formatDistance(metres, unit)} · {formatClock(seconds)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** A completed activity: route, the numbers, splits and what was not captured. */
function RunSummary({
  activity,
  unit,
  onBack,
  onDelete,
}: {
  activity: RunActivity;
  unit: DistanceUnit;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [trim, setTrim] = useState(true);
  const track = buildTrack(activity.samples);
  const metres = runDistance(activity);
  const seconds = activeSeconds(activity);
  const pieces = useMemo(() => splits(activity, unit), [activity, unit]);
  const rejected = Object.values(activity.rejected).reduce((n, v) => n + (v ?? 0), 0);

  return (
    <div className="run-summary">
      <button className="quiet back" onClick={onBack}>
        Back
      </button>
      <h1>{activity.title}</h1>
      <p className="muted">
        {new Date(activity.startedAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      <dl className="summary-stats">
        <div>
          <dt>Distance</dt>
          <dd className="tabular">{formatDistance(metres, unit)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd className="tabular">{formatClock(seconds)}</dd>
        </div>
        <div>
          <dt>Avg pace</dt>
          <dd className="tabular">
            {formatPace(averagePace(metres, seconds, unit), unit)}
          </dd>
        </div>
      </dl>

      {activity.source === "manual" ? (
        <p className="fine">
          Entered by hand. There is no recorded route, and the distance is the figure you
          typed rather than a measured one.
        </p>
      ) : (
        <>
          <RouteMap
            samples={
              trim ? trimForSharing(activity.samples, 150) : activity.samples
            }
            className="run-summary-map"
          />
          <label className="run-trim">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
            />
            <span>
              Hide the area around my start and finish
              <small>
                Removes every point within 150 m of either end, including where the route
                passes back through them. This reduces what a shared route reveals; it
                cannot make it anonymous.
              </small>
            </span>
          </label>

          {activity.foregroundOnly && (
            <p className="fine">
              Recorded in the browser with Kinset on screen. If the app was backgrounded
              at any point, that stretch may be missing.
            </p>
          )}
          {rejected > 0 && (
            <p className="fine">
              {rejected} position{rejected === 1 ? "" : "s"} were discarded as too
              inaccurate or physically impossible, so they do not contribute to the
              distance.
            </p>
          )}
          {track.gaps.length > 0 && (
            <p className="fine">
              {track.gaps.length} break{track.gaps.length === 1 ? "" : "s"} in
              reception. The distance covered during a break is not included above.
            </p>
          )}
        </>
      )}

      {pieces.length > 0 && (
        <section>
          <h2>Splits</h2>
          <table className="splits-table">
            <caption className="sr-only">
              Pace per {unit === "km" ? "kilometre" : "mile"}
            </caption>
            <thead>
              <tr>
                <th scope="col">{unit === "km" ? "Km" : "Mi"}</th>
                <th scope="col">Time</th>
                <th scope="col">Pace</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((split) => (
                <tr key={split.index}>
                  <th scope="row" className="tabular">
                    {split.index}
                    {split.partial && <span className="muted"> (part)</span>}
                  </th>
                  <td className="tabular">{formatClock(split.seconds)}</td>
                  <td className="tabular">
                    {formatPace(split.paceSecondsPerUnit, unit)}
                    {split.spansGap && (
                      <abbr title="Reception was lost during this split, so its pace is unreliable">
                        {" "}
                        †
                      </abbr>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <button className="quiet danger" onClick={onDelete}>
        <Trash2 size={16} aria-hidden="true" />
        Delete this run and its route
      </button>
    </div>
  );
}

/** Hand-entered activity, for a run recorded on something else or not at all. */
function ManualRun({
  owner,
  unit,
  onClose,
  onSaved,
}: {
  owner: string;
  unit: DistanceUnit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [title, setTitle] = useState("Run");
  const [error, setError] = useState("");

  return (
    <section className="card">
      <h2>Add a run by hand</h2>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </label>
      <label className="field">
        <span>Distance ({unit})</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Time (minutes)</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="session-error">
          {error}
        </p>
      )}
      <p className="fine">
        A hand-entered run has no route and no measured pace beyond what these two
        numbers imply. It is kept separate from recorded runs in your history.
      </p>
      <button
        className="primary"
        onClick={async () => {
          const d = Number(distance);
          const m = Number(minutes);
          if (!(d > 0) || !(m > 0)) {
            setError("Enter a distance and a time greater than zero.");
            return;
          }
          const run = newRun("run", "manual");
          await commitRun(owner, {
            ...run,
            title: title.trim() || "Run",
            finishedAt: new Date().toISOString(),
            manualDistance: d * (unit === "km" ? 1000 : 1609.344),
            manualSeconds: m * 60,
          });
          onSaved();
        }}
      >
        Save run
      </button>
      <button className="quiet" onClick={onClose}>
        Cancel
      </button>
    </section>
  );
}

export default Run;
