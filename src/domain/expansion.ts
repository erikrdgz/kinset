/**
 * Catalog expansion.
 *
 * The audited catalog was 43% legs and 6.7% core: thirteen lower-body movements, three
 * back, three arms with no triceps at all, and two core. You could not build a balanced
 * session from it, which is why the selector had to fall back to a glute bridge when it
 * wanted a pull.
 *
 * This is the expansion list from docs/redesign-2026-10-16/03-content-and-media.md,
 * authored here with original guides. Every entry carries `techniqueReviewed: false`,
 * because no qualified reviewer has seen any of it — mine or the original thirty. The
 * review state is data, so the app can be honest about it and the ledger can count it.
 *
 * Equipment lists are deliberately literal. A landmine press needs a landmine
 * attachment or a padded corner, not "Full gym"; an anchored band row needs something
 * that will actually hold; a pull-up needs a rated bar. The availability predicate
 * checks every item, so an unmet requirement surfaces as an unmet slot rather than a
 * movement the user cannot do.
 */
import type {
  Difficulty,
  EquipmentItem,
  LoadSemantics,
  MovementPattern,
  MuscleId,
} from "./exercises";
import type { ExerciseGuide } from "../guides";

export type AuthoredExercise = {
  id: string;
  name: string;
  aliases: string[];
  browseGroup: "Chest" | "Back" | "Shoulders" | "Arms" | "Core" | "Legs";
  browseEquipment: "Dumbbells" | "Full gym" | "Bodyweight";
  patterns: MovementPattern[];
  primaryMuscles: MuscleId[];
  supportingMuscles: MuscleId[];
  requires: EquipmentItem[];
  difficulty: Difficulty;
  measurement:
    | { kind: "reps"; load: LoadSemantics; perSide: boolean }
    | { kind: "duration"; load: LoadSemantics; perSide: boolean };
  defaultReps: { min: number; max: number };
  cue: string;
  guide: ExerciseGuide;
};

const breatheLift =
  "Breathe out through the lifting effort and in as you return with control.";
const breatheSteady =
  "Breathe steadily throughout; do not hold your breath against the brace.";

/* ------------------------------------------------------------------ chest */

