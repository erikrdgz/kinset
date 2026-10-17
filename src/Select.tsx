import { useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

/** Shared branded picker; Radix handles focus, typeahead and keyboard navigation. */
export function Select({
  value,
  onValueChange,
  options,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  label: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  /**
   * A modal <dialog> makes everything outside it inert, so a menu portalled to the
   * body renders where nothing can see or click it. Inside one, the portal targets
   * the dialog instead. Resolved on open rather than at mount, because the trigger is
   * not in the document yet on the first render.
   */
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open)
          setContainer(trigger.current?.closest("dialog") ?? document.body);
      }}
    >
      <SelectPrimitive.Trigger
        ref={trigger}
        className="kinset-select"
        aria-label={label}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="kinset-select-icon">
          <ChevronDown size={20} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container ?? undefined}>
        <SelectPrimitive.Content
          className="kinset-select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="kinset-select-scroll">
            <ChevronUp size={18} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {options.map((option) => {
              const item =
                typeof option === "string"
                  ? { value: option, label: option }
                  : option;
              return (
                <SelectPrimitive.Item
                  className="kinset-select-option"
                  key={item.value}
                  value={item.value}
                >
                  <SelectPrimitive.ItemText>
                    {item.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={18} strokeWidth={3} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="kinset-select-scroll">
            <ChevronDown size={18} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
