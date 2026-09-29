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
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className="kinset-select" aria-label={label}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="kinset-select-icon">
          <ChevronDown size={20} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
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
