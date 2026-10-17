import { useEffect, type CSSProperties } from "react";
import "./auth-transition.css";

/** A single, bounded brand reveal. It never waits for network or journal loading. */
export function AuthTransition({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setTimeout(onComplete, motion.matches ? 160 : 920);
    const preferenceChanged = () => { if (motion.matches) onComplete(); };
    const skip = (event: KeyboardEvent) => { if (event.key === "Escape") onComplete(); };
    motion.addEventListener("change", preferenceChanged);
    document.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", preferenceChanged);
      document.removeEventListener("keydown", skip);
    };
  }, [onComplete]);
  const wordmark = { "--entry-wordmark": `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)` } as CSSProperties;
  return <div className="auth-transition" role="status" aria-label="Opening Kinset">
    <div className="auth-transition-mark" style={wordmark} aria-hidden="true">
      <span className="auth-transition-base" />
      <span className="auth-transition-slice auth-transition-slice-a" />
      <span className="auth-transition-slice auth-transition-slice-b" />
      <i className="auth-transition-rule" />
    </div>
  </div>;
}
