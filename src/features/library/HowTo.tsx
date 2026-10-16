import { useState } from "react";
import { Sheet } from "../../ui/Sheet";
import { MuscleMap } from "../../ui/MuscleMap";
import { MovementMedia } from "../../media/Player";
import {
  equipmentNames,
  findExercise,
  loadLabel,
  patternNames,
  type ExerciseDefinition,
} from "../../domain";

/**
 * Contextual movement help.
 *
 * The audited app opened every exercise on its anatomy model: someone who wanted to know
 * how to do the movement had to take a second action to get there, and the sheet was
 * shared with the library so it pulled them out of their workout. That was the single
 * most consequential finding in the audit.
 *
 * So: this opens on **how to do it**, every time. Muscles are a second tab for the
 * person who wants them. Dismissing returns focus to the control that opened it, which
 * during a session is the set row being filled in.
 */
type Tab = "guide" | "muscles";

export function HowTo({
  exerciseId,
  onClose,
}: {
  exerciseId: string;
  onClose: () => void;
}) {
  // Instruction first. This default is the fix.
  const [tab, setTab] = useState<Tab>("guide");
  const exercise = findExercise(exerciseId);

  if (!exercise)
    return (
      <Sheet title="Movement" onClose={onClose}>
        <p className="muted">
          This movement is no longer in the library. Your logged sets for it are
          unaffected.
        </p>
      </Sheet>
    );

  return (
    <Sheet title={exercise.name} onClose={onClose}>
      <div className="howto-tabs" role="tablist" aria-label="Movement information">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "guide"}
          className={tab === "guide" ? "selected" : ""}
          onClick={() => setTab("guide")}
        >
          How to
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "muscles"}
          className={tab === "muscles" ? "selected" : ""}
          onClick={() => setTab("muscles")}
        >
          Muscles
        </button>
      </div>

      {tab === "guide" ? (
        <div role="tabpanel" className="howto-panel">
          <MovementMedia exercise={exercise} />
          <Requirements exercise={exercise} />
          <h3>Set up</h3>
          <p>{exercise.guide.setup}</p>
          <h3>Steps</h3>
          <ol className="howto-steps">
            {exercise.guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3>Breathing</h3>
          <p>{exercise.guide.breathing}</p>
          <h3>Common mistakes</h3>
          <p>{exercise.guide.avoid}</p>
          {exercise.guide.source && (
            <p className="fine">
              Reference:{" "}
              <a href={exercise.guide.source} target="_blank" rel="noreferrer">
                {new URL(exercise.guide.source).hostname}
              </a>
            </p>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="howto-panel">
          <MuscleMap
            primaryMuscles={exercise.primaryMuscles}
            supportingMuscles={exercise.supportingMuscles}
          />
        </div>
      )}
    </Sheet>
  );
}

/**
 * What the movement actually needs, spelled out. A "Bodyweight" chip used to hide the
 * bench an incline push-up requires; the full list is the point.
 */
function Requirements({ exercise }: { exercise: ExerciseDefinition }) {
  return (
    <dl className="howto-facts">
      <div>
        <dt>Pattern</dt>
        <dd>{exercise.patterns.map((p) => patternNames[p]).join(" · ")}</dd>
      </div>
      <div>
        <dt>You need</dt>
        <dd>
          {exercise.requires.length
            ? exercise.requires.map((r) => equipmentNames[r]).join(" · ")
            : "Nothing but space"}
        </dd>
      </div>
      <div>
        <dt>Weight means</dt>
        <dd>{loadLabel(exercise)}</dd>
      </div>
      <div>
        <dt>Counted</dt>
        <dd>
          {exercise.measurement.perSide ? "Reps per side" : "Reps"}
          {exercise.measurement.kind === "duration" ? " · timed" : ""}
        </dd>
      </div>
    </dl>
  );
}

export default HowTo;
