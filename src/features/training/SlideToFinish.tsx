import { useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowRight, Check, ChevronsRight } from "lucide-react";
import { FINISH_THRESHOLD, initialFinishGesture, nextFinishGesture, type FinishGestureAction } from "./slideFinishGesture";
import "./slide-to-finish.css";

/** Finishing is confirmed by a completed horizontal gesture, not a second dialog. */
export function SlideToFinish({ onComplete }: { onComplete: () => void }) {
  const [gesture, setGesture] = useState(initialFinishGesture);
  const current = useRef(initialFinishGesture);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [error, setError] = useState("");
  const instructions = useId();
  const committed = gesture.mode === "committed";
  const ready = gesture.value >= FINISH_THRESHOLD;

  const dispatch = (action: FinishGestureAction) => {
    const previous = current.current;
    const next = nextFinishGesture(previous, action);
    current.current = next;
    setGesture(next);
    if (next.mode === "committed" && previous.mode !== "committed") {
      try { onComplete(); }
      catch {
        current.current = initialFinishGesture;
        setGesture(initialFinishGesture);
        setError("Could not finish this workout. Try again.");
      }
    }
  };
  const measure = () => {
    const distance = Math.max(0, (track.current?.clientWidth ?? 0) - (thumb.current?.offsetWidth ?? 0) - 12);
    setTravel(distance);
    return distance;
  };
  const pointerAction = (event: PointerEvent<HTMLDivElement>, type: "move" | "release") => {
    dispatch({ type, pointerId: event.pointerId, x: event.clientX, y: event.clientY });
    if (type === "release" && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const label = committed ? "Workout finished" : ready ? (gesture.mode === "keyboard" ? "Press Enter to finish" : "Release to finish") : "Slide to finish workout";

  return <div className="slide-finish" data-state={gesture.mode} data-ready={ready || undefined}>
    <div className="slide-finish-track" ref={track} style={{ "--finish-progress": gesture.value, "--finish-travel": `${travel}px` } as CSSProperties}>
      <span className="slide-finish-fill" aria-hidden="true" />
      <span className="slide-finish-label" aria-hidden="true">{label}</span>
      <ChevronsRight className="slide-finish-destination" size={19} aria-hidden="true" />
      <div ref={thumb} className="slide-finish-thumb" role="slider" tabIndex={committed ? -1 : 0}
        aria-label="Finish workout" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(gesture.value * 100)}
        aria-valuetext={committed ? "Workout finished" : ready ? "Ready. Press Enter to finish." : `${Math.round(gesture.value * 100)} percent`}
        aria-describedby={instructions} aria-disabled={committed}
        onPointerDown={(event) => {
          if (committed || !event.isPrimary || event.button !== 0) return;
          setError("");
          const distance = measure();
          if (!distance) return;
          dispatch({ type: "start", pointerId: event.pointerId, x: event.clientX, y: event.clientY, travel: distance });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => pointerAction(event, "move")}
        onPointerUp={(event) => pointerAction(event, "release")}
        onPointerCancel={() => dispatch({ type: "cancel" })}
        onLostPointerCapture={() => { if (current.current.mode === "dragging") dispatch({ type: "cancel" }); }}
        onBlur={() => { if (current.current.mode === "keyboard") dispatch({ type: "cancel" }); }}
        onKeyDown={(event) => {
          if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End", "Escape", "Enter"].includes(event.key)) return;
          event.preventDefault();
          measure();
          dispatch({ type: "key", key: event.key, repeat: event.repeat });
        }}>
        {committed ? <Check size={22} aria-hidden="true" /> : <ArrowRight size={22} aria-hidden="true" />}
      </div>
    </div>
    <span id={instructions} className="sr-only">Drag the handle fully right and release to finish. With a keyboard, press End then Enter. Escape resets. You can also use the alternative button below.</span>
    <span className="sr-only" role="status">{committed ? "Workout finished." : gesture.mode === "keyboard" && ready ? "Ready to finish. Press Enter, or activate the confirm button." : ""}</span>
    <button type="button" className="slide-finish-accessible" disabled={committed}
      onClick={() => { measure(); dispatch({ type: "accessibleActivate" }); }}
      onBlur={() => { if (current.current.mode === "keyboard") dispatch({ type: "cancel" }); }}>
      {gesture.mode === "keyboard" && ready ? "Confirm finish workout" : "Finish workout without sliding — activate twice"}
    </button>
    {error && <p className="session-error" role="alert">{error}</p>}
  </div>;
}
