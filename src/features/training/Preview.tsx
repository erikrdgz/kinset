import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Info } from "lucide-react";
import {
  equipmentNames,
  equipmentUnion,
  findExercise,
  patternNames,
  type Journal,
  type Profile,
  type MuscleId,
} from "../../domain";
import {
  durationText,
  estimateDuration,
  nextWorkout,
  prescriptionText,
} from "./workout";
import { MuscleMap } from "../../ui/MuscleMap";
import { HowTo } from "../library/HowTo";
import "./session.css";

/**
 * The workout preview: what this session is, before committing to it.
 *
 * Everything needed to decide is here — the real duration band, the complete equipment
 * list, the sequence, and what it trains. The equipment list is the union of every
 * movement's full requirements, so a bench or a cable anchor cannot hide behind a
 * generic chip.
 */
export function Preview({
  journal,
  profile,
  onStart,
  onBack,
}: {
  journal: Journal;
  profile: Profile;
  onStart: () => void;
  onBack: () => void;
}) {
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const workout = nextWorkout(journal, profile);
  const duration = estimateDuration(workout.entries);
  const equipment = equipmentUnion(workout.entries.map((e) => e.exerciseId));

  const primary = new Set<MuscleId>();
  const supporting = new Set<MuscleId>();
  for (const entry of workout.entries) {
    const def = findExercise(entry.exerciseId);
    for (const m of def?.primaryMuscles ?? []) primary.add(m);
    for (const m of def?.supportingMuscles ?? []) supporting.add(m);
  }

  return (
    <div className="preview training-preview">
      <button className="quiet back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to training
      </button>

      <header className="preview-head">
        <p className="eyebrow">{workout.planName}</p>
        <h1>{workout.name}</h1>
        <div className="preview-facts tabular">
          <div className="preview-fact" aria-label={durationText(duration)}><strong>{duration.min === duration.max ? duration.min : `${duration.min}–${duration.max}`}</strong><small>Minutes · estimated</small></div>
          <div className="preview-fact"><strong>{String(workout.entries.length).padStart(2, "0")}</strong><small>Movements</small></div>
          <div className="preview-fact"><strong>{String(workout.entries.reduce((n, e) => n + e.sets, 0)).padStart(2, "0")}</strong><small>Working sets</small></div>
        </div>
        <p className="preview-estimate">
          Estimated from your planned sets and rest intervals.
        </p>
      </header>

      {workout.unmet.length > 0 && (
        <section className="notice-inline" role="note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Not everything could be scheduled.</strong>
            {workout.unmet.map((u) => (
              <p key={u.slot.id}>{u.reason}</p>
            ))}
          </div>
        </section>
      )}

      <div className="preview-body">
      <section className="preview-lineup">
        <div className="training-section-heading"><h2>The session</h2><span className="tabular">{workout.entries.length} movements</span></div>
        <ol className="rule-list preview-list">
          {workout.entries.map((entry, i) => {
            const def = findExercise(entry.exerciseId);
            return (
              <li key={`${entry.exerciseId}-${i}`}>
                <div className="preview-row">
                  <span className="rule-index tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="rule-name">
                    <strong>{def?.name ?? entry.exerciseId}</strong>
                    <small>
                      {def?.patterns.map((p) => patternNames[p]).join(" · ")}
                      {def?.requires.length
                        ? ` · ${def.requires.map((r) => equipmentNames[r]).join(", ")}`
                        : ""}
                    </small>
                  </span>
                  <span className="rule-value tabular">
                    {entry.sets} × {prescriptionText(entry)}
                  </span>
                  <button
                    className="preview-guide"
                    aria-label={`Guide for ${def?.name ?? entry.exerciseId}`}
                    onClick={() => setHelpFor(entry.exerciseId)}
                  >
                    <BookOpen size={16} aria-hidden="true" />
                    <span>Guide</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <aside className="preview-preparation" aria-label="Workout preparation">
      <section className="preview-equipment">
        <div className="training-section-heading"><h2>Equipment</h2></div>
        <ul className="preview-equipment-list">
          {equipment.length ? equipment.map((e) => <li key={e}>{equipmentNames[e]}</li>) : <li>Bodyweight · no equipment</li>}
        </ul>
      </section>
      <section className="preview-anatomy">
        <div className="training-section-heading"><h2>Training focus</h2></div>
        <MuscleMap
          primaryMuscles={[...primary]}
          supportingMuscles={[...supporting].filter((m) => !primary.has(m))}
        />
      </section>
      </aside>
      </div>

      {/* Fixed above the safe area, so starting never requires scrolling back up. */}
      <div className="sticky-action">
        <span className="preview-start-copy"><strong>{workout.name}</strong><small>{workout.entries.length} movements · {durationText(duration)}</small></span>
        <button className="primary big" onClick={onStart}>
          Start workout
          <ArrowUpRight size={20} aria-hidden="true" />
        </button>
      </div>

      {helpFor && <HowTo exerciseId={helpFor} onClose={() => setHelpFor(null)} />}
    </div>
  );
}

export default Preview;
