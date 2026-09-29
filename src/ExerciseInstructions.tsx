import type { Exercise } from "./domain";
import { guides } from "./guides";
export default function ExerciseInstructions({
  exercise,
}: {
  exercise: Exercise;
}) {
  const guide = guides[exercise.id];
  if (!guide)
    return (
      <section className="exercise-guide">
        <h3>Movement cue</h3>
        <p>{exercise.cue}</p>
      </section>
    );
  return (
    <section
      className="exercise-guide"
      aria-label={`${exercise.name} instructions`}
    >
      <h3>Set up</h3>
      <p>{guide.setup}</p>
      <h3>How to move</h3>
      <ol>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="guide-cues">
        <div>
          <h3>Breathing</h3>
          <p>{guide.breathing}</p>
        </div>
        <div>
          <h3>Watch for</h3>
          <p>{guide.avoid}</p>
        </div>
      </div>
      {guide.source && (
        <a
          className="guide-source"
          href={guide.source}
          target="_blank"
          rel="noreferrer"
        >
          Exercise reference · ACE
        </a>
      )}
    </section>
  );
}
