/**
 * The structured exercise catalog.
 *
 * Every one of the thirty original IDs is preserved exactly; history resolves through
 * these IDs and retiring one would damage it. What is added here is the structure the
 * redesign needs and the old flat `Exercise` record could not express:
 *
 * - precise primary and supporting muscles, instead of one broad browse category, so a
 *   curl no longer highlights the whole Arms group;
 * - movement patterns, so a substitution can match "horizontal pull" rather than
 *   "something else labelled Back";
 * - the full equipment requirement list, so a Bodyweight label can no longer conceal
 *   the bench an incline push-up needs;
 * - measurement and load semantics, so a per-side set, a timed hold and a per-dumbbell
 *   load are distinguishable from each other and from legacy logs;
 * - review and media state, so nothing claims to be reviewed filmed instruction while
 *   that remains an external dependency.
 *
 * The muscle attributions below are drawn from the existing written guides and ordinary
 * exercise anatomy. They are NOT a qualified reviewer's sign-off; `techniqueReviewed` is
 * false on every entry until one exists. See docs/redesign-2026-10-16.
 */
import { exercises as legacyExercises } from "./legacy";
import { guides, type ExerciseGuide } from "../guides";

/** Precise muscles. Deliberately finer than the six browse groups. */
export type MuscleId =
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "erectors"
  | "lats"
  | "midback"
  | "upperTraps"
  | "rearDelts"
  | "sideDelts"
  | "frontDelts"
  | "rotatorCuff"
  | "pecs"
  | "serratus"
  | "triceps"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "hipFlexors";

export const muscleNames: Record<MuscleId, string> = {
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  adductors: "Inner thigh",
  calves: "Calves",
  erectors: "Lower back",
  lats: "Lats",
  midback: "Mid back",
  upperTraps: "Upper traps",
  rearDelts: "Rear shoulders",
  sideDelts: "Side shoulders",
  frontDelts: "Front shoulders",
  rotatorCuff: "Rotator cuff",
  pecs: "Chest",
  serratus: "Serratus",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  abs: "Abdominals",
  obliques: "Obliques",
  hipFlexors: "Hip flexors",
};

/** Which half of the body map a muscle is drawn on. */
export const muscleView: Record<MuscleId, "front" | "back"> = {
  quadriceps: "front",
  hamstrings: "back",
  glutes: "back",
  adductors: "front",
  calves: "back",
  erectors: "back",
  lats: "back",
  midback: "back",
  upperTraps: "back",
  rearDelts: "back",
  sideDelts: "front",
  frontDelts: "front",
  rotatorCuff: "back",
  pecs: "front",
  serratus: "front",
  triceps: "back",
  biceps: "front",
  forearms: "front",
  abs: "front",
  obliques: "front",
  hipFlexors: "front",
};

/**
 * Movement patterns. A substitution matches on these plus equipment, never on the broad
 * browse group alone — "same Back muscle" is how a pulldown becomes a glute bridge.
 */
export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "hipExtension"
  | "hipAbduction"
  | "ankleExtension"
  | "horizontalPush"
  | "verticalPush"
  | "horizontalPull"
  | "verticalPull"
  | "shoulderAbduction"
  | "shoulderFlexion"
  | "elbowFlexion"
  | "elbowExtension"
  | "antiExtension"
  | "antiRotation"
  | "carry";

export const patternNames: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge and step",
  hipExtension: "Hip extension",
  hipAbduction: "Hip abduction",
  ankleExtension: "Calf raise",
  horizontalPush: "Horizontal push",
  verticalPush: "Vertical push",
  horizontalPull: "Horizontal pull",
  verticalPull: "Vertical pull",
  shoulderAbduction: "Shoulder raise, out",
  shoulderFlexion: "Shoulder raise, front",
  elbowFlexion: "Elbow flexion",
  elbowExtension: "Elbow extension",
  antiExtension: "Anti-extension",
  antiRotation: "Anti-rotation",
  carry: "Carry",
};

/**
 * Concrete equipment. The availability predicate checks that EVERY item is present;
 * "Bodyweight" is a loading type, not proof that nothing is needed.
 */
