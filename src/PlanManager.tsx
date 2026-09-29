import { Select } from "./Select";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, ChevronRight } from "lucide-react";
import { exercises, type State } from "./domain";
import {
  newPlan,
  foundationPlan,
  defaultEntry,
  planSchema,
  type WorkoutPlan,
  type PlanDay,
  targetReps,
} from "./plans";
export default function Plans({
  data,
  update,
  onPreview,
  onStart,
}: {
  data: State;
  update: (next: State) => void;
  onPreview: (id: string) => void;
  onStart: (plan: WorkoutPlan, day: PlanDay) => void;
}) {
  const [dayIndex, setDayIndex] = useState(0),
    [query, setQuery] = useState(""),
    [equipment, setEquipment] = useState("All"),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  const draft = data.planDraft,
    plans = data.plans || [];
  const begin = (plan: WorkoutPlan) => {
    update({ ...data, planDraft: structuredClone(plan) });
    setDayIndex(0);
    setError("");
    setQuery("");
  };
  const change = (plan: WorkoutPlan) => {
    update({ ...data, planDraft: plan });
    setError("");
  };
  const day = draft?.days[Math.min(dayIndex, draft.days.length - 1)];
  const changeDay = (next: PlanDay) =>
    change({
      ...draft!,
      days: draft!.days.map((d) => (d.id === next.id ? next : d)),
    });
  function save() {
    const result = planSchema.safeParse(draft);
    if (!result.success) {
      const issue = result.error.issues[0];
      const index =
        typeof issue.path[1] === "number" ? issue.path[1] : undefined;
      if (index !== undefined) setDayIndex(index);
      setError(
        (index !== undefined
          ? `${draft?.days[index]?.name || `Day ${index + 1}`}: `
          : "") + issue.message,
      );
      return;
    }
    const exists = plans.some((p) => p.id === result.data.id);
    update({
      ...data,
      plans: exists
        ? plans.map((p) => (p.id === result.data.id ? result.data : p))
        : [...plans, result.data],
      planDraft: null,
      activePlanId: data.activePlanId,
    });
    setError("");
  }
  if (draft && day)
    return (
      <section className="plan-builder">
        <div className="page-heading">
          <div>
            <span className="eyebrow">YOUR ROUTINE / PLAN BUILDER</span>
            <h1>Make it yours.</h1>
            <p className="muted">
              Your draft saves as you go. Save the plan when it’s ready to
              train.
            </p>
          </div>
        </div>
        <label className="plan-label">
          Plan name
          <input
            maxLength={60}
            value={draft.name}
            placeholder="e.g. Three-day strength"
            onChange={(e) => change({ ...draft, name: e.target.value })}
          />
        </label>
        <div className="plan-days" role="group" aria-label="Workout days">
          {draft.days.map((d, i) => (
            <button
              key={d.id}
              className={d.id === day.id ? "selected" : ""}
              aria-pressed={d.id === day.id}
              onClick={() => setDayIndex(i)}
            >
              {d.name || `Day ${i + 1}`}
            </button>
          ))}
          <button
            disabled={draft.days.length >= 7}
            onClick={() => {
              change({
                ...draft,
                days: [
                  ...draft.days,
                  {
                    id: crypto.randomUUID(),
                    name: `Day ${draft.days.length + 1}`,
                    entries: [],
                  },
                ],
              });
              setDayIndex(draft.days.length);
            }}
          >
            <Plus size={16} /> Add day
          </button>
        </div>
        <div className="plan-day-heading">
          <label className="plan-label">
            Day name
            <input
              maxLength={50}
              value={day.name}
              onChange={(e) => changeDay({ ...day, name: e.target.value })}
            />
          </label>
          <button
            className="text-button"
            disabled={draft.days.length === 1}
            onClick={() => {
              change({
                ...draft,
                days: draft.days.filter((d) => d.id !== day.id),
              });
              setDayIndex(0);
            }}
          >
            Remove day
          </button>
        </div>
        <div className="plan-day-order">
          <span>
            Day {draft.days.indexOf(day) + 1} of {draft.days.length}
          </span>
          {[-1, 1].map((direction) => (
            <button
              key={direction}
              className="text-button"
              disabled={
                draft.days.indexOf(day) + direction < 0 ||
                draft.days.indexOf(day) + direction >= draft.days.length
              }
              onClick={() => {
                const days = [...draft.days],
                  i = days.indexOf(day);
                [days[i], days[i + direction]] = [days[i + direction], days[i]];
                change({ ...draft, days });
                setDayIndex(i + direction);
              }}
            >
              {direction === -1 ? "Move day earlier" : "Move day later"}
            </button>
          ))}
        </div>
        <p className="fine">
          Rep targets apply to each set. For one-sided movements, targets are
          per side.
        </p>
        {!day.entries.length && (
          <p className="plan-empty">
            Add your first exercise from the library below.
          </p>
        )}
        <ol className="plan-exercises">
          {day.entries.map((entry, i) => {
            const exercise = exercises.find((e) => e.id === entry.exerciseId)!;
            return (
              <li key={entry.exerciseId}>
                <div className="plan-exercise-heading">
                  <div>
                    <span className="eyebrow">
                      {String(i + 1).padStart(2, "0")} / {exercise.muscle}
                    </span>
                    <h3>{exercise.name}</h3>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => onPreview(exercise.id)}
                  >
                    Watch demo
                  </button>
                </div>
                <div className="plan-prescription">
                  {(
                    [
                      ["sets", "Sets"],
                      ["repsMin", "Min reps"],
                      ["repsMax", "Max reps"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input
                        aria-label={`${exercise.name} ${label}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={field === "sets" ? 10 : 100}
                        value={entry[field] || ""}
                        onChange={(e) =>
                          changeDay({
                            ...day,
                            entries: day.entries.map((x, j) =>
                              j === i
                                ? { ...x, [field]: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <div className="plan-reorder">
                    <button
                      aria-label={`Move ${exercise.name} up`}
                      disabled={i === 0}
                      onClick={() => {
                        const entries = [...day.entries];
                        [entries[i - 1], entries[i]] = [
                          entries[i],
                          entries[i - 1],
                        ];
                        changeDay({ ...day, entries });
                      }}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      aria-label={`Move ${exercise.name} down`}
                      disabled={i === day.entries.length - 1}
                      onClick={() => {
                        const entries = [...day.entries];
                        [entries[i + 1], entries[i]] = [
                          entries[i],
                          entries[i + 1],
                        ];
                        changeDay({ ...day, entries });
                      }}
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      aria-label={`Remove ${exercise.name}`}
                      onClick={() =>
                        changeDay({
                          ...day,
                          entries: day.entries.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <section className="plan-picker">
          <h2>Add exercises</h2>
          <div className="plan-search">
            <label className="plan-label">
              Search
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or muscle"
              />
            </label>
            <label className="plan-label">
              Equipment
              <Select
                label="Equipment"
                value={equipment}
                onValueChange={setEquipment}
                options={["All", "Bodyweight", "Dumbbells", "Full gym"]}
              />
            </label>
          </div>
          <div className="plan-picker-list">
            {exercises
              .filter(
                (e) =>
                  (equipment === "All" || e.equipment === equipment) &&
                  `${e.name} ${e.muscle}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((e) => {
                const added = day.entries.some((x) => x.exerciseId === e.id);
                return (
                  <div key={e.id}>
                    <button
                      className="plan-pick-name"
                      onClick={() => onPreview(e.id)}
                    >
                      <strong>{e.name}</strong>
                      <small>
                        {e.muscle} · {e.equipment} · Watch demo
                      </small>
                    </button>
                    <button
                      className="text-button"
                      aria-label={`Add ${e.name}`}
                      disabled={added || day.entries.length >= 20}
                      onClick={() =>
                        changeDay({
                          ...day,
                          entries: [...day.entries, defaultEntry(e.id)],
                        })
                      }
                    >
                      {added ? "Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
          </div>
          <p className="fine">{day.entries.length}/20 exercises in this day</p>
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="plan-save">
          <button className="primary" onClick={save}>
            Save plan <ChevronRight size={18} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              update({ ...data, planDraft: null });
              setError("");
            }}
          >
            Discard draft
          </button>
        </div>
      </section>
    );
  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR TRAINING / YOUR WAY</span>
          <h1>Workout plans.</h1>
          <p className="muted">
            Build your own rotation. Completed workouts advance to the next day.
          </p>
        </div>
      </div>
      <div className="plan-actions">
        <button className="primary" onClick={() => begin(newPlan())}>
          <Plus size={18} /> Create plan
        </button>
        <button
          className="secondary"
          onClick={() => begin(foundationPlan(data.profile!))}
        >
          Customize foundation
        </button>
      </div>
      {data.active && (
        <p className="fine">
          You have a session in progress. Plan edits apply to future sessions;
          finish or discard that session before starting another day.
        </p>
      )}
      <article className="saved-plan">
        <div className="saved-plan-heading">
          <div>
            <span className="eyebrow">
              {!data.activePlanId ? "ACTIVE ROUTINE" : "STARTER ROUTINE"}
            </span>
            <h2>Foundation</h2>
            <p>
              {data.profile!.days} sessions per week · {data.profile!.equipment}
            </p>
          </div>
          <button
            className="secondary"
            disabled={!data.activePlanId}
            onClick={() => update({ ...data, activePlanId: null })}
          >
            {!data.activePlanId ? "Active" : "Use foundation"}
          </button>
        </div>
      </article>
      {plans.map((plan) => (
        <article className="saved-plan" key={plan.id}>
          <div className="saved-plan-heading">
            <div>
              <span className="eyebrow">
                {data.activePlanId === plan.id ? "ACTIVE PLAN" : "CUSTOM PLAN"}
              </span>
              <h2>{plan.name}</h2>
              <p>
                {plan.days.length} workout{" "}
                {plan.days.length === 1 ? "day" : "days"}
              </p>
            </div>
            <button
              className="secondary"
              disabled={data.activePlanId === plan.id}
              onClick={() => update({ ...data, activePlanId: plan.id })}
            >
              {data.activePlanId === plan.id ? "Active" : "Use plan"}
            </button>
          </div>
          <div className="saved-plan-days">
            {plan.days.map((day, i) => (
              <div key={day.id}>
                <div>
                  <strong>{day.name}</strong>
                  <small>
                    {day.entries.length} exercises ·{" "}
                    {day.entries.reduce((n, e) => n + e.sets, 0)} sets
                    {(data.planProgress?.[plan.id] || 0) % plan.days.length ===
                    i
                      ? " · Up next"
                      : ""}
                  </small>
                  <details>
                    <summary>View exercises</summary>
                    {day.entries.map((e) => (
                      <p key={e.exerciseId}>
                        {exercises.find((x) => x.id === e.exerciseId)?.name} ·{" "}
                        {e.sets} × {targetReps(e)}
                      </p>
                    ))}
                  </details>
                </div>
                <button
                  className="text-button"
                  disabled={!!data.active}
                  aria-label={`Start ${plan.name} ${day.name}`}
                  onClick={() => onStart(plan, day)}
                >
                  Start <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="plan-card-actions">
            <button className="text-button" onClick={() => begin(plan)}>
              Edit plan
            </button>
            <button
              className="text-button"
              onClick={() =>
                begin({
                  ...structuredClone(plan),
                  id: crypto.randomUUID(),
                  name: `${plan.name.slice(0, 53)} (copy)`,
                  days: plan.days.map((d) => ({
                    ...d,
                    id: crypto.randomUUID(),
                  })),
                })
              }
            >
              Duplicate
            </button>
            <button
              className="text-button"
              onClick={() => setDeleting(plan.id)}
            >
              Delete
            </button>
          </div>
          {deleting === plan.id && (
            <div
              className="plan-delete"
              role="group"
              aria-label="Confirm plan deletion"
            >
              <p>Delete this plan? Completed workouts stay in your history.</p>
              <button
                className="secondary"
                onClick={() => {
                  update({
                    ...data,
                    plans: plans.filter((p) => p.id !== plan.id),
                    activePlanId:
                      data.activePlanId === plan.id ? null : data.activePlanId,
                  });
                  setDeleting(null);
                }}
              >
                Delete plan
              </button>
              <button className="text-button" onClick={() => setDeleting(null)}>
                Keep plan
              </button>
            </div>
          )}
        </article>
      ))}
      {!plans.length && (
        <p className="plan-empty">
          Start from a blank plan or adapt your foundation routine.
        </p>
      )}
    </section>
  );
}
