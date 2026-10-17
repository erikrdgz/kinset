import { useEffect, useRef, type CSSProperties } from "react";
import "./brand-intro.css";

/**
 * The cold open, shown once per tab before sign-in.
 *
 * Two beats: the K tears in, white on black, then the rest of the wordmark slides out
 * from behind it.
 *
 * The tear is the portfolio card's effect, reused rather than reinvented — solid colour
 * layers masked to the mark, torn apart in hard `steps(1)` jumps, with a ghost offset,
 * dark slices cutting through and a warm echo. Two changes from the card: the cadence,
 * because there the burst fires late in a loop so the logo sits still and occasionally
 * tears, whereas here the tear is the entrance; and the scanline and tracking overlays
 * are dropped, so the mark reads as solid white rather than striped.
 */
export function BrandIntro({
  onExitStart,
  onComplete,
}: {
  /** Fires as the overlay begins fading, so the page beneath can enter underneath it. */
  onExitStart?: () => void;
  onComplete: () => void;
}) {
  const done = useRef(false);
  /** Dev-only: ?introslow runs the timeline at a sixth speed for inspection. */
  const slow =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("introslow");

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onComplete();
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reduced motion gets the mark, still, and a short fade. Nothing is lost: the
    // animation carries nothing the sign-in screen does not.
    const reduced = motion.matches;
    const scale = slow ? 6 : 1;
    // The page starts arriving while the overlay is still fading, so the two overlap
    // rather than reading as two separate events.
    const exitAt = reduced ? 160 : 1180 * scale;
    const doneAt = reduced ? 360 : 1500 * scale;
    const exitTimer = window.setTimeout(() => onExitStart?.(), exitAt);
    const timer = window.setTimeout(finish, doneAt);
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ")
        finish();
    };
    const preferenceChanged = () => {
      if (motion.matches) finish();
    };
    document.addEventListener("keydown", skip);
    motion.addEventListener("change", preferenceChanged);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(timer);
      document.removeEventListener("keydown", skip);
      motion.removeEventListener("change", preferenceChanged);
    };
  }, [onComplete, onExitStart, slow]);

  const marks = {
    "--mark-k": `url(${import.meta.env.BASE_URL}kinset-k.svg)`,
    "--mark-full": `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)`,
  } as CSSProperties;

  return (
    <div
      className={slow ? "brand-intro bi-slow" : "brand-intro"}
      role="status"
      aria-label="Kinset"
      // A tap anywhere skips it, so it never stands between someone and signing in.
      onClick={() => {
        if (done.current) return;
        done.current = true;
        onExitStart?.();
        onComplete();
      }}
    >
      <div className="brand-intro-stage" style={marks} aria-hidden="true">
        {/* Scale and translate live on separate elements so they compose predictably:
            the stage zooms, the track slides. */}
        <div className="bi-track">

        {/* Beat one: the K alone, torn in. */}
        <span className="bi-layer bi-k bi-k-ghost" />
        <span className="bi-layer bi-k bi-k-base" />
        <span className="bi-layer bi-k bi-k-tear" />
        <span className="bi-layer bi-k bi-k-echo" />

        {/* Beat two: the full wordmark wipes out from behind it. */}
        <span className="bi-layer bi-full bi-full-base" />
        <span className="bi-layer bi-full bi-full-echo" />
        </div>
      </div>
    </div>
  );
}

export default BrandIntro;