export type EquipmentItem =
  | "floorSpace"
  | "dumbbellSingle"
  | "dumbbellPair"
  | "benchOrSupport"
  | "elevatedSurface"
  | "seatWithBack"
  | "latPulldownMachine"
  | "legPressMachine";

export const equipmentNames: Record<EquipmentItem, string> = {
  floorSpace: "Floor space",
  dumbbellSingle: "One dumbbell",
  dumbbellPair: "A pair of dumbbells",
  benchOrSupport: "A stable bench or support to brace one hand",
  elevatedSurface: "A stable elevated surface",
  seatWithBack: "A seat with back support",
  latPulldownMachine: "Lat pulldown machine",
  legPressMachine: "Leg press machine",
};

/**
 * How an external load relates to the number the user types.
 * `unspecifiedLegacy` exists only for records migrated from before this distinction was
 * stored; it is never assigned to a new set, and it is labelled rather than guessed.
 */
export type LoadSemantics =
  | "none"
  | "perDumbbell"
  | "combinedExternal"
  | "machineStack"
  | "addedBodyweight"
  | "assistance"
  | "unspecifiedLegacy";

export const loadSemanticsNames: Record<LoadSemantics, string> = {
  none: "Bodyweight",
  perDumbbell: "Per dumbbell",
  combinedExternal: "Total weight held",
  machineStack: "Machine setting",
  addedBodyweight: "Added to bodyweight",
  assistance: "Assistance",
  unspecifiedLegacy: "Recorded before load type was stored",
};

/**
 * A discriminated measurement, so invalid combinations cannot be represented: a timed
 * hold does not carry reps=1, and a bodyweight movement does not carry weight=0 as if
 * zero were a load.
 */
export type Measurement =
  | { kind: "reps"; load: LoadSemantics; perSide: boolean }
  | { kind: "duration"; load: LoadSemantics; perSide: boolean }
  | { kind: "distance"; load: "none"; perSide: false };

export type Difficulty = "beginner" | "intermediate" | "advanced";

/**
 * The content workflow from 03-content-and-media.md. `published` means the movement is
 * visible to users; it does NOT imply technique review, which is tracked separately
 * because no qualified reviewer has been engaged yet.
 */
export type ReviewState =
  | "draft"
  | "technicalValidation"
  | "published"
  | "deprecated";

export type MediaRef = {
  /** Null until a media supplier is contracted. Never invent a URL to fill this. */
  provider: null | string;
  providerAssetId: null | string;
  poster: null | string;
  /** Stream-only assets must never enter a durable cache. */
  deliveryMode: "none" | "owned" | "streamOnly";
  offlineAllowed: boolean;
  attribution: null | string;
};

export type ExerciseDefinition = {
  id: string;
  version: number;
  name: string;
  aliases: string[];
  /** The broad group used for browsing. Kept for continuity with the old catalog. */
  browseGroup: "Chest" | "Back" | "Shoulders" | "Arms" | "Core" | "Legs";
  /** The legacy three-way label, retained so existing plan/equipment code keeps working. */
  browseEquipment: "Dumbbells" | "Full gym" | "Bodyweight";
  patterns: MovementPattern[];
  primaryMuscles: MuscleId[];
  supportingMuscles: MuscleId[];
  requires: EquipmentItem[];
  measurement: Measurement;
  difficulty: Difficulty;
  /** The default prescription range, parsed from the original catalog text. */
  defaultReps: { min: number; max: number };
  cue: string;
  guide: ExerciseGuide;
  review: {
    state: ReviewState;
    /** False across the whole catalog until a qualified reviewer signs off. */
    techniqueReviewed: boolean;
    reviewedBy: null | string;
    reviewedAt: null | string;
  };
  media: MediaRef;
};

/** No media is contracted, so every entry starts from the same honest empty state. */
const noMedia: MediaRef = {
  provider: null,
  providerAssetId: null,
  poster: null,
  deliveryMode: "none",
  offlineAllowed: false,
  attribution: null,
};

