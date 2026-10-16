import { useState } from "react";
import { ArrowUpRight, HelpCircle, Info } from "lucide-react";
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
    <div className="preview">
      <button className="quiet back" onClick={onBack}>
        Back
      </button>

      <header className="preview-head">
        <p className="eyebrow">{workout.planName}</p>
        <h1>{workout.name}</h1>
        <p className="preview-facts tabular">
          <span>{durationText(duration)}</span>
          <span aria-hidden="true">·</span>
          <span>{workout.entries.length} movements</span>
          <span aria-hidden="true">·</span>
          <span>
            {workout.entries.reduce((n, e) => n + e.sets, 0)} sets
          </span>
        </p>
        <p className="fine">
          Rep-based lifting has no exact length. The range comes from the prescription
          and your rest setting, not from a measured session.
        </p>
      </header>

      <section>
        <h2>What you need</h2>
        <ul className="chip-row">
          {equipment.length ? (
            equipment.map((e) => (
              <li key={e} className="chip">
                {equipmentNames[e]}
              </li>
            ))
          ) : (
            <li className="chip">Nothing but space</li>
          )}
        </ul>
      </section>

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

      <section>
        <h2>The session</h2>
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
                    className="icon-button"
                    aria-label={`How to do ${def?.name ?? entry.exerciseId}`}
                    onClick={() => setHelpFor(entry.exerciseId)}
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2>What it trains</h2>
        <MuscleMap
          primaryMuscles={[...primary]}
          supportingMuscles={[...supporting].filter((m) => !primary.has(m))}
        />
      </section>

      {/* Fixed above the safe area, so starting never requires scrolling back up. */}
      <div className="sticky-action">
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
