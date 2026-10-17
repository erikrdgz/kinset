/**
 * Choosing movements, and saying so honestly when one cannot be chosen.
 *
 * The audited selector had a quiet failure: no Back movement is labelled Bodyweight, so
 * the pull slot fell through to `program(...)[2]` — a glute bridge — and the lineup
 * presented a hip extension where a pull belonged, sometimes duplicating a leg movement
 * already picked. Nothing told the user. The rule here is that an unmet slot is reported
 * as unmet; a lineup is allowed to be short, but it is not allowed to lie about what it
 * contains.
 */
import {
  canPerform,
  equipmentNames,
  exerciseDefinitions,
  findExercise,
  patternNames,
  type EquipmentItem,
  type ExerciseDefinition,
  type MovementPattern,
} from "./exercises";

/** A slot in a balanced full-body lineup: any one of these patterns satisfies it. */
export type Slot = {
  id: string;
  label: string;
  patterns: MovementPattern[];
};

export const fullBodySlots: Slot[] = [
  { id: "legs", label: "Legs", patterns: ["squat", "hinge", "lunge"] },
  { id: "push", label: "Push", patterns: ["horizontalPush", "verticalPush"] },
  { id: "pull", label: "Pull", patterns: ["horizontalPull", "verticalPull"] },
  {
    id: "core",
    label: "Core",
    patterns: ["antiExtension", "antiRotation", "carry"],
  },
];

export type FilledSlot = {
  slot: Slot;
  exercise: ExerciseDefinition;
};

export type UnmetSlot = {
  slot: Slot;
  /** What the user would need in order to fill it. Empty when nothing would help. */
  missingEquipment: EquipmentItem[];
  reason: string;
};

export type Lineup = {
  filled: FilledSlot[];
  unmet: UnmetSlot[];
};

function seededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function matchesSlot(exercise: ExerciseDefinition, slot: Slot) {
  return exercise.patterns.some((p) => slot.patterns.includes(p));
}

/**
 * The equipment that would unlock a slot, if any single movement's full requirement list
 * were satisfied. Reported so "we could not give you a pull" can say why.
 */
function missingFor(slot: Slot, available: ReadonlySet<EquipmentItem>) {
  const candidates = exerciseDefinitions
    .filter(
      (e) =>
        e.review.state === "published" &&
        e.role === "strength" &&
        matchesSlot(e, slot),
    )
    .map((e) => e.requires.filter((item) => !available.has(item)));
  if (!candidates.length) return [];
  // The cheapest route in: the candidate needing the fewest additional pieces.
  return candidates.sort((a, b) => a.length - b.length)[0];
}

/**
 * Build a balanced lineup from what the user actually has. Deterministic for a given
 * seed. Slots that cannot be filled come back in `unmet` rather than being papered over
 * with whatever movement happened to be nearby.
 */
export function buildLineup(
  available: ReadonlySet<EquipmentItem>,
  seed: number,
  slots: Slot[] = fullBodySlots,
  prefer?: (id: string) => boolean,
): Lineup {
  const random = seededRandom(seed);
  const used = new Set<string>();
  const filled: FilledSlot[] = [];
  const unmet: UnmetSlot[] = [];

  for (const slot of slots) {
    let pool = exerciseDefinitions.filter(
      (e) =>
        e.review.state === "published" &&
        // A stretch that shares a pattern is still not a working set.
        e.role === "strength" &&
        matchesSlot(e, slot) &&
        canPerform(e, available) &&
        !used.has(e.id),
    );
    if (prefer) {
      const preferred = pool.filter((e) => prefer(e.id));
      if (preferred.length) pool = preferred;
    }
    if (!pool.length) {
      const missing = missingFor(slot, available);
      unmet.push({
        slot,
        missingEquipment: missing,
        reason: missing.length
          ? `No ${slot.label.toLowerCase()} movement fits your equipment. ${missing
              .map((m) => equipmentNames[m])
              .join(" and ")} would add one.`
          : `No ${slot.label.toLowerCase()} movement is available in the current library.`,
      });
      continue;
    }
    const pick = pool[Math.floor(random() * pool.length)];
    used.add(pick.id);
    filled.push({ slot, exercise: pick });
  }
  return { filled, unmet };
}

export type Substitution = {
  exercise: ExerciseDefinition;
  /** Why this is a defensible swap, shown to the user before they confirm. */
  reason: string;
  /** Shared movement patterns. A swap with none of these is not offered. */
  sharedPatterns: MovementPattern[];
};

/**
 * Candidate replacements for a movement, matched on pattern first and filtered by what
 * the user can actually perform. A shared browse group is explicitly not sufficient:
 * "also labelled Back" is how a pulldown becomes a glute bridge.
 *
 * Returning an empty list is a valid and honest answer. The caller should offer to skip
 * the movement rather than inventing a substitute.
 */
export function substitutionsFor(
  exerciseId: string,
  available: ReadonlySet<EquipmentItem>,
): Substitution[] {
  const original = findExercise(exerciseId);
  if (!original) return [];
  return exerciseDefinitions
    .filter(
      (e) =>
        e.id !== original.id &&
        e.review.state === "published" &&
        // A replacement has to do the same job, not merely share a pattern family.
        e.role === original.role &&
        canPerform(e, available),
    )
    .map((e) => {
      const sharedPatterns = e.patterns.filter((p) =>
        original.patterns.includes(p),
      );
      return { exercise: e, sharedPatterns };
    })
    .filter((c) => c.sharedPatterns.length > 0)
    .map(({ exercise, sharedPatterns }) => {
      const extra = exercise.requires.filter(
        (item) => !original.requires.includes(item),
      );
      const pattern = patternNames[sharedPatterns[0]].toLowerCase();
      return {
        exercise,
        sharedPatterns,
        reason: extra.length
          ? `Same ${pattern}; needs ${extra.map((m) => equipmentNames[m].toLowerCase()).join(" and ")}.`
          : `Same ${pattern}; no extra equipment.`,
      };
    })
    .sort((a, b) => b.sharedPatterns.length - a.sharedPatterns.length);
}
