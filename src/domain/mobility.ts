/**
 * Mobility and conditioning.
 *
 * These are the twelve mobility movements and six conditioning options from
 * docs/redesign-2026-10-16/03-content-and-media.md. They matter beyond catalog balance:
 * they are the content the timed player exists for, since almost all of them are tracked
 * in seconds per side rather than in reps and load.
 *
 * The conditioning entries are honest about what they measure. A manually entered walk
 * duration is a duration, not a measured distance, and nothing here claims a GPS route
 * until the run recorder provides one. None of it is a resistance set, so none of it
 * enters load-volume.
 *
 * As with everything else in the catalog: no qualified reviewer has seen these.
 */
import type { AuthoredExercise } from "./expansion";

const breatheEasy =
  "Breathe slowly and evenly; let each exhale ease you a little further in.";
const breatheWork = "Breathe at a pace that still lets you speak in short sentences.";

export const authoredMobility: AuthoredExercise[] = [
  {
    id: "catcow",
    name: "Cat-cow",
    aliases: ["Cat camel", "Spinal waves"],
    browseGroup: "Core",
    browseEquipment: "Bodyweight",
    patterns: ["antiExtension"],
    primaryMuscles: ["erectors", "abs"],
    supportingMuscles: ["midback"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 30, max: 60 },
    cue: "Alternate rounding and arching, slowly.",
    guide: {
      setup:
        "Start on hands and knees with your hands under your shoulders and your knees under your hips.",
      steps: [
        "Breathe out and round your back toward the ceiling, letting your head drop gently.",
        "Breathe in and reverse: let your belly sink, your chest open and your gaze lift a little.",
        "Move slowly between the two, one breath per direction.",
        "Keep going for the set time, staying within a comfortable range.",
      ],
      breathing: "Breathe out as you round, in as you arch.",
      avoid:
        "Avoid forcing the end of either direction, and keep your elbows soft rather than locked.",
    },
  },
  {
    id: "threadneedle",
    name: "Thread the needle",
    aliases: ["Thoracic thread", "Reach under"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["rotation"],
    primaryMuscles: ["midback"],
    supportingMuscles: ["rearDelts", "obliques"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 30, max: 45 },
    cue: "Reach one arm under the other; let the shoulder rest down.",
    guide: {
      setup: "Start on hands and knees with your knees under your hips.",
      steps: [
        "Reach one arm underneath your torso, palm up, letting that shoulder lower toward the floor.",
        "Let your head rest on the floor or a cushion if it reaches comfortably.",
        "Keep your hips stacked over your knees rather than rolling them.",
        "Hold for the set time, then come back up and repeat on the other side.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid pressing into a position that pinches your shoulder or neck; back off until it is a stretch, not a pinch.",
    },
  },
  {
    id: "hipflexorstretch",
    name: "Half-kneeling hip-flexor stretch",
    aliases: ["Kneeling lunge stretch", "Hip flexor stretch"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["lunge"],
    primaryMuscles: ["hipFlexors"],
    supportingMuscles: ["quadriceps", "glutes"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 30, max: 45 },
    cue: "Tuck your pelvis, then ease forward.",
    guide: {
      setup:
        "Kneel on one knee with the other foot flat in front, both knees at roughly 90 degrees. Pad the down knee if the floor is hard.",
      steps: [
        "Tuck your pelvis under so your lower back flattens slightly.",
        "Keeping that tuck, shift your weight gently forward over the front foot.",
        "Stop where you feel a stretch at the front of the rear hip.",
        "Hold for the set time, then swap sides.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid arching your lower back to go further forward — the pelvic tuck is what makes this a hip stretch.",
    },
  },
  {
    id: "anklerocks",
    name: "Ankle rocks",
    aliases: ["Knee-to-wall", "Ankle mobilisation"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["lunge"],
    primaryMuscles: ["calves"],
    supportingMuscles: ["quadriceps"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 20, max: 40 },
    cue: "Drive your knee forward over your toes, heel down.",
    guide: {
      setup:
        "Take a half-kneeling or split stance with one foot flat on the floor in front of you.",
      steps: [
        "Keep the front heel pressed down for the whole set.",
        "Rock your knee forward over your toes until you feel a stretch at the front of the ankle.",
        "Return to the start, then repeat with a slow steady rhythm.",
        "Continue for the set time, then swap sides.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid letting the heel lift, and avoid letting your knee collapse inward as it travels.",
    },
  },
  {
    id: "ninetyninety",
    name: "90/90 hip transition",
    aliases: ["90-90", "Hip switch"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["rotation"],
    primaryMuscles: ["glutes", "hipFlexors"],
    supportingMuscles: ["adductors", "obliques"],
    requires: ["floorSpace"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 40, max: 60 },
    cue: "Rotate both knees from one side to the other, slowly.",
    guide: {
      setup:
        "Sit on the floor with both knees bent at about 90 degrees, one leg in front of you and one out to the side.",
      steps: [
        "Sit as tall as you comfortably can, hands on the floor behind or beside you for support.",
        "Let both knees rotate slowly over to the other side.",
        "Pause briefly when you arrive, keeping both knees in contact with the floor if they reach.",
        "Continue switching sides for the set time.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid forcing your knees down; let your torso lean back a little instead and work within what rotates freely.",
    },
  },
  {
    id: "openbook",
    name: "Side-lying open book",
    aliases: ["Open book", "Lying thoracic rotation"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["rotation"],
    primaryMuscles: ["midback"],
    supportingMuscles: ["pecs", "obliques", "frontDelts"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 30, max: 45 },
    cue: "Open your top arm across; let your chest follow.",
    guide: {
      setup:
        "Lie on one side with your knees bent to about 90 degrees and your arms stretched out in front, palms together.",
      steps: [
        "Keep your knees stacked and resting on the floor.",
        "Sweep your top arm up and over to the other side, following your hand with your eyes.",
        "Let your chest open as far as it goes without your knees lifting.",
        "Return slowly and repeat for the set time, then swap sides.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid letting your knees roll open to gain extra range; the rotation should come from your upper back.",
    },
  },
  {
    id: "childslat",
    name: "Child's-pose lat stretch",
    aliases: ["Child's pose", "Lat stretch"],
    browseGroup: "Back",
    browseEquipment: "Bodyweight",
    patterns: ["verticalPull"],
    primaryMuscles: ["lats"],
    supportingMuscles: ["midback", "erectors"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 30, max: 60 },
    cue: "Sit your hips back and reach long through your hands.",
    guide: {
      setup:
        "Kneel and sit your hips back toward your heels with your arms stretched out in front on the floor.",
      steps: [
        "Let your chest sink toward the floor between your arms.",
        "Press your hands lightly into the floor to lengthen through your sides.",
        "Breathe into the stretch along your ribs and lats.",
        "Hold for the set time.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid forcing your hips to your heels if your knees object; put a cushion behind them or widen your knees.",
    },
  },
  {
    id: "wallcheststretch",
    name: "Wall chest stretch",
    aliases: ["Doorway stretch", "Pec stretch"],
    browseGroup: "Chest",
    browseEquipment: "Bodyweight",
    patterns: ["horizontalPush"],
    primaryMuscles: ["pecs"],
    supportingMuscles: ["frontDelts"],
    requires: ["wall"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 25, max: 40 },
    cue: "Forearm on the wall; turn your chest away.",
    guide: {
      setup:
        "Stand beside a wall or doorframe and place one forearm against it with your elbow at about shoulder height.",
      steps: [
        "Keep your forearm in contact with the surface.",
        "Step the near foot forward and turn your chest gently away from the arm.",
        "Stop where you feel a stretch across the front of your chest and shoulder.",
        "Hold for the set time, then swap sides.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid pushing into any sharp sensation at the front of the shoulder; lower the elbow a little and try again.",
    },
  },
  {
    id: "overheadtricepsstretch",
    name: "Overhead triceps stretch",
    aliases: ["Triceps stretch"],
    browseGroup: "Arms",
    browseEquipment: "Bodyweight",
    patterns: ["elbowExtension"],
    primaryMuscles: ["triceps"],
    supportingMuscles: ["lats"],
    requires: [],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 20, max: 35 },
    cue: "Hand behind your head; ease the elbow back.",
    guide: {
      setup:
        "Stand or sit tall and reach one hand down behind your head, elbow pointing up.",
      steps: [
        "Use the other hand to hold just below the raised elbow.",
        "Ease the elbow gently back and in until you feel a stretch along the back of the upper arm.",
        "Keep your ribs down rather than arching your back.",
        "Hold for the set time, then swap arms.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid pulling hard on the elbow joint, and avoid arching your lower back to create the appearance of range.",
    },
  },
  {
    id: "shouldercircles",
    name: "Controlled shoulder circles",
    aliases: ["Shoulder rolls", "Arm circles"],
    browseGroup: "Shoulders",
    browseEquipment: "Bodyweight",
    patterns: ["rotation"],
    primaryMuscles: ["rotatorCuff", "frontDelts"],
    supportingMuscles: ["upperTraps", "midback"],
    requires: [],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 20, max: 40 },
    cue: "Draw the largest smooth circle you control.",
    guide: {
      setup: "Stand tall with your arms relaxed at your sides.",
      steps: [
        "Raise your arms and begin drawing slow circles, as large as you can keep smooth.",
        "Move at a pace where you could stop at any point in the circle.",
        "Reverse direction halfway through the set.",
        "Keep your ribs down and your neck relaxed throughout.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid rushing or throwing your arms around; the control is the point, not the speed.",
    },
  },
  {
    id: "calfstretch",
    name: "Standing calf stretch",
    aliases: ["Wall calf stretch", "Gastroc stretch"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["ankleExtension"],
    primaryMuscles: ["calves"],
    supportingMuscles: [],
    requires: ["wall"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 25, max: 40 },
    cue: "Back heel down, back knee straight.",
    guide: {
      setup:
        "Stand facing a wall with your hands on it and step one foot well back.",
      steps: [
        "Keep the back leg straight and the back heel pressed into the floor.",
        "Bend the front knee and lean toward the wall.",
        "Stop where you feel a stretch through the back calf.",
        "Hold for the set time, then swap legs.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid letting the back heel lift, and avoid bouncing in and out of the stretch.",
    },
  },
  {
    id: "hamstringstretch",
    name: "Standing hamstring stretch",
    aliases: ["Hamstring stretch", "Toe-touch stretch"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["hinge"],
    primaryMuscles: ["hamstrings"],
    supportingMuscles: ["calves", "erectors"],
    requires: [],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: true },
    defaultReps: { min: 25, max: 40 },
    cue: "Heel forward, hinge at the hip with a long back.",
    guide: {
      setup:
        "Stand tall and place one heel a short step in front of you with the toes lifted.",
      steps: [
        "Keep the front leg nearly straight and the back knee softly bent.",
        "Hinge forward from your hips, keeping your back long rather than rounding.",
        "Stop where you feel a stretch along the back of the front thigh.",
        "Hold for the set time, then swap legs.",
      ],
      breathing: breatheEasy,
      avoid:
        "Avoid rounding your back to reach further; the hinge is what makes this a hamstring stretch.",
    },
  },
];

export const authoredConditioning: AuthoredExercise[] = [
  {
    id: "briskwalk",
    name: "Brisk walk",
    aliases: ["Walk", "Power walk"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["carry"],
    primaryMuscles: ["quadriceps", "glutes", "calves"],
    supportingMuscles: ["hamstrings", "abs"],
    requires: ["openSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 600, max: 1800 },
    cue: "Walk at a pace that lifts your breathing but lets you talk.",
    guide: {
      setup: "Pick a route you know, and wear shoes you can walk distance in.",
      steps: [
        "Start at an easy pace for the first minute or two.",
        "Lift to a pace where your breathing is noticeably faster but conversation is still possible.",
        "Hold that pace, letting your arms swing naturally.",
        "Ease off for the last minute rather than stopping abruptly.",
      ],
      breathing: breatheWork,
      avoid:
        "This records the time you enter. It is not a measured distance or route unless you record a run with GPS.",
    },
  },
  {
    id: "outdoorrun",
    name: "Outdoor run",
    aliases: ["Run", "Jog"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["carry"],
    primaryMuscles: ["quadriceps", "hamstrings", "calves", "glutes"],
    supportingMuscles: ["abs", "hipFlexors"],
    requires: ["openSpace"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 900, max: 2700 },
    cue: "Run at a conversational effort unless the session says otherwise.",
    guide: {
      setup:
        "Choose a route and tell someone where you are going if it is unfamiliar or unlit.",
      steps: [
        "Start with a few minutes of walking or very easy jogging.",
        "Settle into a pace you could hold while speaking in short sentences.",
        "Keep your steps light and your cadence steady rather than over-striding.",
        "Finish with a few minutes of easy walking.",
      ],
      breathing: breatheWork,
      avoid:
        "Avoid starting at a pace you cannot hold. For a measured route and pace, record the run rather than entering a time here.",
    },
  },
  {
    id: "marching",
    name: "Marching in place",
    aliases: ["High knees march", "On-the-spot march"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["hipFlexion"],
    primaryMuscles: ["hipFlexors", "quadriceps"],
    supportingMuscles: ["calves", "abs"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 30, max: 90 },
    cue: "Lift each knee to hip height, staying tall.",
    guide: {
      setup: "Stand tall with enough space to lift your knees freely.",
      steps: [
        "Lift one knee toward hip height, then set it down.",
        "Alternate legs at a steady rhythm, swinging your arms naturally.",
        "Keep your torso upright rather than leaning back.",
        "Continue for the set time.",
      ],
      breathing: breatheWork,
      avoid:
        "Avoid leaning back to lift your knees higher, and lower the knee height if your hips tire before the time is up.",
    },
  },
  {
    id: "stepjack",
    name: "Low-impact step jack",
    aliases: ["Step jack", "Half jack"],
    browseGroup: "Legs",
    browseEquipment: "Bodyweight",
    patterns: ["hipAbduction"],
    primaryMuscles: ["glutes", "calves"],
    supportingMuscles: ["sideDelts", "abs", "adductors"],
    requires: ["floorSpace"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 30, max: 60 },
    cue: "Step out rather than jumping; arms rise with the step.",
    guide: {
      setup: "Stand tall with your feet together and space either side of you.",
      steps: [
        "Step one foot out to the side as you raise your arms.",
        "Bring it back to meet the other as your arms lower.",
        "Repeat to the other side, keeping one foot on the floor throughout.",
        "Continue alternating for the set time.",
      ],
      breathing: breatheWork,
      avoid:
        "No jumping is required in this version. Slow the tempo rather than adding impact if it feels too easy.",
    },
  },
  {
    id: "stationarycycle",
    name: "Stationary cycling",
    aliases: ["Exercise bike", "Indoor cycling"],
    browseGroup: "Legs",
    browseEquipment: "Full gym",
    patterns: ["squat"],
    primaryMuscles: ["quadriceps", "glutes"],
    supportingMuscles: ["hamstrings", "calves"],
    requires: ["stationaryBike"],
    difficulty: "beginner",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 600, max: 1800 },
    cue: "Steady cadence at a resistance you can hold.",
    guide: {
      setup:
        "Set the saddle so your knee stays slightly bent at the bottom of the pedal stroke.",
      steps: [
        "Spin easily for the first couple of minutes.",
        "Raise the resistance until the effort feels steady but sustainable.",
        "Hold a smooth cadence rather than mashing the pedals.",
        "Spin easy for the last couple of minutes.",
      ],
      breathing: breatheWork,
      avoid:
        "Avoid rocking your hips in the saddle. A bike's own distance readout is its own measurement; it is not recorded here.",
    },
  },
  {
    id: "rowerg",
    name: "Rowing ergometer",
    aliases: ["Rowing machine", "Erg"],
    browseGroup: "Back",
    browseEquipment: "Full gym",
    patterns: ["horizontalPull", "hinge"],
    primaryMuscles: ["lats", "quadriceps", "glutes"],
    supportingMuscles: ["midback", "hamstrings", "biceps", "erectors"],
    requires: ["rowingErgometer"],
    difficulty: "intermediate",
    measurement: { kind: "duration", load: "none", perSide: false },
    defaultReps: { min: 300, max: 1200 },
    cue: "Legs, then back, then arms — and reverse on the way in.",
    guide: {
      setup:
        "Strap your feet so the strap crosses the widest part of your foot, and take the handle with a relaxed grip.",
      steps: [
        "Drive with your legs first, keeping your arms straight.",
        "Swing your torso back slightly once your legs are nearly straight.",
        "Finally draw the handle to your lower ribs.",
        "Reverse the order on the recovery: arms, then torso, then legs.",
      ],
      breathing: breatheWork,
      avoid:
        "Avoid pulling with your arms first, and avoid rounding your back at the front of the stroke. The erg's own distance is not recorded here.",
    },
  },
];
