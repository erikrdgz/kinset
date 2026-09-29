import { describe, expect, it } from "vitest";
import { exercises } from "./domain";
import { guides } from "./guides";

describe("exercise instruction coverage", () => {
  it.each(exercises)(
    "provides a complete written guide for $name",
    (exercise) => {
      const guide = guides[exercise.id];
      expect(guide).toBeDefined();
      expect(guide.setup.trim().length).toBeGreaterThan(0);
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      expect(guide.steps.every((step) => step.trim().length > 0)).toBe(true);
      expect(guide.breathing.trim().length).toBeGreaterThan(0);
      expect(guide.avoid.trim().length).toBeGreaterThan(0);
    },
  );
});
