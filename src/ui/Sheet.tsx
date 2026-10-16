import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

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
  labelledBy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

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
      aria-label={labelledBy ? undefined : title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="document">
        <div className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2 id={labelledBy}>{title}</h2>
          <button
            type="button"
            className="sheet-close"
            aria-label={`Close ${title}`}
            onClick={onClose}
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
