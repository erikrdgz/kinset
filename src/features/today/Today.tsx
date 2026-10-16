import { ArrowUpRight, ChevronRight, Info } from "lucide-react";
import {
  completedSessions,
  completedWorkingSets,
  equipmentNames,
  equipmentUnion,
  findExercise,
  patternNames,
  type Journal,
  type Profile,
} from "../../domain";
import {
  durationText,
  estimateDuration,
  nextWorkout,
  prescriptionText,
} from "../training/workout";
import { BrandArt } from "../../ui/BrandArt";
import type { Route } from "../../app/routes";

/**
 * Today: one clear next action, at editorial scale.
 *
 * The audited screen made training, discovery and navigation compete — a week dial, a
 * lineup, a demo banner, a plan footer and a recent session all at one level. The
 * references answer that with hierarchy carried by size: the duration is the biggest
 * thing on the screen, the action is a full-width bar under it, and everything else is
 * visibly subordinate.
 *
 * The one honest departure from the references is the hero image. They show a figure
 * mid-movement; no such photography is licensed, so the slot holds generative brand art
 * instead of a stock body that would misrepresent the movement anyway.
 */
export function Today({
  journal,
  profile,
  go,
  onStart,
}: {
  journal: Journal;
  profile: Profile;
  go: (route: Route) => void;
  onStart: () => void;
}) {
  const workout = nextWorkout(journal, profile);
  const active = journal.active;
  const duration = estimateDuration(workout.entries);
  const equipment = equipmentUnion(workout.entries.map((e) => e.exerciseId));
  const focus = [
    ...new Set(
      workout.entries.flatMap(
        (e) => findExercise(e.exerciseId)?.patterns.slice(0, 1) ?? [],
      ),
    ),
  ];
  const done = completedSessions(journal);
  const week = weekDays(done);
  const completedThisWeek = week.filter((d) => d.completed).length;
  const last = done[0];

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const setsThisWeek = completedWorkingSets(journal).filter(
    (s) => Date.parse(s.at) >= weekStart.getTime(),
  ).length;

  return (
    <div className="today">
      <header className="today-head">
        <p className="today-date">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <h1>Today</h1>
      </header>

      {/* The week, described rather than scored. A rest day is a state, not a failure. */}
      <ol className="week-strip" aria-label="This week">
        {week.map((day) => (
          <li
            key={day.key}
            className="week-day"
            data-today={day.isToday || undefined}
            data-state={day.completed ? "completed" : day.future ? "ahead" : "open"}
          >
            <span className="week-letter" aria-hidden="true">
              {day.letter}
            </span>
            <span className="week-mark" aria-hidden="true" />
            <span className="sr-only">
              {day.label}:{" "}
              {day.completed
                ? "trained"
                : day.future
                  ? "ahead"
                  : "no session recorded"}
            </span>
          </li>
        ))}
      </ol>

      <section className="hero" aria-labelledby="hero-title">
        <BrandArt seed={active?.name ?? workout.name} className="hero-art" />

        <div className="hero-over">
          <p className="hero-chip">
            {active
              ? "In progress"
              : `${workout.entries.length} moves${
                  focus[0] ? ` · ${patternNames[focus[0]]}` : ""
                }`}
          </p>

          {/* The monumental numeral the references lead with. */}
          <p className="hero-figure tabular" aria-hidden="true">
            {duration.min}
            {duration.max !== duration.min && <i>–{duration.max}</i>}
            <small>MIN</small>
          </p>
          <p className="sr-only">{durationText(duration)}</p>
        </div>

        <div className="hero-body">
          <p className="eyebrow">{active ? "Resume" : "Up next"}</p>
          <h2 id="hero-title">{active?.name ?? workout.name}</h2>
          <p className="hero-equipment">
            {equipment.length
              ? equipment.map((e) => equipmentNames[e]).join(" · ")
              : "No equipment needed"}
          </p>

          {/* One segment per movement, the references' block progress. */}
          <ol className="hero-segments" aria-hidden="true">
            {workout.entries.map((e, i) => (
              <li key={`${e.exerciseId}-${i}`} />
            ))}
          </ol>

          <button className="primary big" onClick={onStart}>
            {active ? "Resume workout" : "Start workout"}
            <ArrowUpRight size={20} aria-hidden="true" />
          </button>
          <div className="hero-secondary">
            <button className="quiet" onClick={() => go({ name: "preview" })}>
              View workout
            </button>
            <button className="quiet" onClick={() => go({ name: "train" })}>
              Change today
            </button>
          </div>
        </div>
      </section>

      {/* Facts, not a streak. Rest is not a broken chain. */}
      <ul className="stat-tiles">
        <li>
          <strong className="tabular">{completedThisWeek}</strong>
          <span>
            of {profile.days} sessions
            <small>this week</small>
          </span>
        </li>
        <li>
          <strong className="tabular">{setsThisWeek}</strong>
          <span>
            sets logged
            <small>this week</small>
          </span>
        </li>
        <li>
          <strong className="tabular">{done.length}</strong>
          <span>
            workouts
            <small>all time</small>
          </span>
        </li>
      </ul>

      {/* An unfillable slot is stated here, not silently filled with a stand-in. */}
      {workout.unmet.length > 0 && (
        <section className="notice-inline" role="note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>
              This session is missing{" "}
              {workout.unmet.map((u) => u.slot.label.toLowerCase()).join(" and ")}.
            </strong>
            {workout.unmet.map((u) => (
              <p key={u.slot.id}>{u.reason}</p>
            ))}
          </div>
        </section>
      )}

      <section className="lineup">
        <h3>The lineup</h3>
        {/* Hairline rows, as the references' prescription table. */}
        <ol className="rule-list">
          {workout.entries.map((entry, i) => {
            const definition = findExercise(entry.exerciseId);
            return (
              <li key={`${entry.exerciseId}-${i}`}>
                <button
                  onClick={() =>
                    go({ name: "library", exerciseId: entry.exerciseId })
                  }
                >
                  <span className="rule-index tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="rule-name">
                    <strong>{definition?.name ?? entry.exerciseId}</strong>
                    <small>
                      {definition?.patterns
                        .map((p) => patternNames[p])
                        .join(" · ")}
                    </small>
                  </span>
                  <span className="rule-value tabular">
                    {entry.sets} × {prescriptionText(entry)}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {last && (
        <section className="recent">
          <h3>Last session</h3>
          <button onClick={() => go({ name: "summary", sessionId: last.id })}>
            <span>
              <strong>{last.name}</strong>
              <small>
                {new Date(last.finishedAt!).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      )}
    </div>
  );
}

/** The current week, Monday first, with what was actually completed on each day. */
function weekDays(sessions: ReturnType<typeof completedSessions>) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    return {
      key: date.toISOString(),
      letter: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      label: date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      isToday: date.getTime() === today.getTime(),
      future: date.getTime() > today.getTime(),
      completed: sessions.some((s) => {
        const at = Date.parse(s.finishedAt ?? "");
        return at >= date.getTime() && at < next.getTime();
      }),
    };
  });
}

export default Today;