const chest: AuthoredExercise[] = [
  {
    id: "wallpushup",
    name: "Wall push-up",
    aliases: ["Wall press", "Standing push-up"],
    browseGroup: "Chest",
    browseEquipment: "Bodyweight",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts", "abs"],
    requires: ["wall"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Lower your chest toward the wall with your body in one line.",
    guide: {
      setup:
        "Stand an arm's length from a wall with your hands flat on it at chest height, a little wider than your shoulders.",
      steps: [
        "Step your feet back until your weight leans into your hands.",
        "Bend your elbows to bring your chest toward the wall, keeping your body in one line from head to heels.",
        "Pause when your chest is close to the wall without letting your hips sag.",
        "Press away until your elbows are straight but not locked.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid letting your hips drop or your head poke forward ahead of your chest.",
    },
  },
  {
    id: "kneepushup",
    name: "Knee push-up",
    aliases: ["Modified push-up", "Box push-up"],
    browseGroup: "Chest",
    browseEquipment: "Bodyweight",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts", "abs", "serratus"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 6, max: 12 },
    cue: "Keep a straight line from your knees to your head as you lower.",
    guide: {
      setup:
        "Kneel on a mat with your hands under your shoulders and your knees behind your hips, so your body makes one line from knees to head.",
      steps: [
        "Brace your trunk lightly and tuck your chin so your neck stays long.",
        "Bend your elbows to about 45 degrees from your torso and lower your chest.",
        "Stop when your upper arms are roughly parallel to the floor, or sooner if your hips start to sag.",
        "Press the floor away to return, keeping your hips in line with your shoulders.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid flaring your elbows straight out to the sides, or letting your hips drop before your chest does.",
    },
  },
  {
    id: "pushupfull",
    name: "Push-up",
    aliases: ["Standard push-up", "Floor push-up"],
    browseGroup: "Chest",
    browseEquipment: "Bodyweight",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts", "abs", "serratus"],
    requires: ["floorSpace"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 5, max: 12 },
    cue: "Move your whole body as one piece, chest leading.",
    guide: {
      setup:
        "Start in a front support with your hands under your shoulders, feet about hip-width, and your body in one line from heels to head.",
      steps: [
        "Squeeze your glutes and brace your trunk so your hips neither sag nor pike.",
        "Lower your chest toward the floor with your elbows at roughly 45 degrees from your torso.",
        "Stop when your chest is a fist's height from the floor, or at the lowest point you can control.",
        "Press back up, keeping your body moving as one piece.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid your hips sagging, your head reaching for the floor ahead of your chest, or elbows flaring to 90 degrees.",
    },
  },
  {
    id: "dbbench",
    name: "Dumbbell bench press",
    aliases: ["DB bench", "Flat dumbbell press"],
    browseGroup: "Chest",
    browseEquipment: "Dumbbells",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts"],
    requires: ["dumbbellPair", "flatBench"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 6, max: 12 },
    cue: "Lower until you feel a comfortable stretch, then press.",
    guide: {
      setup:
        "Sit on a flat bench with a dumbbell on each thigh, then lie back, bringing the weights to the sides of your chest.",
      steps: [
        "Set your feet flat and keep your shoulder blades drawn down into the bench.",
        "Press both dumbbells up until your arms are straight but not locked.",
        "Lower with control until your upper arms are about level with your torso and you feel a comfortable stretch.",
        "Keep your wrists stacked over your elbows throughout.",
      ],
      breathing: "Breathe in as you lower and out as you press.",
      avoid:
        "Avoid clashing the dumbbells at the top, bouncing out of the bottom, or arching your lower back off the bench.",
    },
  },
  {
    id: "inclinedbpress",
    name: "Incline dumbbell press",
    aliases: ["Incline press", "Upper chest press"],
    browseGroup: "Chest",
    browseEquipment: "Dumbbells",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs", "frontDelts"],
    supportingMuscles: ["triceps"],
    requires: ["dumbbellPair", "inclineBench"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Press slightly back over your upper chest, not straight forward.",
    guide: {
      setup:
        "Set a bench to roughly 30 degrees. Sit with a dumbbell on each thigh and lie back, bringing the weights to the sides of your upper chest.",
      steps: [
        "Keep your shoulder blades drawn down and your ribs over your pelvis.",
        "Press the dumbbells up and slightly back so they finish over your upper chest.",
        "Lower with control to the sides of your chest.",
        "Keep the same path on every repetition.",
      ],
      breathing: "Breathe in as you lower and out as you press.",
      avoid:
        "Avoid setting the bench so steep that it becomes a shoulder press, or letting your lower back arch away from the pad.",
    },
  },
  {
    id: "machinechestpress",
    name: "Machine chest press",
    aliases: ["Seated chest press", "Chest press machine"],
    browseGroup: "Chest",
    browseEquipment: "Full gym",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["triceps", "frontDelts"],
    requires: ["chestPressMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Set the handles level with your chest, then press.",
    guide: {
      setup:
        "Adjust the seat so the handles sit roughly level with the middle of your chest. Sit back with your whole back against the pad.",
      steps: [
        "Take the handles with your wrists stacked over your elbows.",
        "Press forward until your arms are straight but not locked.",
        "Return with control until you feel a comfortable stretch across your chest.",
        "Keep your shoulders down rather than shrugged toward your ears.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid letting the stack slam down, or pushing your head and shoulders forward off the pad to finish a rep.",
    },
  },
];

/* ------------------------------------------------------------------- back */

const back: AuthoredExercise[] = [
  {
    id: "chestsupportedrow",
    name: "Chest-supported dumbbell row",
    aliases: ["Incline bench row", "Prone row"],
    browseGroup: "Back",
    browseEquipment: "Dumbbells",
    patterns: ["horizontalPull"],
    primaryMuscles: ["midback", "lats"],
    supportingMuscles: ["biceps", "rearDelts", "forearms"],
    requires: ["dumbbellPair", "inclineBench"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Let the bench hold your torso so only your arms work.",
    guide: {
      setup:
        "Set a bench to about 45 degrees and lie face down on it with a dumbbell in each hand hanging below your shoulders.",
      steps: [
        "Keep your chest in contact with the pad for the whole set.",
        "Draw your elbows back and down, leading with your elbows rather than your hands.",
        "Finish when your upper arms are roughly level with your torso.",
        "Lower under control until your arms hang straight.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid lifting your chest off the pad to heave the weight, or shrugging your shoulders toward your ears.",
    },
  },
  {
    id: "cablerow",
    name: "Seated cable row",
    aliases: ["Cable row", "Low row"],
    browseGroup: "Back",
    browseEquipment: "Full gym",
    patterns: ["horizontalPull"],
    primaryMuscles: ["midback", "lats"],
    supportingMuscles: ["biceps", "rearDelts", "erectors", "forearms"],
    requires: ["cableMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Pull to your waist with a steady torso.",
    guide: {
      setup:
        "Sit with your feet on the platform and a soft bend in your knees. Take the handle with your arms straight and your back upright.",
      steps: [
        "Set your chest tall and your shoulders down.",
        "Pull the handle toward your waist, drawing your elbows past your ribs.",
        "Pause briefly without letting your shoulders roll forward.",
        "Return with control until your arms are straight and you feel a stretch across your upper back.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid rowing with your whole torso swinging back and forth, or rounding your back as the weight returns.",
    },
  },
  {
    id: "bandrow",
    name: "Anchored band row",
    aliases: ["Band row", "Resistance band row"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["horizontalPull"],
    primaryMuscles: ["midback", "lats"],
    supportingMuscles: ["biceps", "rearDelts", "forearms"],
    requires: ["bandWithAnchor"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Pull the handles to your ribs, elbows close.",
    guide: {
      setup:
        "Anchor a band at about chest height to something that will genuinely hold. Hold an end in each hand and step back until the band is lightly taut.",
      steps: [
        "Stand tall with a soft bend in your knees and your arms straight ahead.",
        "Pull both hands toward your ribs, keeping your elbows close to your sides.",
        "Pause when your hands reach your torso.",
        "Let the band draw your arms forward again under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid anchoring to anything that could come loose, and avoid leaning back to make the pull easier.",
    },
  },
  {
    id: "assistedpullup",
    name: "Assisted pull-up",
    aliases: ["Machine pull-up", "Counterweight pull-up"],
    browseGroup: "Back",
    browseEquipment: "Full gym",
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["biceps", "midback", "forearms"],
    requires: ["assistedPullUpMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "assistance", perSide: false },
    defaultReps: { min: 5, max: 10 },
    cue: "More assistance means an easier rep, not a heavier one.",
    guide: {
      setup:
        "Set the assistance weight, kneel or stand on the pad, and take the handles a little wider than your shoulders.",
      steps: [
        "Start from a full hang with your arms straight and your shoulders active.",
        "Pull your elbows down and back until your chin clears the bar.",
        "Pause briefly at the top without craning your neck.",
        "Lower under control all the way to straight arms.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid bouncing out of the bottom. Note that on this machine a higher number is more help, not more load.",
    },
  },
  {
    id: "pullup",
    name: "Pull-up",
    aliases: ["Overhand pull-up"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["biceps", "midback", "forearms", "abs"],
    requires: ["pullUpBar"],
    difficulty: "advanced",
    measurement: { kind: "reps", load: "addedBodyweight", perSide: false },
    defaultReps: { min: 3, max: 8 },
    cue: "Lead with your elbows, finish with your chest toward the bar.",
    guide: {
      setup:
        "Take an overhand grip a little wider than your shoulders on a bar rated for your bodyweight.",
      steps: [
        "Hang with straight arms and draw your shoulder blades down.",
        "Pull your elbows down toward your ribs until your chin passes the bar.",
        "Keep your ribs down rather than arching hard through your lower back.",
        "Lower all the way to a full hang under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid kipping to grind out extra reps, and avoid dropping out of the bottom rather than lowering.",
    },
  },
  {
    id: "chinup",
    name: "Chin-up",
    aliases: ["Underhand pull-up"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["verticalPull", "elbowFlexion"],
    primaryMuscles: ["lats", "biceps"],
    supportingMuscles: ["midback", "forearms", "abs"],
    requires: ["pullUpBar"],
    difficulty: "advanced",
    measurement: { kind: "reps", load: "addedBodyweight", perSide: false },
    defaultReps: { min: 3, max: 8 },
    cue: "Underhand grip; your biceps take a larger share here.",
    guide: {
      setup:
        "Take an underhand grip about shoulder-width on a bar rated for your bodyweight.",
      steps: [
        "Hang with straight arms and your shoulders drawn down.",
        "Pull until your chin clears the bar, keeping your elbows close to your body.",
        "Pause briefly without swinging.",
        "Lower under control to a full hang.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid swinging your legs to generate momentum, and stop the set if your elbows feel strained.",
    },
  },
  {
    id: "bandpulldown",
    name: "Anchored band pulldown",
    aliases: ["Band lat pulldown", "High band pulldown"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["biceps", "midback", "rearDelts"],
    requires: ["bandWithAnchor"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Pull the band down toward your chest, elbows driving down.",
    guide: {
      setup:
        "Anchor a band well above head height to something secure. Kneel or stand and take an end in each hand with your arms overhead.",
      steps: [
        "Start with your arms straight and a little tension already in the band.",
        "Pull your elbows down and slightly back toward your ribs.",
        "Finish with your hands near your collarbones and your chest tall.",
        "Let your arms return overhead under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid leaning far back to turn this into a row, and check the anchor before every set.",
    },
  },
  {
    id: "straightarmpulldown",
    name: "Straight-arm cable pulldown",
    aliases: ["Straight-arm pullover", "Lat pushdown"],
    browseGroup: "Back",
    browseEquipment: "Full gym",
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["triceps", "abs"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Sweep straight arms down to your thighs.",
    guide: {
      setup:
        "Set the cable high and take a bar or rope. Step back, hinge slightly at your hips and let your arms reach up toward the pulley.",
      steps: [
        "Keep a small, fixed bend in your elbows for the whole set.",
        "Sweep your arms down in an arc until your hands reach your thighs.",
        "Pause briefly with your lats engaged.",
        "Let your arms rise again under control without shrugging.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid turning this into a triceps pushdown by bending and straightening your elbows.",
    },
  },
  {
    id: "machinerow",
    name: "Machine row",
    aliases: ["Seated row machine", "Chest-supported machine row"],
    browseGroup: "Back",
    browseEquipment: "Full gym",
    patterns: ["horizontalPull"],
    primaryMuscles: ["midback", "lats"],
    supportingMuscles: ["biceps", "rearDelts", "forearms"],
    requires: ["rowMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Chest stays on the pad; pull with your back.",
    guide: {
      setup:
        "Adjust the seat so the handles sit at roughly mid-chest height and your chest rests against the pad.",
      steps: [
        "Take the handles with your arms straight and your shoulders down.",
        "Pull your elbows back past your ribs, keeping your chest on the pad.",
        "Pause briefly at the back of the movement.",
        "Return with control until your arms are straight.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid pushing your chest off the pad to finish a rep, or letting the stack drop at the end of the set.",
    },
  },
];

/* -------------------------------------------------------------- shoulders */

const shoulders: AuthoredExercise[] = [
  {
    id: "pikepushup",
    name: "Pike push-up",
    aliases: ["Pike press", "Bodyweight shoulder press"],
    browseGroup: "Shoulders",
    browseEquipment: "Bodyweight",
    patterns: ["verticalPush"],
    primaryMuscles: ["frontDelts", "sideDelts"],
    supportingMuscles: ["triceps", "upperTraps", "serratus"],
    requires: ["floorSpace"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 5, max: 10 },
    cue: "Hips high; lower the crown of your head toward the floor.",
    guide: {
      setup:
        "From a front support, walk your feet in and lift your hips so your body makes an inverted V with your hands under your shoulders.",
      steps: [
        "Keep your hips high and your weight shifted over your hands.",
        "Bend your elbows to lower the top of your head toward the floor between your hands.",
        "Stop just short of the floor, or at the lowest point you control.",
        "Press back up until your arms are straight.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid letting your hips drift back into a push-up, and stop if your wrists or neck feel strained.",
    },
  },
  {
    id: "landmine",
    name: "Landmine press",
    aliases: ["Angled press", "Corner press"],
    browseGroup: "Shoulders",
    browseEquipment: "Full gym",
    patterns: ["verticalPush"],
    primaryMuscles: ["frontDelts"],
    supportingMuscles: ["pecs", "triceps", "abs", "serratus"],
    requires: ["landmineOrCorner"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "combinedExternal", perSide: true },
    defaultReps: { min: 8, max: 12 },
    cue: "Press up and forward along the bar's arc.",
    guide: {
      setup:
        "Set one end of a barbell in a landmine sleeve or a padded corner. Hold the free end at shoulder height in one hand, standing in a staggered stance.",
      steps: [
        "Brace your trunk and keep your ribs over your pelvis.",
        "Press the bar up and forward, following the arc it naturally travels.",
        "Finish with your arm straight and your shoulder moving freely.",
        "Lower back to your shoulder under control, then finish the reps and switch sides.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid leaning away from the bar to complete a rep, and protect walls and floors if you are improvising the anchor.",
    },
  },
  {
    id: "cablelateral",
    name: "Cable lateral raise",
    aliases: ["Cable side raise"],
    browseGroup: "Shoulders",
    browseEquipment: "Full gym",
    patterns: ["shoulderAbduction"],
    primaryMuscles: ["sideDelts"],
    supportingMuscles: ["upperTraps", "rotatorCuff"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: true },
    defaultReps: { min: 10, max: 15 },
    cue: "Lead with your elbow, out to the side.",
    guide: {
      setup:
        "Set a cable at its lowest point and stand side-on, taking the handle in the hand furthest from the machine.",
      steps: [
        "Stand tall with a small, fixed bend in your elbow.",
        "Raise your arm out to the side, leading with your elbow rather than your hand.",
        "Stop at about shoulder height.",
        "Lower slowly against the cable's pull, then finish the reps and switch sides.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid shrugging your shoulder up to your ear, or swinging your torso to start the rep.",
    },
  },
  {
    id: "facepull",
    name: "Face pull",
    aliases: ["Rope face pull", "High rear-delt pull"],
    browseGroup: "Shoulders",
    browseEquipment: "Full gym",
    patterns: ["horizontalPull"],
    primaryMuscles: ["rearDelts"],
    supportingMuscles: ["midback", "rotatorCuff", "upperTraps"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 12, max: 15 },
    cue: "Pull the rope toward your forehead, hands splitting apart.",
    guide: {
      setup:
        "Set a cable at roughly head height with a rope attachment. Take an end in each hand with your thumbs pointing back, and step away until the cable is taut.",
      steps: [
        "Stand tall with a soft bend in your knees and your arms extended.",
        "Pull the rope toward your forehead, letting your hands separate as they travel.",
        "Finish with your elbows high and roughly level with your shoulders.",
        "Return with control until your arms are straight.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid dropping your elbows so it becomes a row, or leaning back to move a heavier stack.",
    },
  },
  {
    id: "bandexternalrotation",
    name: "Band external rotation",
    aliases: ["External rotation", "Rotator cuff rotation"],
    browseGroup: "Shoulders",
    browseEquipment: "Bodyweight",
    patterns: ["rotation"],
    primaryMuscles: ["rotatorCuff"],
    supportingMuscles: ["rearDelts"],
    requires: ["resistanceBand"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: true },
    defaultReps: { min: 12, max: 15 },
    cue: "Elbow pinned to your side; rotate your forearm outward.",
    guide: {
      setup:
        "Hold a light band with both hands, elbows bent to 90 degrees and tucked against your sides, forearms pointing forward.",
      steps: [
        "Keep your elbows in contact with your ribs for the whole set.",
        "Rotate one or both forearms outward against the band.",
        "Stop where the movement is still smooth and controlled.",
        "Return slowly to the start.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid letting your elbow drift away from your side, and keep the band light — this is a control exercise, not a strength test.",
    },
  },
];

/* ------------------------------------------------------------------- arms */

const arms: AuthoredExercise[] = [
  {
    id: "ropepushdown",
    name: "Rope triceps pushdown",
    aliases: ["Pushdown", "Rope extension"],
    browseGroup: "Arms",
    browseEquipment: "Full gym",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: [],
    requires: ["cableMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Elbows stay at your sides; only your forearms move.",
    guide: {
      setup:
        "Set a cable high with a rope attachment. Stand close with your elbows bent and tucked against your sides.",
      steps: [
        "Keep your upper arms still and your torso upright.",
        "Straighten your elbows, letting the rope ends separate slightly at the bottom.",
        "Pause briefly with your arms straight.",
        "Let your forearms return to about 90 degrees under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid leaning your bodyweight onto the rope, or letting your elbows drift forward and back.",
    },
  },
  {
    id: "overheadcableextension",
    name: "Overhead cable triceps extension",
    aliases: ["Overhead rope extension"],
    browseGroup: "Arms",
    browseEquipment: "Full gym",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: ["abs"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Upper arms stay beside your ears.",
    guide: {
      setup:
        "Set a cable low with a rope. Face away from the machine, bring the rope overhead and step forward into a staggered stance.",
      steps: [
        "Start with your elbows bent and your upper arms beside your ears.",
        "Keep your ribs down so your lower back does not arch.",
        "Straighten your elbows to press the rope forward and up.",
        "Let your forearms return behind your head under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid flaring your elbows wide, or letting your lower back arch to finish a rep.",
    },
  },
  {
    id: "dboverheadextension",
    name: "Dumbbell overhead triceps extension",
    aliases: ["Overhead extension", "French press"],
    browseGroup: "Arms",
    browseEquipment: "Dumbbells",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: ["abs"],
    requires: ["dumbbellSingle"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "combinedExternal", perSide: false },
    defaultReps: { min: 10, max: 12 },
    cue: "Lower behind your head, elbows pointing up.",
    guide: {
      setup:
        "Stand or sit tall holding one dumbbell with both hands, pressed overhead with your arms straight.",
      steps: [
        "Keep your upper arms vertical and close to your ears.",
        "Bend your elbows to lower the weight behind your head.",
        "Stop where you still feel in control of the weight.",
        "Straighten your elbows to press back overhead.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid letting the weight drop quickly behind your head, and keep your ribs down rather than arching.",
    },
  },
  {
    id: "lyingdbextension",
    name: "Lying dumbbell triceps extension",
    aliases: ["Skull crusher", "Lying extension"],
    browseGroup: "Arms",
    browseEquipment: "Dumbbells",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: [],
    requires: ["dumbbellPair", "flatBench"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 10, max: 12 },
    cue: "Upper arms stay still; bend only at the elbow.",
    guide: {
      setup:
        "Lie on a flat bench holding a dumbbell in each hand with your arms pressed straight above your chest, palms facing each other.",
      steps: [
        "Keep your upper arms roughly vertical throughout.",
        "Bend your elbows to lower the dumbbells toward the sides of your head.",
        "Stop at a depth your elbows tolerate comfortably.",
        "Straighten your elbows to return to the start.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid flaring your elbows wide, and use a weight you can lower slowly — this movement punishes momentum.",
    },
  },
  {
    id: "bandpushdown",
    name: "Band triceps pushdown",
    aliases: ["Band extension"],
    browseGroup: "Arms",
    browseEquipment: "Bodyweight",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: [],
    requires: ["bandWithAnchor"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 12, max: 20 },
    cue: "Elbows at your sides; press down against the band.",
    guide: {
      setup:
        "Anchor a band above head height. Stand facing the anchor and take an end in each hand with your elbows bent at your sides.",
      steps: [
        "Keep your upper arms against your ribs and your torso upright.",
        "Straighten your elbows to press your hands down toward your thighs.",
        "Pause briefly with your arms straight.",
        "Let your forearms rise back to 90 degrees under control.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid leaning forward over the band, and check the anchor holds before loading it.",
    },
  },
  {
    id: "cablecurl",
    name: "Cable curl",
    aliases: ["Low cable curl"],
    browseGroup: "Arms",
    browseEquipment: "Full gym",
    patterns: ["elbowFlexion"],
    primaryMuscles: ["biceps"],
    supportingMuscles: ["forearms"],
    requires: ["cableMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Constant tension; elbows stay at your sides.",
    guide: {
      setup:
        "Set a cable at its lowest point with a straight or EZ bar. Stand facing the machine with your arms straight down.",
      steps: [
        "Stand tall with your elbows against your sides.",
        "Curl the bar toward your shoulders without letting your elbows travel forward.",
        "Pause briefly at the top.",
        "Lower slowly, resisting the cable all the way to straight arms.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid swinging your torso to start the curl, or letting the stack pull your arms down quickly.",
    },
  },
  {
    id: "inclinecurl",
    name: "Incline dumbbell curl",
    aliases: ["Incline curl", "Seated incline curl"],
    browseGroup: "Arms",
    browseEquipment: "Dumbbells",
    patterns: ["elbowFlexion"],
    primaryMuscles: ["biceps"],
    supportingMuscles: ["forearms"],
    requires: ["dumbbellPair", "inclineBench"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 8, max: 12 },
    cue: "Arms hang behind you; curl without moving your shoulders.",
    guide: {
      setup:
        "Set a bench to roughly 45 degrees. Sit back with a dumbbell in each hand, letting your arms hang straight down behind your torso.",
      steps: [
        "Keep your shoulders back against the pad and your upper arms still.",
        "Curl both weights toward your shoulders.",
        "Pause briefly at the top.",
        "Lower slowly until your arms hang straight again.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid swinging your shoulders forward to start the rep; the stretch at the bottom is the point of this variation.",
    },
  },
  {
    id: "reversecurl",
    name: "Reverse curl",
    aliases: ["Overhand curl", "Pronated curl"],
    browseGroup: "Arms",
    browseEquipment: "Dumbbells",
    patterns: ["elbowFlexion"],
    primaryMuscles: ["forearms", "biceps"],
    supportingMuscles: [],
    requires: ["dumbbellPair"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Palms face down; curl with your knuckles leading.",
    guide: {
      setup:
        "Stand tall holding a dumbbell in each hand with your palms facing back and your arms straight.",
      steps: [
        "Keep your elbows against your sides.",
        "Curl the weights up with your knuckles leading the way.",
        "Stop where your wrists stay straight and comfortable.",
        "Lower under control to straight arms.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid letting your wrists bend backward under the load; use a lighter weight than you would for a standard curl.",
    },
  },
  {
    id: "wristextension",
    name: "Wrist extension",
    aliases: ["Forearm extension", "Reverse wrist curl"],
    browseGroup: "Arms",
    browseEquipment: "Dumbbells",
    patterns: ["elbowFlexion"],
    primaryMuscles: ["forearms"],
    supportingMuscles: [],
    requires: ["dumbbellPair", "flatBench"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false },
    defaultReps: { min: 12, max: 20 },
    cue: "Only your wrists move; forearms stay on the bench.",
    guide: {
      setup:
        "Rest your forearms on a bench or your thighs with your palms facing down and your hands hanging off the edge.",
      steps: [
        "Let your wrists drop so the weights hang low.",
        "Lift the backs of your hands toward the ceiling.",
        "Pause briefly at the top.",
        "Lower slowly to the stretched position.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid lifting your forearms off the support, and keep the load light — this is a small muscle group.",
    },
  },
];

/* ---------------------------------------------------------- core, carries */

const core: AuthoredExercise[] = [
  {
    id: "plank",
    name: "Forearm plank",
    aliases: ["Plank", "Front hold"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques", "glutes", "serratus", "frontDelts"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 20, max: 45 },
    cue: "One line from heels to head; brace rather than sag.",
    guide: {
      setup:
        "Lie face down, then set your forearms on the floor under your shoulders and lift your hips so your body makes one line from heels to head.",
      steps: [
        "Press the floor away so your upper back is not collapsed between your shoulder blades.",
        "Squeeze your glutes and gently brace your abdomen.",
        "Keep your neck long by looking at the floor just ahead of your hands.",
        "Hold for the set time, ending the hold when the line breaks rather than pushing through it.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid letting your hips sag toward the floor or pike up toward the ceiling, and avoid holding your breath.",
    },
  },
  {
    id: "sideplank",
    name: "Side plank",
    aliases: ["Lateral plank", "Side hold"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["antiRotation"],
    primaryMuscles: ["obliques"],
    supportingMuscles: ["abs", "glutes", "sideDelts"],
    requires: ["floorSpace"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 15, max: 40 },
    cue: "Stack your shoulders and hips; lift from the bottom side.",
    guide: {
      setup:
        "Lie on one side with your forearm on the floor under your shoulder and your legs stacked or staggered.",
      steps: [
        "Press down through your forearm and lift your hips off the floor.",
        "Make one line from your ankles through your hips to your head.",
        "Keep your top shoulder stacked over the bottom one rather than rolling forward.",
        "Hold for the set time, then rest and repeat on the other side.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid letting your hips drift backward or sink toward the floor. Bend your knees to make it easier.",
    },
  },
  {
    id: "pallof",
    name: "Pallof press",
    aliases: ["Anti-rotation press", "Cable Pallof"],
    browseGroup: "Core",
    browseEquipment: "Full gym",
    patterns: ["antiRotation"],
    primaryMuscles: ["obliques", "abs"],
    supportingMuscles: ["glutes", "frontDelts"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: true },
    defaultReps: { min: 8, max: 12 },
    cue: "Resist the twist as you press straight out.",
    guide: {
      setup:
        "Set a cable at chest height. Stand side-on, hold the handle at your sternum with both hands, and step away until the cable is taut.",
      steps: [
        "Set your feet about shoulder-width and brace your trunk.",
        "Press the handle straight out in front of your chest.",
        "Resist the cable's pull to rotate you — your shoulders and hips stay square.",
        "Return the handle to your chest under control, then finish the reps and turn to face the other way.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid letting your torso twist toward the machine, and avoid using a load so heavy that it pulls you around.",
    },
  },
  {
    id: "farmercarry",
    name: "Farmer carry",
    aliases: ["Farmer's walk", "Loaded carry"],
    browseGroup: "Core",
    browseEquipment: "Dumbbells",
    patterns: ["carry"],
    primaryMuscles: ["forearms", "abs"],
    supportingMuscles: ["obliques", "upperTraps", "glutes", "quadriceps"],
    requires: ["dumbbellPair", "openSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "perDumbbell", perSide: false },
    defaultReps: { min: 20, max: 45 },
    cue: "Walk tall with a weight in each hand.",
    guide: {
      setup:
        "Stand between two dumbbells, hinge to pick one up in each hand, and stand tall with them at your sides.",
      steps: [
        "Set your shoulders down and back and brace your trunk lightly.",
        "Walk at a steady, deliberate pace with short controlled steps.",
        "Keep the weights from swinging into your legs.",
        "Finish the time, then hinge to set the weights down rather than dropping them.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid leaning back, shrugging into your ears, or walking somewhere you could trip. Clear the route first.",
    },
  },
  {
    id: "suitcasecarry",
    name: "Suitcase carry",
    aliases: ["Single-arm carry", "Offset carry"],
    browseGroup: "Core",
    browseEquipment: "Dumbbells",
    patterns: ["carry", "antiRotation"],
    primaryMuscles: ["obliques"],
    supportingMuscles: ["abs", "forearms", "upperTraps", "glutes"],
    requires: ["dumbbellSingle", "openSpace"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "combinedExternal", perSide: true },
    defaultReps: { min: 20, max: 40 },
    cue: "One weight only; refuse to lean toward it.",
    guide: {
      setup:
        "Pick up a single dumbbell in one hand and stand tall with it at your side.",
      steps: [
        "Set your shoulders level and brace the side of your trunk away from the weight.",
        "Walk at a steady pace, keeping your torso upright and square.",
        "Resist the pull that wants to tip you toward the loaded side.",
        "Finish the time, set the weight down, then repeat carrying on the other side.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid leaning away from the weight to counterbalance it; reduce the load until you can stay upright.",
    },
  },
  {
    id: "reversecrunch",
    name: "Reverse crunch",
    aliases: ["Knee tuck", "Hip curl"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["hipFlexion", "antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques", "hipFlexors"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 8, max: 15 },
    cue: "Curl your hips off the floor, not your shoulders.",
    guide: {
      setup:
        "Lie on your back with your knees bent and your arms by your sides, palms down.",
      steps: [
        "Bring your knees over your hips so your shins are roughly parallel to the floor.",
        "Curl your pelvis toward your ribs so your hips lift slightly off the floor.",
        "Pause at the top without pushing through your hands.",
        "Lower your hips slowly back to the floor.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid swinging your legs for momentum, and keep your lower back from arching off the floor as you lower.",
    },
  },
  {
    id: "cablecrunch",
    name: "Kneeling cable crunch",
    aliases: ["Cable crunch", "Rope crunch"],
    browseGroup: "Core",
    browseEquipment: "Full gym",
    patterns: ["antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques"],
    requires: ["cableMachine"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Curl your ribs toward your hips; hips stay put.",
    guide: {
      setup:
        "Set a cable high with a rope. Kneel facing the machine and hold the rope beside your head.",
      steps: [
        "Start with your torso upright and your hips fixed over your knees.",
        "Curl your ribs down toward your hips, rounding your upper back.",
        "Pause briefly at the bottom of the curl.",
        "Return to upright under control without letting the stack yank you up.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid hinging at your hips so it becomes a bow rather than a crunch, and avoid pulling with your arms.",
    },
  },
  {
    id: "hangingkneeraise",
    name: "Hanging knee raise",
    aliases: ["Knee raise", "Hanging tuck"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["hipFlexion", "antiExtension"],
    primaryMuscles: ["abs", "hipFlexors"],
    supportingMuscles: ["obliques", "forearms", "lats"],
    requires: ["pullUpBar"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 6, max: 12 },
    cue: "Lift your knees without swinging.",
    guide: {
      setup:
        "Hang from a rated bar with an overhand grip, arms straight and shoulders active rather than fully relaxed.",
      steps: [
        "Settle the hang so you are not swinging before the first rep.",
        "Raise your knees toward your chest, curling your pelvis slightly at the top.",
        "Pause briefly at the top.",
        "Lower your legs slowly back to a straight hang.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid building a swing between reps; stop the set when you can no longer control the descent.",
    },
  },
  {
    id: "hollowhold",
    name: "Hollow hold",
    aliases: ["Hollow body", "Dish hold"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques", "hipFlexors", "quadriceps"],
    requires: ["floorSpace"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 15, max: 40 },
    cue: "Press your lower back into the floor and hold.",
    guide: {
      setup:
        "Lie on your back with your arms by your sides and your knees bent.",
      steps: [
        "Press your lower back firmly into the floor and keep it there.",
        "Lift your shoulders and feet a little way off the floor.",
        "Extend your legs only as far as you can go without your back lifting.",
        "Hold for the set time, ending the hold as soon as your back arches.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid straightening your legs before you can keep your back flat — bend the knees and shorten the lever instead.",
    },
  },
  {
    id: "abwheel",
    name: "Kneeling ab-wheel rollout",
    aliases: ["Ab rollout", "Wheel rollout"],
    browseGroup: "Core",
    browseEquipment: "Full gym",
    patterns: ["antiExtension"],
    primaryMuscles: ["abs"],
    supportingMuscles: ["obliques", "lats", "serratus"],
    requires: ["abWheel", "floorSpace"],
    difficulty: "advanced",
    measurement: { kind: "reps", load: "none", perSide: false },
    defaultReps: { min: 5, max: 10 },
    cue: "Roll out only as far as your back stays flat.",
    guide: {
      setup:
        "Kneel on a mat holding an ab wheel on the floor under your shoulders.",
      steps: [
        "Brace your abdomen hard and tuck your pelvis slightly.",
        "Roll the wheel forward, keeping your hips and shoulders moving together.",
        "Stop at the furthest point where your lower back has not arched.",
        "Pull the wheel back toward your knees using your trunk, not your arms.",
      ],
      breathing: breatheSteady,
      avoid:
        "Avoid rolling out past your control — the point at which your lower back dips is the end of the range, regardless of how far that is.",
    },
  },
];

/* ------------------------------------------------------------ lower body */

const lower: AuthoredExercise[] = [
  {
    id: "legcurl",
    name: "Seated hamstring curl",
    aliases: ["Leg curl", "Hamstring curl"],
    browseGroup: "Legs",
    browseEquipment: "Full gym",
    patterns: ["hinge"],
    primaryMuscles: ["hamstrings"],
    supportingMuscles: ["calves"],
    requires: ["legCurlMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Curl your heels under the seat, then return slowly.",
    guide: {
      setup:
        "Adjust the machine so the pad sits just above your heels and the back pad supports your thighs.",
      steps: [
        "Sit back fully and secure the thigh pad if the machine has one.",
        "Curl your heels down and back against the pad.",
        "Pause briefly at the end of the range.",
        "Return slowly until your knees are nearly straight.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid lifting your hips off the seat to move a heavier stack, and avoid letting the weight snap your knees straight.",
    },
  },
  {
    id: "legextension",
    name: "Leg extension",
    aliases: ["Knee extension", "Quad extension"],
    browseGroup: "Legs",
    browseEquipment: "Full gym",
    patterns: ["squat"],
    primaryMuscles: ["quadriceps"],
    supportingMuscles: [],
    requires: ["legExtensionMachine"],
    difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false },
    defaultReps: { min: 10, max: 15 },
    cue: "Straighten your knees smoothly, then lower under control.",
    guide: {
      setup:
        "Adjust the seat so your knees line up with the machine's pivot and the pad rests on your shins above your ankles.",
      steps: [
        "Sit back against the pad and hold the handles lightly.",
        "Straighten your knees until your legs are nearly straight.",
        "Pause briefly without locking hard.",
        "Lower with control to the start position.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid kicking the weight up with a jerk, and reduce the range if your knees feel pinched at either end.",
    },
  },
  {
    id: "stepup",
    name: "Step-up",
    aliases: ["Box step-up", "Bench step-up"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["lunge"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["hamstrings", "calves", "abs"],
    requires: ["stepPlatform"],
    difficulty: "intermediate",
    measurement: { kind: "reps", load: "none", perSide: true },
    defaultReps: { min: 6, max: 12 },
    cue: "Drive through the top foot; do not push off the floor.",
    guide: {
      setup:
        "Stand facing a stable step or bench at roughly knee height. Place one whole foot on it.",
      steps: [
        "Shift your weight over the stepping foot.",
        "Press through that foot to stand up on the step, letting the other leg follow rather than pushing off the floor.",
        "Stand tall at the top without locking your knee hard.",
        "Lower under control to the floor. Finish the reps, then switch legs.",
      ],
      breathing: breatheLift,
      avoid:
        "Avoid bouncing off the back foot, and check the step will not slide or tip before you use it.",
    },
  },
];

export const authoredStrength: AuthoredExercise[] = [
  ...chest,
  ...back,
  ...shoulders,
  ...arms,
  ...core,
  ...lower,
];
