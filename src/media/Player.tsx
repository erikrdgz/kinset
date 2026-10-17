import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, VideoOff } from "lucide-react";
import type { ExerciseDefinition } from "../domain";
import { loadManifest, mediaFor, type ResolvedMedia } from "./manifest";
import "./player.css";

/** Exact, licensed footage or static positions. The written guide always stays available. */
export function MovementMedia({ exercise }: { exercise: ExerciseDefinition }) {
  // Changing movements also resets playback, failed requests, speed, and selected position.
  return <MovementPlayer key={exercise.id} exercise={exercise} />;
}

function MovementPlayer({ exercise }: { exercise: ExerciseDefinition }) {
  const [media, setMedia] = useState<ResolvedMedia | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void loadManifest().then(() => {
      if (live) { setMedia(mediaFor(exercise.id)); setReady(true); }
    });
    return () => { live = false; };
  }, [exercise.id]);

  useEffect(() => {
    const node = container.current;
    const player = video.current;
    const pause = () => { player?.pause(); setPlaying(false); };
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", visibility);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) pause(); },
      { threshold: 0 },
    );
    if (node) observer?.observe(node);
    return () => { player?.pause(); observer?.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [media?.resolvedSrc]);

  if (!ready) return <div className="media-slot media-loading" aria-busy="true">Loading movement guide…</div>;
  if (!media || media.expired || failed) return (
    <div className="media-slot media-empty">
      <VideoOff size={22} aria-hidden="true" />
      <p><strong>{failed ? "This demonstration could not load." : media?.expired ? "This demonstration has expired." : "Written movement guide"}</strong>
        <span>{failed || media?.expired ? "The written guide below is still available." : "Follow the setup and movement guide below."}</span></p>
    </div>
  );

  const play = () => {
    if (video.current) {
      if (video.current.ended) video.current.currentTime = 0;
      // Playback starts only from this action or the native controls, including with reduced motion.
      void video.current.play().catch(() => { setPlaying(false); });
    } else setPlaying(true);
  };
  const frames = media.resolvedFrames ?? [media.resolvedSrc];

  return (
    <div ref={container} className="media-slot movement-media">
      {media.kind === "video" ? <>
        <div className="movement-film">
          <video ref={video} className="media-video" src={media.resolvedSrc} poster={media.resolvedPoster}
            controls playsInline muted loop={started} preload="none" aria-label={`${exercise.name} demonstration`}
            onPlay={() => { setPlaying(true); setStarted(true); }} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setStarted(false); }} onError={() => setFailed(true)} />
          {!started && <button className="movement-film-start" onClick={play} aria-label={`Play ${exercise.name} demonstration`}>
            <span><Play size={23} fill="currentColor" aria-hidden="true" /></span><strong>Watch the movement</strong>
          </button>}
        </div>
        <div className="movement-playback">
          <span className="movement-media-label">Movement film</span>
          <div className="movement-speed" role="group" aria-label="Playback speed">
            {[0.5, 1].map((rate) => <button key={rate} aria-pressed={speed === rate} onClick={() => { setSpeed(rate); if (video.current) video.current.playbackRate = rate; }}>{rate}×</button>)}
          </div>
          {started && <button className="movement-pause" onClick={() => playing ? video.current?.pause() : play()} aria-label={playing ? "Pause demonstration" : "Resume demonstration"}>
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>}
        </div>
      </> : media.kind === "image" ? <>
        <div className="movement-positions">
          <img className="movement-position" src={frames[position]} alt={`${exercise.name}, illustrated position ${position + 1} of ${frames.length}`}
            loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </div>
        <div className="movement-playback">
          <span className="movement-media-label">Illustrated positions</span>
          {frames.length > 1 && <div className="movement-position-controls" role="group" aria-label="Illustrated positions">
            <button onClick={() => setPosition((position + frames.length - 1) % frames.length)} aria-label="Previous position"><ChevronLeft size={18} /></button>
            <span aria-live="polite">{position + 1} / {frames.length}</span>
            <button onClick={() => setPosition((position + 1) % frames.length)} aria-label="Next position"><ChevronRight size={18} /></button>
          </div>}
        </div>
      </> : <>
        <div className="movement-gif">
          {(playing || media.resolvedPoster) && <img className="media-gif" src={playing ? media.resolvedSrc : media.resolvedPoster} alt={`${exercise.name} demonstration`} onError={() => setFailed(true)} />}
          <button className="movement-gif-toggle" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? "Pause demonstration" : "Play demonstration"}</button>
        </div>
      </>}
      {media.variantNote && <p className="movement-variant">{media.variantNote}</p>}
      <MediaCredit media={media} />
    </div>
  );
}

function MediaCredit({ media }: { media: ResolvedMedia }) {
  return <div className="movement-credits">
    <p>{media.attribution ?? "Licensed movement media"}{media.licenseUrl && <> · <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.licenseId?.replaceAll("-", " ")}</a></>}</p>
    <details><summary>Source &amp; credits</summary>
      {media.sourceUrl && <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer">View original source ↗</a>}
      <p>{media.changes}</p>
      {!media.techniqueReviewed && <p>Technique review pending. Use the written cues alongside this visual reference.</p>}
    </details>
  </div>;
}

export default MovementMedia;
