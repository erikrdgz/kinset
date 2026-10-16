import { Suspense, lazy, useState } from "react";
import { Play, VideoOff } from "lucide-react";
import { demoIds } from "../motion/catalog";
import { exercises as legacyExercises, type ExerciseDefinition } from "../domain";

const ExerciseDemo = lazy(() => import("../ExerciseDemo"));

/**
 * The movement media slot.
 *
 * Kinset has no filmed instruction. No media supplier is contracted, and the brief is
 * explicit that inventing a URL or passing a rendered animation off as reviewed footage
 * is not acceptable. So this component is the adapter and the honest fallback, with the
 * filmed-asset case written and unreachable until `media.provider` is set.
 *
 * The procedural 3D demo that exists in the repository is still available, but it is no
 * longer the default and it is labelled as what it is: an illustration of the movement
 * path, not reviewed instruction. It loads only when asked for, because it pulls a large
 * chunk and the written guide beside it is the part that is actually authoritative.
 *
 * Logging never waits on any of this.
 */
export function MovementMedia({ exercise }: { exercise: ExerciseDefinition }) {
  const [playing, setPlaying] = useState(false);
  const hasIllustration = demoIds.has(exercise.id);

  // The real path, once a supplier exists. Deliberately kept so the shape of the
  // integration is visible rather than being invented later under time pressure.
  if (exercise.media.provider && exercise.media.poster) {
    return (
      <div className="media-slot">
        <video
          className="media-video"
          poster={exercise.media.poster}
          controls
          playsInline
          muted
          loop
          preload="none"
        />
        {exercise.media.attribution && (
          <p className="fine">{exercise.media.attribution}</p>
        )}
      </div>
    );
  }

  if (!hasIllustration)
    return (
      <div className="media-slot media-empty">
        <VideoOff size={22} aria-hidden="true" />
        <p>
          <strong>No film for this movement yet.</strong>
          <span>The written steps below are the instruction.</span>
        </p>
      </div>
    );

  return (
    <div className="media-slot">
      {playing ? (
        <Suspense
          fallback={<div className="media-loading">Loading illustration…</div>}
        >
          {/* The renderer still takes the original flat record; it is driven by the
              motion catalog, which is keyed by the same stable IDs. */}
          <ExerciseDemo
            key={exercise.id}
            exercise={legacyExercises.find((e) => e.id === exercise.id)!}
          />
        </Suspense>
      ) : (
        <button
          type="button"
          className="media-poster"
          onClick={() => setPlaying(true)}
        >
          <Play size={24} aria-hidden="true" />
          <span>
            <strong>Play movement illustration</strong>
            <small>A 3D animation of the movement path</small>
          </span>
        </button>
      )}
      <p className="fine">
        This is a computer-generated illustration of the movement path, not filmed
        instruction, and it has not been reviewed by a trainer. Follow the written steps
        and stop if a movement causes pain.
      </p>
    </div>
  );
}

export default MovementMedia;
