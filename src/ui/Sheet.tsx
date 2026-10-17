import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const opener = useRef<Element | null>(null);
  const [closing, setClosing] = useState(false);
  const dismiss = () => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  };

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
      <div className="sheet" role="document">
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
