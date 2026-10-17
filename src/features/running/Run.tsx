import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Footprints, Info, LockKeyhole, MapPin, Pause, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
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
import { Sheet } from "../../ui/Sheet";
import "./running.css";

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
  const [activityType, setActivityType] = useState<RunActivity["type"]>("run");

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
      <div className="run-live running-studio running-active">
        <header className="running-live-header">
          <div><h1>{activity.title}<span className="orange-dot">.</span></h1></div>
          <span className="running-status" data-paused={paused}><i aria-hidden="true" />{paused ? "Paused" : recorder.state === "acquiring" ? "Finding GPS" : recorder.error ? "GPS unavailable" : "Recording"}</span>
        </header>

        {/* Distance is the headline; everything else is support. */}
        <div className="running-live-instrument">
        <div className="running-distance-surface">
        <div className="running-distance-label">Distance covered</div>
        <p className="run-figure tabular" aria-live="off">
          {(track.distance / (unit === "km" ? 1000 : 1609.344)).toFixed(2)}
          <small>{unit.toUpperCase()}</small>
        </p>
        </div>

        <div className="running-seam">
          <span>{paused ? "Resume recording" : "Pause recording"}</span>
          <button className="running-seam-control" onClick={paused ? recorder.resume : recorder.pause} aria-label={paused ? "Resume recording" : "Pause recording"}>
            {paused ? <Play size={24} fill="currentColor" aria-hidden="true" /> : <Pause size={24} fill="currentColor" aria-hidden="true" />}
          </button>
        </div>

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
        </div>

        {recorder.error && (
          <p className="notice-inline" role="alert"><Info size={18} aria-hidden="true" /><span>{recorderErrorText[recorder.error]}</span></p>
        )}

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

        <div className="running-route-heading"><span><MapPin size={14} aria-hidden="true" /> Your route</span><small>{paused ? "PAUSED" : recorder.error ? "GPS UNAVAILABLE" : "LIVE RECORDING"}</small></div>
        <RouteMap samples={activity.samples} className="run-live-map" />
        <p className="running-live-note">Keep Kinset open and your screen on while recording.</p>

        <div className="run-controls">
          {/* Finish is deliberately separated from pause. */}
          <button
            className="quiet running-finish"
            onClick={async () => {
              const finished = await recorder.finish();
              if (finished) {
                setHistory(await loadRuns(owner));
                setViewing(finished);
              }
            }}
          >
            <Square size={18} aria-hidden="true" />
              Finish {activity.type}
          </button>
        </div>
        <button className="quiet danger run-discard" onClick={recorder.discard}>
          Discard this run
        </button>
      </div>
    );
  }

  return (
    <div className="run running-studio">
      <header className="editorial-heading"><div><h1>Run<span className="orange-dot">.</span></h1></div></header>

      <div className="running-launch">
        <div className="running-editorial">
          <img src={`${import.meta.env.BASE_URL}images/editorial/running.jpg`} alt="Runner training outdoors" />
          <div className="running-editorial-copy"><h2>{activityType === "run" ? "Run" : "Walk"}<br />outside<span>.</span></h2><p>Distance. Time. Pace.</p></div>
        </div>

        <div className="running-seam running-start-seam"><span>Start {activityType}</span><button className="running-seam-control" onClick={() => recorder.start(activityType)} aria-label={`Start a ${activityType} with GPS`}><Play size={25} fill="currentColor" aria-hidden="true" /></button></div>
        <div className="running-launch-panel">
          <div className="running-mode" role="group" aria-label="Activity type"><button aria-pressed={activityType === "run"} onClick={() => setActivityType("run")}>Run</button><button aria-pressed={activityType === "walk"} onClick={() => setActivityType("walk")}>Walk</button></div>

      {recorder.error && (
        <p className="notice-inline" role="alert">
          <Info size={18} aria-hidden="true" />
          <span>{recorderErrorText[recorder.error]}</span>
        </p>
      )}

          <div className="running-recording-note" role="note"><Info size={15} aria-hidden="true" /><p>Keep Kinset open and your screen on while recording. Locking the phone can interrupt your route.</p></div>
          <p className="running-privacy"><LockKeyhole size={13} aria-hidden="true" /><span>Location starts when you do. Routes stay on this device.</span></p>
        </div>
      </div>

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

      <div className="running-history-heading"><div><h2>Activity <span className="tabular">{String(history.length).padStart(2, "0")}</span></h2></div><button className="quiet" onClick={() => setManual(true)}><Plus size={17} aria-hidden="true" /> Add a run</button></div>
      {history.length === 0 ? (
        <div className="empty-inline running-empty">
          <div><strong>No activities yet.</strong><p>Record a run or walk, or add one you have finished.</p></div>
        </div>
      ) : (
        <ul className="rule-list running-history">
          {history.map((activity) => {
            const metres = runDistance(activity);
            const seconds = activeSeconds(activity);
            return (
              <li key={activity.id}>
                <button onClick={() => setViewing(activity)}>
                  <span className="rule-index tabular">
                    {activity.source === "manual" ? <Pencil size={16} aria-label="Entered by hand" /> : <Footprints size={18} aria-label="Recorded" />}
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
                    <strong>{formatDistance(metres, unit)}</strong><small>{formatClock(seconds)}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
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
    <div className="run-summary running-studio running-record">
      <button className="quiet back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> All activity
      </button>
      <h1>{activity.title}</h1>
      <p className="muted">
        {new Date(activity.startedAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      <dl className="summary-stats running-summary-stats">
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
          <div className="running-route-heading"><span><MapPin size={14} aria-hidden="true" /> Your route</span><small>{trim ? "ENDS HIDDEN" : "FULL ROUTE"}</small></div>
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
                Hides points within 150 m of either end, including return passes. This reduces location exposure; it does not make your route anonymous.
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
    <Sheet title="Add a run" onClose={onClose}>
    <section className="running-manual">
      <p className="running-manual-intro">Log a completed run using its distance and time.</p>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </label>
      <div className="running-manual-numbers"><label className="field">
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
      </label></div>
      {error && (
        <p role="alert" className="session-error">
          {error}
        </p>
      )}
      <p className="fine">
        Pace is calculated from your distance and time. No route is added.
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
    </Sheet>
  );
}

export default Run;
