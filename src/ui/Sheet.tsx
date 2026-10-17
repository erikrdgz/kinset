import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, X } from "lucide-react";

/**
 * A bottom sheet.
 *
 * The important behaviour is what happens on dismissal: focus returns to exactly the
 * control that opened it. During a workout that control is usually a half-filled weight
 * input, and sending the user back to the top of the screen — or to a different set —
 * is the failure the contextual-help design exists to prevent.
 *
 * Built on <dialog showModal>, which gives real focus trapping, Escape handling and
 * inert background content without reimplementing any of it.
 */
export function Sheet({
  title,
  children,
  onClose,
  onBack,
  tall = false,
  labelledBy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Shown as a back control when the sheet has drilled into a second view. */
  onBack?: () => void;
  /** Lets a sheet that holds a whole screen take most of the viewport and scroll. */
  tall?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [closing, setClosing] = useState(false);
  const dismiss = () => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  };

  /**
   * Grow or shrink between views instead of snapping.
   *
   * Neither end is a fixed number — one view is auto, the other is 88dvh — and CSS
   * cannot transition from `auto`. So the previous height is carried across renders in
   * a ref: by the time an effect runs React has already applied the new size, so
   * measuring both ends inside it would compare a height to itself. The start is
   * pinned, the element animates to the measured end, then it is released back to its
   * natural size so later content changes are not stuck at a stale pixel height.
   */
  const previousHeight = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return;
    const to = el.getBoundingClientRect().height;
    const from = previousHeight.current;
    previousHeight.current = to;
    if (from === null || Math.abs(to - from) < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.blockSize = `${from}px`;
    void el.offsetHeight;
    el.style.transition = "block-size 340ms cubic-bezier(0.25, 1, 0.3, 1)";
    el.style.blockSize = `${to}px`;

    const done = () => {
      el.style.transition = "";
      el.style.blockSize = "";
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
    return () => {
      el.removeEventListener("transitionend", done);
      el.style.transition = "";
      el.style.blockSize = "";
    };
  }, [tall]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 240);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);

  useEffect(() => {
    // Remember where focus was before the sheet took it.
    opener.current = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      // Restore it, so a guide opened from a set row returns to that set row.
      const target = opener.current;
      if (target instanceof HTMLElement && document.contains(target))
        target.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet-backdrop"
      data-closing={closing || undefined}
      data-tall={tall || undefined}
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="sheet" role="document" ref={panel}>
        <div className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          {onBack && (
            <button
              type="button"
              className="sheet-back"
              aria-label="Back to profile"
              onClick={onBack}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 id={labelledBy}>{title}</h2>
          <button
            type="button"
            className="sheet-close"
            aria-label={`Close ${title}`}
            onClick={dismiss}
          >
            <X size={20} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}

export default Sheet;