const unreviewed = {
  state: "published" as const,
  techniqueReviewed: false,
  reviewedBy: null,
  reviewedAt: null,
};

/** The structured half of each definition, keyed by the original stable ID. */
type Structure = Pick<
  ExerciseDefinition,
  | "patterns"
  | "primaryMuscles"
  | "supportingMuscles"
  | "requires"
  | "difficulty"
  | "aliases"
> & { load: LoadSemantics };

const structure: Record<string, Structure> = {
  goblet: {
    patterns: ["squat"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["adductors", "erectors", "abs", "frontDelts"],
    requires: ["dumbbellSingle"],
    difficulty: "beginner",
    aliases: ["Goblet squat", "Front-loaded squat"],
    load: "combinedExternal",
  },
  floor: {
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts"],
    requires: ["dumbbellPair", "floorSpace"],
    difficulty: "beginner",
    aliases: ["Floor press", "DB floor press"],
    load: "perDumbbell",
  },
  row: {
    patterns: ["horizontalPull"],
    primaryMuscles: ["lats", "midback"],
    supportingMuscles: ["biceps", "rearDelts", "forearms"],
    requires: ["dumbbellSingle", "benchOrSupport"],
    difficulty: "beginner",
    aliases: ["One-arm row", "Single-arm dumbbell row"],
    load: "combinedExternal",
  },
  rdl: {
    patterns: ["hinge"],
    primaryMuscles: ["hamstrings", "glutes"],
    supportingMuscles: ["erectors", "lats", "forearms"],
    requires: ["dumbbellPair"],
    difficulty: "intermediate",
    aliases: ["RDL", "Romanian deadlift", "Stiff-leg deadlift"],
    load: "perDumbbell",
  },
  press: {
    patterns: ["verticalPush"],
    primaryMuscles: ["frontDelts", "sideDelts"],
    supportingMuscles: ["triceps", "upperTraps", "abs"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Overhead press", "Shoulder press", "OHP"],
    load: "perDumbbell",
  },
  curl: {
    patterns: ["elbowFlexion"],
    primaryMuscles: ["biceps"],
    supportingMuscles: ["forearms"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Biceps curl", "DB curl"],
    load: "perDumbbell",
  },
  squat: {
    patterns: ["squat"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["adductors", "erectors", "abs"],
    requires: [],
    difficulty: "beginner",
    aliases: ["Air squat", "Bodyweight squat"],
    load: "none",
  },
  pushup: {
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts", "abs", "serratus"],
    requires: ["elevatedSurface"],
    difficulty: "beginner",
    aliases: ["Incline push-up", "Elevated push-up"],
    load: "none",
  },
  bridge: {
    patterns: ["hipExtension"],
    primaryMuscles: ["glutes"],
    supportingMuscles: ["hamstrings", "erectors", "abs"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    aliases: ["Glute bridge", "Hip bridge"],
    load: "none",
  },
  bird: {
    patterns: ["antiRotation", "antiExtension"],
    primaryMuscles: ["abs", "erectors"],
    supportingMuscles: ["obliques", "glutes", "sideDelts"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    aliases: ["Bird dog", "Quadruped opposite reach"],
    load: "none",
  },
  pulldown: {
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["biceps", "midback", "rearDelts", "forearms"],
    requires: ["latPulldownMachine"],
    difficulty: "beginner",
    aliases: ["Lat pulldown", "Pulldown"],
    load: "machineStack",
  },
  legpress: {
    patterns: ["squat"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["hamstrings", "adductors", "calves"],
    requires: ["legPressMachine"],
    difficulty: "beginner",
    aliases: ["Leg press"],
    load: "machineStack",
  },
  sumo: {
    patterns: ["squat"],
    primaryMuscles: ["quadriceps", "glutes", "adductors"],
    supportingMuscles: ["erectors", "abs"],
    requires: ["dumbbellSingle"],
    difficulty: "beginner",
    aliases: ["Sumo squat", "Wide-stance squat"],
    load: "combinedExternal",
  },
  split: {
    patterns: ["lunge"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["hamstrings", "adductors", "abs"],
    requires: [],
    difficulty: "intermediate",
    aliases: ["Split squat", "Static lunge"],
    load: "none",
  },
  lunge: {
    patterns: ["lunge"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["hamstrings", "adductors", "abs"],
    requires: [],
    difficulty: "intermediate",
    aliases: ["Reverse lunge", "Step-back lunge"],
    load: "none",
  },
  calf: {
    patterns: ["ankleExtension"],
    primaryMuscles: ["calves"],
    supportingMuscles: [],
    requires: [],
    difficulty: "beginner",
    aliases: ["Calf raise", "Heel raise"],
    load: "none",
  },
  dbcalf: {
    patterns: ["ankleExtension"],
    primaryMuscles: ["calves"],
    supportingMuscles: ["forearms"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Loaded calf raise"],
    load: "perDumbbell",
  },
  goodmorning: {
    patterns: ["hinge"],
    primaryMuscles: ["hamstrings", "glutes"],
    supportingMuscles: ["erectors"],
    requires: [],
    difficulty: "beginner",
    aliases: ["Good morning", "Hip hinge drill"],
    load: "none",
  },
  bentrow: {
    patterns: ["horizontalPull"],
    primaryMuscles: ["lats", "midback"],
    supportingMuscles: ["biceps", "rearDelts", "erectors", "forearms"],
    requires: ["dumbbellPair"],
    difficulty: "intermediate",
    aliases: ["Bent-over row", "Two-arm dumbbell row"],
    load: "perDumbbell",
  },
  reversefly: {
    patterns: ["horizontalPull"],
    primaryMuscles: ["rearDelts"],
    supportingMuscles: ["midback", "rotatorCuff"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Reverse fly", "Rear delt fly", "Bent-over fly"],
    load: "perDumbbell",
  },
  lateral: {
    patterns: ["shoulderAbduction"],
    primaryMuscles: ["sideDelts"],
    supportingMuscles: ["upperTraps", "rotatorCuff"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Lateral raise", "Side raise"],
    load: "perDumbbell",
  },
  frontraise: {
    patterns: ["shoulderFlexion"],
    primaryMuscles: ["frontDelts"],
    supportingMuscles: ["upperTraps", "abs"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Front raise"],
    load: "perDumbbell",
  },
  hammer: {
    patterns: ["elbowFlexion"],
    primaryMuscles: ["biceps", "forearms"],
    supportingMuscles: [],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Hammer curl", "Neutral-grip curl"],
    load: "perDumbbell",
  },
  altcurl: {
    patterns: ["elbowFlexion"],
    primaryMuscles: ["biceps"],
    supportingMuscles: ["forearms"],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    aliases: ["Alternating curl"],
    load: "perDumbbell",
  },
  seatedpress: {
    patterns: ["verticalPush"],
    primaryMuscles: ["frontDelts", "sideDelts"],
    supportingMuscles: ["triceps", "upperTraps"],
    requires: ["dumbbellPair", "seatWithBack"],
    difficulty: "beginner",
    aliases: ["Seated shoulder press", "Seated overhead press"],
    load: "perDumbbell",
  },
  closefloor: {
    patterns: ["horizontalPush", "elbowExtension"],
    primaryMuscles: ["pecs", "triceps"],
    supportingMuscles: ["frontDelts"],
    requires: ["dumbbellPair", "floorSpace"],
    difficulty: "beginner",
    aliases: ["Close-grip floor press", "Narrow floor press"],
    load: "perDumbbell",
  },
  deadbug: {
    patterns: ["antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques", "hipFlexors"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    aliases: ["Dead bug"],
    load: "none",
  },
  donkey: {
    patterns: ["hipExtension"],
    primaryMuscles: ["glutes"],
    supportingMuscles: ["hamstrings", "erectors", "abs"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    aliases: ["Donkey kick", "Quadruped hip extension"],
    load: "none",
  },
  hydrant: {
    patterns: ["hipAbduction"],
    primaryMuscles: ["glutes"],
    supportingMuscles: ["obliques", "abs"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    aliases: ["Fire hydrant"],
    load: "none",
  },
  narrowpushup: {
    patterns: ["horizontalPush", "elbowExtension"],
    primaryMuscles: ["pecs", "triceps"],
    supportingMuscles: ["frontDelts", "abs"],
    requires: ["elevatedSurface"],
    difficulty: "intermediate",
    aliases: ["Close-hand push-up", "Diamond-ish push-up"],
    load: "none",
  },
};

function parseReps(text: string) {
  const numbers = text.match(/\d+/g)!.map(Number);
  return { min: numbers[0], max: numbers[1] ?? numbers[0] };
}

/**
 * Built from the original catalog so the two can never disagree about a name, group or
 * default prescription. A missing structure entry throws at module load rather than
 * shipping a half-described movement.
 */
export const exerciseDefinitions: ExerciseDefinition[] = legacyExercises.map(
  (e) => {
    const s = structure[e.id];
    if (!s) throw new Error(`No structured definition for exercise "${e.id}".`);
    const perSide = e.reps.includes("/ side");
    return {
      id: e.id,
      version: 1,
      name: e.name,
      aliases: s.aliases,
      browseGroup: e.muscle,
      browseEquipment: e.equipment,
      patterns: s.patterns,
      primaryMuscles: s.primaryMuscles,
      supportingMuscles: s.supportingMuscles,
      requires: s.requires,
      measurement: { kind: "reps", load: s.load, perSide },
      difficulty: s.difficulty,
      defaultReps: parseReps(e.reps),
      cue: e.cue,
      guide: guides[e.id],
      review: unreviewed,
      media: noMedia,
    };
  },
);

const byId = new Map(exerciseDefinitions.map((e) => [e.id, e]));

export function findExercise(id: string) {
  return byId.get(id);
}

/**
 * History must render even for an ID this build has never heard of — a movement
 * deprecated in a later release, or a record restored from an export. The caller gets a
 * readable placeholder carrying the raw ID instead of a crash.
 */
export function resolveExerciseName(id: string, snapshotName?: string) {
  return byId.get(id)?.name ?? snapshotName ?? `Unknown movement (${id})`;
}

export const publishedExercises = exerciseDefinitions.filter(
  (e) => e.review.state === "published",
);

/** Every piece of equipment the user would need to run this list, deduplicated. */
export function equipmentUnion(ids: string[]): EquipmentItem[] {
  const union = new Set<EquipmentItem>();
  for (const id of ids)
    for (const item of byId.get(id)?.requires ?? []) union.add(item);
  return [...union];
}

/**
 * True only when EVERY required piece is available. This is the predicate the audit
 * asked for: a "Bodyweight" incline push-up still needs a stable elevated surface, and
 * claiming otherwise is how someone arrives at a workout they cannot do.
 */
export function canPerform(
  exercise: ExerciseDefinition,
  available: ReadonlySet<EquipmentItem>,
) {
  return exercise.requires.every((item) => available.has(item));
}

/**
 * The equipment someone plausibly has, derived from the coarse onboarding answer. This
 * is an assumption about a bucket, not an inventory: the redesign's onboarding replaces
 * it with explicit chips, and until then the bench and machine requirements are the ones
 * most likely to be wrong.
 */
export function assumedEquipment(
  bucket: "Dumbbells" | "Full gym" | "Bodyweight",
): Set<EquipmentItem> {
  const base: EquipmentItem[] = ["floorSpace"];
  if (bucket === "Bodyweight") return new Set([...base, "elevatedSurface"]);
  if (bucket === "Dumbbells")
    return new Set([
      ...base,
      "dumbbellSingle",
      "dumbbellPair",
      "elevatedSurface",
      "benchOrSupport",
      "seatWithBack",
    ]);
  return new Set([
    ...base,
    "dumbbellSingle",
    "dumbbellPair",
    "elevatedSurface",
    "benchOrSupport",
    "seatWithBack",
    "latPulldownMachine",
    "legPressMachine",
  ]);
}

/** How a set's load should be labelled in the UI for this movement. */
export function loadLabel(exercise: ExerciseDefinition) {
  return loadSemanticsNames[exercise.measurement.load];
}
