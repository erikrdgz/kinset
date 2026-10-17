/** Gesture state is independent of rendering so accidental completion is testable. */
export type FinishGesture = {
  mode: "idle" | "dragging" | "keyboard" | "committed";
  value: number;
  pointerId?: number;
  startX?: number;
  startY?: number;
  travel?: number;
};
export type FinishGestureAction =
  | { type: "start"; pointerId: number; x: number; y: number; travel: number }
  | { type: "move" | "release"; pointerId: number; x: number; y: number }
  | { type: "cancel" }
  | { type: "key"; key: string; repeat?: boolean }
  | { type: "accessibleActivate" };

export const initialFinishGesture: FinishGesture = { mode: "idle", value: 0 };
export const FINISH_THRESHOLD = .92;

function moved(state: FinishGesture, x: number, y: number): FinishGesture {
  const dx = x - state.startX!;
  const dy = Math.abs(y - state.startY!);
  // A vertical gesture belongs to page scrolling, even if it began on the thumb.
  if (dy > 48 || (dy > 10 && dy > Math.abs(dx))) return initialFinishGesture;
  return { ...state, value: Math.max(0, Math.min(1, dx / state.travel!)) };
}

export function nextFinishGesture(state: FinishGesture, action: FinishGestureAction): FinishGesture {
  // A successful gesture is one-shot, including further pointer or key events.
  if (state.mode === "committed") return state;
  switch (action.type) {
    case "start":
      if (state.mode === "dragging" || action.travel <= 0) return state;
      return { mode: "dragging", value: 0, pointerId: action.pointerId, startX: action.x, startY: action.y, travel: action.travel };
    case "move":
    case "release": {
      if (state.mode !== "dragging" || state.pointerId !== action.pointerId) return state;
      const next = moved(state, action.x, action.y);
      if (action.type === "move") return next;
      return next.mode === "dragging" && next.value >= FINISH_THRESHOLD
        ? { mode: "committed", value: 1 }
        : initialFinishGesture;
    }
    case "cancel":
      return initialFinishGesture;
    case "accessibleActivate":
      return state.mode === "keyboard" && state.value === 1
        ? { mode: "committed", value: 1 }
        : { mode: "keyboard", value: 1 };
    case "key": {
      if (state.mode === "dragging") return state;
      if (action.key === "Escape" || action.key === "Home") return initialFinishGesture;
      if (action.key === "End") return { mode: "keyboard", value: 1 };
      if (action.key === "ArrowRight" || action.key === "ArrowUp") return { mode: "keyboard", value: Math.min(1, Math.round((state.value + .1) * 10) / 10) };
      if (action.key === "ArrowLeft" || action.key === "ArrowDown") return { mode: "keyboard", value: Math.max(0, Math.round((state.value - .1) * 10) / 10) };
      if (action.key === "Enter" && !action.repeat && state.mode === "keyboard" && state.value === 1) return { mode: "committed", value: 1 };
      return state;
    }
  }
}
