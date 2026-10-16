import { Suspense, lazy, useEffect, useState } from "react";
import { Play, VideoOff } from "lucide-react";
import { demoIds } from "../motion/catalog";
import { exercises as legacyExercises, type ExerciseDefinition } from "../domain";
import { loadManifest, mediaFor, type ResolvedMedia } from "./manifest";

const ExerciseDemo = lazy(() => import("../ExerciseDemo"));

/**
 * The movement media slot.
 *
 * Order of preference: a licensed asset from the manifest, then the procedural 3D
 * illustration if one exists for this movement, then the written guide alone. Logging
 * never waits on any of it, and no state here is a dead end — the guide below is always
 * the authoritative instruction.
 *
 * The 3D demo is no longer a default and no longer framed as a demonstration. It is
 * labelled as a computer-generated illustration of the movement path, because that is
 * what it is, and it loads only when asked for since it pulls a megabyte of renderer.
 */
export function MovementMedia({ exercise }: { exercise: ExerciseDefinition }) {
  const [media, setMedia] = useState<ResolvedMedia | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const hasIllustration = demoIds.has(exercise.id);

  useEffect(() => {
    let live = true;
    setFailed(false);
    void loadManifest().then(() => {
      if (live) setMedia(mediaFor(exercise.id));
    });
    return () => {
      live = false;
    };
  }, [exercise.id]);

  if (media && !failed && !media.expired)
    return (
      <div className="media-slot">
        {media.kind === "video" ? (
          <video
            className="media-video"
            src={media.resolvedSrc}
            poster={media.resolvedPoster}
            controls
            playsInline
            muted
            loop
            preload="none"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            className="media-gif"
            src={media.resolvedSrc}
            alt={`${exercise.name} demonstration`}
            loading="lazy"
            decoding="async"
            width={media.width}
            height={media.height}
            onError={() => setFailed(true)}
          />
        )}
        <p className="fine">
          {media.attribution ?? "Licensed movement media."}
          {media.techniqueReviewed
            ? ""
            : " This clip has not yet been checked by a qualified reviewer."}
        </p>
      </div>
    );

  // An expired or broken asset is reported as such, not silently replaced.
  if (media && (failed || media.expired))
    return (
      <div className="media-slot media-empty">
        <VideoOff size={22} aria-hidden="true" />
        <p>
          <strong>
            {media.expired ? "This clip has expired." : "This clip could not load."}
          </strong>
          <span>The written steps below are unaffected.</span>
        </p>
      </div>
    );

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
