import { useId, useMemo, useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  activeDuration,
  completedSessions,
  exerciseTrend,
  formatDuration,
  formatLoad,
  loadVolume,
  muscleNames,
  workingSetsByMuscle,
  type Journal,
  type Profile,
  type Unit,
} from "../../domain";
import { bodyWeightKg, ENERGY_METHOD, estimateTrainingEnergy, type EnergyEstimate } from "../../domain/energy";
import { CountUp } from "../../ui/Motion";
import "./progress.css";

const periods = [
  { id: "week", label: "Week", days: 7, buckets: 7 },
  { id: "month", label: "Month", days: 30, buckets: 10 },
  { id: "quarter", label: "3 months", days: 90, buckets: 13 },
  { id: "year", label: "Year", days: 365, buckets: 12 },
] as const;
type Period = (typeof periods)[number]["id"];
type TrendPoint = { at: string; value: number };
type FrequencyBucket = { start: Date; end: Date; count: number; label: string };
const dayMs = 86400000;
const shortDate = (at: string | number | Date) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function Progress({ journal, profile, exerciseId, onSelectExercise, onOpenSession, onProfileChange }: {
  journal: Journal;
  profile: Profile;
  exerciseId?: string;
  onSelectExercise: (id: string | undefined) => void;
  onOpenSession: (id: string) => void;
  onProfileChange?: (next: Profile) => void;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const unit = profile.unit as Unit;
  const settings = periods.find((p) => p.id === period)!;
  // Calendar days, including today. All cards use the same window.
  // Derive the day on each render so a journal update after midnight advances the window.
  const until = new Date();
  until.setHours(24, 0, 0, 0);
  const since = new Date(until);
  since.setDate(since.getDate() - settings.days);
  const previousSince = new Date(since);
  previousSince.setDate(previousSince.getDate() - settings.days);
  const sessions = useMemo(() => completedSessions(journal).sort((a, b) => Date.parse(b.finishedAt ?? "") - Date.parse(a.finishedAt ?? "")), [journal]);
  const inPeriod = sessions.filter((s) => Date.parse(s.finishedAt ?? "") >= since.getTime() && Date.parse(s.finishedAt ?? "") < until.getTime());
  const previousSessions = sessions.filter((s) => Date.parse(s.finishedAt ?? "") >= previousSince.getTime() && Date.parse(s.finishedAt ?? "") < since.getTime());
  const periodJournal = { ...journal, sessions: inPeriod };
  // Attribute every set to its completed session, including sessions crossing midnight.
  const energy = estimateTrainingEnergy(periodJournal, profile);
  const volume = loadVolume(periodJournal, unit);
  const coverage = workingSetsByMuscle(periodJournal);
  const currentTraining = summarizeTraining(inPeriod);
  const previousTraining = summarizeTraining(previousSessions);

  const logged = useMemo(() => {
    const seen = new Map<string, string>();
    for (const session of sessions)
      for (const entry of session.entries)
        if (entry.sets.some((s) => s.done) && !seen.has(entry.exerciseId))
          seen.set(entry.exerciseId, entry.exerciseName);
    return [...seen.entries()];
  }, [sessions]);
  const selected = logged.some(([id]) => id === exerciseId) ? exerciseId : logged[0]?.[0];
  const rawTrend = selected ? exerciseTrend(journal, selected, unit) : { points: [], basis: "load" as const };
  const trend = { ...rawTrend, points: rawTrend.points.filter((point) => Date.parse(point.at) >= since.getTime() && Date.parse(point.at) < until.getTime()) };
  const coverageEntries = [...coverage.primary.entries()].sort((a, b) => b[1] - a[1]);
  const maxCoverage = Math.max(1, ...coverage.primary.values());
  const frequency = Array.from({ length: settings.buckets }, (_, index) => {
    const start = new Date(since);
    const end = new Date(since);
    start.setDate(start.getDate() + Math.floor(index * settings.days / settings.buckets));
    end.setDate(end.getDate() + Math.floor((index + 1) * settings.days / settings.buckets));
    return {
      start,
      end,
      count: inPeriod.filter((s) => Date.parse(s.finishedAt!) >= start.getTime() && Date.parse(s.finishedAt!) < end.getTime()).length,
      label: settings.id === "week" ? start.toLocaleDateString(undefined, { weekday: "narrow" }) : shortDate(start),
    };
  });

  return (
    <div className="progress">
      <header className="prog-heading">
        <div>
          <h1>Your progress<span>.</span></h1>
        </div>
      </header>
      <div className="prog-period" role="group" aria-label="Progress period" style={{ "--period-index": periods.findIndex((p) => p.id === period) } as CSSProperties}>
        <span className="prog-period-indicator" aria-hidden="true" />
        {periods.map((p) => <button key={p.id} aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
      </div>
      <div className="prog-window"><span>{shortDate(since)} — {shortDate(until.getTime() - 1)}</span><span>Strength training</span></div>

      <div className="prog-content" key={period}>
        <EnergyPanel energy={energy} profile={profile} onProfileChange={onProfileChange} />
        <TrainingInstrument current={currentTraining} previous={previousTraining} buckets={frequency} days={settings.days} previousSince={previousSince} since={since} until={until} />

        <section className="prog-panel prog-load" data-reveal aria-labelledby="load-heading">
          <div className="prog-panel-heading"><h2 id="load-heading">Load moved</h2><span className="prog-mini-label">TOTAL EXTERNAL LOAD</span></div>
          {volume.includedSets > 0 ? <>
            <div className="prog-load-value"><strong><CountUp value={volume.total} decimals={volume.total % 1 ? 1 : 0} /></strong><span>{unit}</span></div>
            <div className="prog-load-baseline" aria-hidden="true" />
            <div className="prog-load-caption"><span>{volume.includedSets} comparable {volume.includedSets === 1 ? "set" : "sets"}</span>{volume.excludedSets > 0 && <span>{volume.excludedSets} excluded</span>}</div>
          </> : <p className="prog-load-empty">No comparable weighted sets in this period.</p>}
          <details className="prog-definition"><summary>How this is counted<ChevronDown size={14} /></summary>{volume.includedSets === 0 && volume.excludedSets > 0 && <p>{volume.excludedSets} {volume.excludedSets === 1 ? "set excluded" : "sets excluded"} from this total.</p>}<p>{volume.convention}</p></details>
        </section>

        <section className="prog-panel prog-movement" data-reveal aria-labelledby="movement-heading">
          <div className="prog-panel-heading"><h2 id="movement-heading">Movement trend</h2></div>
          {logged.length > 0 && <label className="prog-movement-select"><span className="sr-only">Movement to chart</span><select value={selected} onChange={(event) => onSelectExercise(event.target.value)}>{logged.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>}
          {trend.points.length > 0 ? <TrendChart key={`${selected}-${period}`} points={trend.points} basis={trend.basis} unit={unit} /> : <div className="prog-chart-empty"><strong>{sessions.length ? "No comparable sets this period." : "No working sets recorded."}</strong><p>{sessions.length ? "Choose another period or movement to see your recorded sets." : "Complete working sets to compare weight or reps across sessions."}</p></div>}
          <details className="prog-definition"><summary>About this trend<ChevronDown size={14} /></summary><p>{trend.basis === "reps" ? "Most reps in a working set per session. This movement carries no external load." : `Heaviest comparable working set per session in ${unit}. Your original logged units are preserved.`} Each point is one recorded session, positioned by date.</p></details>
        </section>

        <section className="prog-panel prog-coverage" data-reveal aria-labelledby="coverage-heading">
          <div className="prog-panel-heading"><h2 id="coverage-heading">Training balance</h2><span className="prog-mini-label">PRIMARY MUSCLES</span></div>
          {coverageEntries.length === 0 ? <p className="prog-empty-note">Muscle coverage appears as you complete working sets.</p> : <ul className="prog-coverage-list">{coverageEntries.map(([muscle, count], index) => <li key={muscle}><div><span>{muscleNames[muscle]}</span><span className="tabular">{count}<small> {count === 1 ? "set" : "sets"}</small></span></div><span className="prog-coverage-track" aria-hidden="true"><i style={{ width: `${count / maxCoverage * 100}%`, "--bar-delay": `${index * 45}ms` } as CSSProperties} /></span></li>)}</ul>}
          <details className="prog-definition"><summary>What this tells you<ChevronDown size={14} /></summary><p>{coverage.method} This shows training exposure, not recovery or readiness.</p></details>
        </section>

        <section className="prog-history" data-reveal aria-labelledby="history-heading">
          <div className="prog-panel-heading"><h2 id="history-heading">Session archive</h2><span className="prog-archive-count">{inPeriod.length.toString().padStart(2, "0")}</span></div>
          {inPeriod.length ? <ul>{inPeriod.slice(0, 20).map((session) => {
            const done = session.entries.flatMap((entry) => entry.sets.filter((set) => set.done));
            const movements = session.entries.filter((entry) => entry.sets.some((set) => set.done)).length;
            const date = new Date(session.finishedAt!);
            return <li key={session.id}><button onClick={() => onOpenSession(session.id)}><span className="prog-history-date"><strong>{date.getDate().toString().padStart(2, "0")}</strong><span>{date.toLocaleDateString(undefined, { month: "short" })}</span></span><span className="prog-history-copy"><strong>{session.name}</strong><small>{done.length} {done.length === 1 ? "set" : "sets"} · {movements} {movements === 1 ? "movement" : "movements"}</small></span><ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" /></button></li>;
          })}</ul> : <p className="prog-empty-note">No finished sessions in this period.</p>}
          {inPeriod.length > 20 && <p className="prog-history-note">Showing your 20 most recent sessions in this period.</p>}
        </section>
      </div>
    </div>
  );
}

function summarizeTraining(sessions: Journal["sessions"]) {
  const durations = sessions.map((session) => activeDuration(session));
  return {
    sessions: sessions.length,
    sets: sessions.reduce((count, session) => count + session.entries.reduce((total, entry) => total + entry.sets.filter((set) => set.done && set.setType === "working").length, 0), 0),
    duration: durations.reduce((sum, value) => sum + value.ms, 0),
    approximate: durations.some((value) => !value.exact),
    days: new Set(sessions.map((session) => new Date(session.finishedAt!).toLocaleDateString())).size,
  };
}

function TrainingInstrument({ current, previous, buckets, days, previousSince, since, until }: {
  current: ReturnType<typeof summarizeTraining>;
  previous: ReturnType<typeof summarizeTraining>;
  buckets: FrequencyBucket[];
  days: number;
  previousSince: Date;
  since: Date;
  until: Date;
}) {
  const [comparing, setComparing] = useState(false);
  const comparisonId = useId();
  const hours = current.duration >= 3600000;
  const dateRange = (start: Date, end: Date) => `${shortDate(start)} – ${shortDate(end.getTime() - 1)}`;
  const durationText = (snapshot: typeof current) => `${snapshot.approximate ? "~" : ""}${formatDuration(snapshot.duration)}`;
  return <section className="prog-training-suite" data-reveal aria-labelledby="frequency-heading">
    <div className="prog-training-body">
      <div className="prog-panel prog-frequency">
        <div className="prog-panel-heading"><h2 id="frequency-heading">Training<br />frequency<span>.</span></h2></div>
        <div className="prog-frequency-intro">
          <div className="prog-value"><strong><CountUp value={current.sessions} /></strong><span>{current.sessions === 1 ? "session" : "sessions"}<br />completed</span></div>
          {previous.sessions > 0 && <span className="prog-comparison">{current.sessions > previous.sessions ? <ArrowUpRight size={15} /> : current.sessions < previous.sessions ? <ArrowDownRight size={15} /> : null}{current.sessions === previous.sessions ? "No change" : Math.abs(current.sessions - previous.sessions)} <span>vs previous period</span></span>}
        </div>
        {current.sessions > 0 ? <FrequencyChart buckets={buckets} empty={false} /> : <p className="prog-frequency-empty">No completed sessions in this period. Finish a workout or choose another period.</p>}
      </div>
      <div className="prog-training-seam">
        <span>Compare periods</span>
        <button className="prog-seam-control" onClick={() => setComparing(!comparing)} aria-expanded={comparing} aria-controls={comparisonId} aria-label={comparing ? "Hide period comparison" : "Show period comparison"}><Plus size={25} strokeWidth={1.6} aria-hidden="true" /></button>
      </div>
      <div className="prog-metrics">
        <section className="prog-mini-stat"><strong><CountUp value={current.sets} /></strong><span>Working sets</span></section>
        <section className="prog-mini-stat"><strong title={durationText(current)}>{current.approximate && <small>~</small>}<CountUp value={hours ? current.duration / 3600000 : Math.round(current.duration / 60000)} decimals={hours ? 1 : 0} /><small>{hours ? " h" : " min"}</small></strong><span>{current.approximate ? "Approx. training time" : "Active training time"}</span></section>
        <section className="prog-mini-stat prog-days-stat"><strong><CountUp value={current.days} /><small>/{days}</small></strong><span>Days trained</span></section>
      </div>
    </div>
    <div id={comparisonId} className="prog-period-breakdown" hidden={!comparing}>
      <table>
        <caption>Period comparison</caption>
        <thead><tr><th scope="col"><span className="sr-only">Metric</span></th><th scope="col">Current<span>{dateRange(since, until)}</span></th><th scope="col">Previous<span>{dateRange(previousSince, since)}</span></th></tr></thead>
        <tbody>
          <tr><th scope="row">Sessions</th><td>{current.sessions}</td><td>{previous.sessions}</td></tr>
          <tr><th scope="row">Working sets</th><td>{current.sets}</td><td>{previous.sets}</td></tr>
          <tr><th scope="row">Training time</th><td>{durationText(current)}</td><td>{durationText(previous)}</td></tr>
          <tr><th scope="row">Days trained</th><td>{current.days}</td><td>{previous.days}</td></tr>
        </tbody>
      </table>
      {(current.approximate || previous.approximate) && <p>~ Time includes sessions with approximate duration.</p>}
    </div>
  </section>;
}

function energyScale(value: number) {
  if (value <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].find((step) => step * power >= value)! * power;
}

function EnergyPanel({ energy, profile, onProfileChange }: {
  energy: EnergyEstimate;
  profile: Profile;
  onProfileChange?: (next: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(profile.weight));
  const [error, setError] = useState("");
  const errorId = useId();
  const heatId = `calorimeter-${errorId.replace(/:/g, "")}`;
  const maximum = energyScale(energy.kcal ?? 0);
  const filled = energy.kcal === null ? 0 : Math.round(energy.kcal / maximum * 44);
  const needsWeight = energy.weightKg === null;
  const openWeight = () => { setWeight(String(profile.weight)); setError(""); setEditing(true); };

  return <section className="prog-energy" data-reveal aria-labelledby="energy-heading">
    <div className="prog-energy-heading"><h2 id="energy-heading">Estimated calories<span>.</span></h2></div>
    {energy.kcal !== null ? <div className="prog-energy-body">
      <div className="prog-energy-readout">
        <div className="prog-energy-total"><strong><CountUp value={energy.kcal} duration={1250} /></strong><span>kcal</span></div>
        <div className="prog-energy-facts"><span><strong>{energy.includedSessions}</strong> timed {energy.includedSessions === 1 ? "session" : "sessions"}</span><span><strong>{formatDuration(energy.durationMs)}</strong> recorded</span></div>
        <p className="prog-energy-basis">Gross calories · includes resting energy</p>
      </div>
      <div className="prog-calorimeter" aria-hidden="true">
        <svg viewBox="0 0 180 242" className="prog-calorimeter-svg">
          <defs><linearGradient id={heatId} gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="110" y2="0"><stop offset="0%" stopColor="#ff692b" stopOpacity=".18" /><stop offset="50%" stopColor="#ff9861" /><stop offset="100%" stopColor="#ff692b" stopOpacity=".18" /></linearGradient></defs>
          <line x1="115" x2="115" y1="14" y2="218" className="prog-calorimeter-rule" />
          {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="113" x2="122" y1={18 + tick * 49} y2={18 + tick * 49} className="prog-calorimeter-rule" />{(tick === 0 || tick === 4) && <text x="128" y={21 + tick * 49}>{tick === 0 ? maximum.toLocaleString() : 0}</text>}</g>)}
          {Array.from({ length: 44 }, (_, index) => {
            const width = 38 + Math.sin(index / 43 * Math.PI) * 48;
            return <line key={index} x1={65 - width / 2} x2={65 + width / 2} y1={214 - index * 4.5} y2={214 - index * 4.5} className={index < filled ? "prog-heat-segment is-lit" : "prog-heat-segment"} style={{ "--heat-delay": `${index * 17}ms`, stroke: index < filled ? `url(#${heatId})` : undefined } as CSSProperties} />;
          })}
          <text x="65" y="239" textAnchor="middle" className="prog-energy-scale-label">AUTO SCALE · KCAL</text>
        </svg>
      </div>
    </div> : <div className="prog-energy-setup">
      <p>{needsWeight ? "Add your body weight to estimate calories from completed workouts." : "No eligible timed workouts in this period."}</p>
      {needsWeight && onProfileChange && !editing && <button className="prog-energy-setup-action" onClick={openWeight}>{profile.weight === "" ? "Add body weight" : "Update body weight"}<ArrowUpRight size={17} aria-hidden="true" /></button>}
      {!needsWeight && <span>Finish a workout with the session timer to record an estimate.</span>}
    </div>}
    {!needsWeight && <div className="prog-energy-footer">
      <span>Using {profile.weight} {profile.unit} body weight</span>
      {onProfileChange && <button onClick={openWeight}>Update weight<ArrowUpRight size={15} aria-hidden="true" /></button>}
    </div>}
    {editing && onProfileChange && <form className="prog-weight-form" onSubmit={(event) => {
      event.preventDefault();
      const value = Number(weight);
      if (!weight.trim() || bodyWeightKg(value, profile.unit) === null) {
        setError(profile.unit === "kg" ? "Enter a body weight between 20 and 400 kg." : "Enter a body weight between 44.1 and 881.8 lb.");
        return;
      }
      onProfileChange({ ...profile, weight: value });
      setEditing(false);
    }}>
      <label><span>Body weight · {profile.unit}</span><input autoFocus type="number" inputMode="decimal" step="0.1" min={profile.unit === "kg" ? 20 : 44.1} max={profile.unit === "kg" ? 400 : 881.8} value={weight} onChange={(event) => setWeight(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} placeholder={profile.unit === "kg" ? "70" : "155"} /></label>
      <button type="submit" className="prog-save-weight">Save weight</button><button type="button" className="prog-cancel-weight" onClick={() => setEditing(false)}>Cancel</button>
      {error && <p id={errorId} role="alert">{error}</p>}
    </form>}
    <details className="prog-definition"><summary>How the estimate works<ChevronDown size={14} /></summary>{energy.excludedSessions > 0 && <p>{energy.excludedSessions} {energy.excludedSessions === 1 ? "session excluded" : "sessions excluded"}: incomplete, legacy or unusually long timing.</p>}<p>Calories = MET × body weight in kg × recorded hours. We use 3.5 MET for general resistance training and 3.0 MET for bodyweight-only sessions, from the <a href={ENERGY_METHOD.source} target="_blank" rel="noreferrer">2024 Compendium of Physical Activities</a>. Explicit pauses are excluded; normal rest between sets stays in the session time. Only finished sessions with complete, recorded timing up to 6 hours are included.</p><p>This is a general adult estimate, not precise personal energy expenditure or active calories. Historical estimates use your current body weight and recalculate when it changes. The reference is adults aged 19–59. No calorie target is implied by the meter scale.</p></details>
  </section>;
}

function FrequencyChart({ buckets, empty }: { buckets: FrequencyBucket[]; empty: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const maximum = Math.max(4, Math.ceil(Math.max(...buckets.map((bucket) => bucket.count)) / 2) * 2);
  const current = active === null ? undefined : buckets[active];
  return <div className="prog-frequency-chart">
    <div className="prog-chart-inspection" aria-live="polite">{current ? <><strong>{current.count} {current.count === 1 ? "session" : "sessions"}</strong><span>{shortDate(current.start)}{current.end.getTime() - current.start.getTime() > dayMs * 1.1 ? ` – ${shortDate(current.end.getTime() - 1)}` : ""}</span></> : <span>{empty ? "No completed sessions" : "Select a bar to explore"}</span>}</div>
    <div className="prog-bars-wrap">
      <div className="prog-bar-grid" aria-hidden="true"><span>{maximum}</span><span>{Math.round(maximum / 2)}</span><span>0</span></div>
      <div className="prog-bars">{buckets.map((bucket, index) => <button key={bucket.start.toISOString()} className={active === index ? "is-active" : ""} aria-pressed={active === index} aria-label={`${shortDate(bucket.start)}${bucket.end.getTime() - bucket.start.getTime() > dayMs * 1.1 ? ` to ${shortDate(bucket.end.getTime() - 1)}` : ""}: ${bucket.count} ${bucket.count === 1 ? "session" : "sessions"}`} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}><span className="prog-bar-column"><i style={{ height: `${bucket.count / maximum * 100}%`, "--bar-delay": `${index * 28}ms` } as CSSProperties} data-empty={!bucket.count} /></span><span className="prog-bar-label">{buckets.length <= 7 || index === 0 || index === buckets.length - 1 || index % 3 === 0 ? bucket.label : ""}</span></button>)}</div>
    </div>
  </div>;
}

function formatValue(value: number, basis: "load" | "reps", unit: Unit) {
  return basis === "reps" ? `${Math.round(value)} ${Math.round(value) === 1 ? "rep" : "reps"}` : formatLoad(value, unit);
}

function TrendChart({ points, basis, unit }: { points: TrendPoint[]; basis: "load" | "reps"; unit: Unit }) {
  const gradientId = useId().replace(/:/g, "");
  const [selected, setSelected] = useState(points.length - 1);
  const activeIndex = Math.min(selected, points.length - 1);
  const active = points[activeIndex];
  const previous = points[activeIndex - 1];
  const delta = previous ? active.value - previous.value : null;
  const maximum = Math.max(1, Math.ceil(Math.max(...points.map((p) => p.value)) * 1.12));
  const firstAt = Date.parse(points[0].at);
  const span = Date.parse(points[points.length - 1].at) - firstAt;
  const coords = points.map((p) => ({ x: span > 0 ? 14 + (Date.parse(p.at) - firstAt) / span * 292 : 160, y: 136 - p.value / maximum * 116 }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const selectedPoint = coords[activeIndex];
  return <>
    <div className="prog-trend-readout" aria-live="polite"><div><strong>{formatValue(active.value, basis, unit)}</strong><span>{shortDate(active.at)}{activeIndex === points.length - 1 ? " · Latest session" : ""}</span></div>{delta !== null && <span className="prog-trend-delta">{delta > 0 ? <ArrowUpRight size={15} /> : delta < 0 ? <ArrowDownRight size={15} /> : null}{delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${formatValue(Math.abs(delta), basis, unit)}`}<small>vs prior session</small></span>}</div>
    <svg className="prog-trend-svg" viewBox="0 0 320 158" role="img" aria-label={`Best working set across ${points.length} ${points.length === 1 ? "session" : "sessions"}. ${points.length === 1 ? formatValue(active.value, basis, unit) : `From ${formatValue(points[0].value, basis, unit)} to ${formatValue(points[points.length - 1].value, basis, unit)}`}.`} onPointerMove={(event) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width * 320;
      let nearest = 0;
      for (let index = 1; index < coords.length; index++) if (Math.abs(coords[index].x - x) < Math.abs(coords[nearest].x - x)) nearest = index;
      setSelected(nearest);
    }}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {[20, 78, 136].map((y) => <line key={y} className="prog-trend-grid" x1="0" x2="320" y1={y} y2={y} />)}
      <text x="318" y="14" textAnchor="end" className="prog-trend-axis">{Math.round(maximum)} {basis === "reps" ? "reps" : unit}</text>
      <text x="318" y="151" textAnchor="end" className="prog-trend-axis">0</text>
      {points.length > 1 && <><polygon points={`${coords[0].x},136 ${line} ${coords[coords.length - 1].x},136`} fill={`url(#${gradientId})`} /><polyline className="prog-trend-line" points={line} pathLength="1" /></>}
      <line className="prog-trend-cursor" x1={selectedPoint.x} x2={selectedPoint.x} y1="20" y2="136" />
      {coords.map((point, index) => <circle key={`${points[index].at}-${index}`} className="prog-trend-point" cx={point.x} cy={point.y} r={index === activeIndex ? 4 : 2.5} />)}
      <circle className="prog-trend-halo" cx={selectedPoint.x} cy={selectedPoint.y} r="9" />
    </svg>
    <div className="prog-trend-dates"><span>{shortDate(points[0].at)}</span><span>{points.length > 1 ? shortDate(points[points.length - 1].at) : "One session recorded"}</span></div>
    {points.length > 1 ? <label className="prog-scrubber"><span>Explore sessions</span><input type="range" min="0" max={points.length - 1} value={activeIndex} onChange={(event) => setSelected(Number(event.target.value))} aria-label="Explore recorded sessions" aria-valuetext={`${shortDate(active.at)}, ${formatValue(active.value, basis, unit)}`} /></label> : <p className="prog-single-note">One session recorded. A second session enables comparison.</p>}
    <details className="prog-definition prog-data-table"><summary>View all values<ChevronDown size={14} /></summary><table><caption className="sr-only">Best working set per session</caption><thead><tr><th scope="col">Date</th><th scope="col">{basis === "reps" ? "Most reps" : "Heaviest set"}</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.at}-${index}`}><th scope="row">{shortDate(point.at)}</th><td>{formatValue(point.value, basis, unit)}</td></tr>)}</tbody></table></details>
  </>;
}

export default Progress;
