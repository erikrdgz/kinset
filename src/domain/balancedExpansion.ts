import type { AuthoredExercise } from "./expansion";

const breathing = "Breathe out through the lifting effort and in as you lower with control.";

/** Equipment and movement gaps left after the first catalog expansion. */
export const balancedExpansion: AuthoredExercise[] = [
  {
    id: "machineshoulderpress", name: "Machine shoulder press",
    aliases: ["Seated machine overhead press"], browseGroup: "Shoulders", browseEquipment: "Full gym",
    patterns: ["verticalPush"], primaryMuscles: ["frontDelts", "sideDelts"], supportingMuscles: ["triceps", "upperTraps", "serratus"],
    requires: ["shoulderPressMachine"], difficulty: "beginner",
    measurement: { kind: "reps", load: "machineStack", perSide: false }, defaultReps: { min: 8, max: 12 },
    cue: "Keep your back supported and press smoothly overhead.",
    guide: {
      setup: "Adjust the seat so the handles begin near shoulder level. Sit against the back pad with both feet planted and choose a light machine setting.",
      steps: ["Hold the handles with your wrists aligned over your forearms.", "Press upward through a comfortable range without lifting your ribs away from the pad.", "Finish with your arms nearly straight without snapping your elbows.", "Lower slowly until the handles return near shoulder level."],
      breathing, avoid: "Avoid lowering into shoulder discomfort, arching away from the pad, or letting the weight stack slam.",
    },
  },
  {
    id: "bandlateral", name: "Band lateral raise",
    aliases: ["Resistance-band side raise"], browseGroup: "Shoulders", browseEquipment: "Bodyweight",
    patterns: ["shoulderAbduction"], primaryMuscles: ["sideDelts"], supportingMuscles: ["upperTraps", "rotatorCuff"],
    requires: ["resistanceBand"], difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: true }, defaultReps: { min: 10, max: 15 },
    cue: "Raise your arm to shoulder level against gentle band tension.",
    guide: {
      setup: "Secure a long resistance band beneath one foot and hold the other end in the hand on that side. Leave enough slack to raise your arm without straining.",
      steps: ["Stand tall with a small bend in your working elbow.", "Lift the arm out to the side and slightly forward, keeping your torso still.", "Stop at or below shoulder height while keeping your shoulder away from your ear.", "Lower slowly, finish the repetitions, and change sides."],
      breathing, avoid: "Avoid using a damaged band, standing on an unsecured end, or jerking your arm to overcome excessive resistance.",
    },
  },
  {
    id: "bandpullapart", name: "Band pull-apart",
    aliases: ["Resistance-band rear-delt pull"], browseGroup: "Shoulders", browseEquipment: "Bodyweight",
    patterns: ["horizontalPull"], primaryMuscles: ["rearDelts", "midback"], supportingMuscles: ["rotatorCuff"],
    requires: ["resistanceBand"], difficulty: "beginner",
    measurement: { kind: "reps", load: "none", perSide: false }, defaultReps: { min: 12, max: 15 },
    cue: "Open your arms without flaring your ribs.",
    guide: {
      setup: "Hold a light resistance band in front of your chest with your hands about shoulder-width apart, palms down, and elbows slightly bent.",
      steps: ["Stand comfortably with your ribs stacked over your pelvis.", "Move your hands apart while keeping the bend in your elbows nearly unchanged.", "Pause when the band approaches your chest within a comfortable range.", "Return slowly until your hands are in front of you again."],
      breathing, avoid: "Avoid shrugging, leaning backward, or pulling a damaged or excessively tight band toward your face.",
    },
  },
  {
    id: "seatedreversefly", name: "Seated dumbbell reverse fly",
    aliases: ["Seated rear-delt fly", "Bent-over seated lateral raise"], browseGroup: "Shoulders", browseEquipment: "Dumbbells",
    patterns: ["horizontalPull"], primaryMuscles: ["rearDelts"], supportingMuscles: ["midback", "rotatorCuff"],
    requires: ["dumbbellPair", "flatBench"], difficulty: "beginner",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false }, defaultReps: { min: 10, max: 15 },
    cue: "Stay folded forward and open your arms with light weights.",
    guide: {
      setup: "Sit near the end of a stable bench with your feet planted. Hinge forward from your hips, keeping your back steady, and let light dumbbells hang below your shoulders.",
      steps: ["Keep a soft, fixed bend in your elbows.", "Raise the weights out to the sides while keeping your chest angled toward your thighs.", "Stop when your upper arms approach shoulder level or earlier if needed.", "Lower under control without lifting your torso."],
      breathing, avoid: "Avoid swinging the weights, rounding or lifting your back, or forcing your arms above a comfortable range.",
    },
  },
  {
    id: "dbfly", name: "Dumbbell chest fly",
    aliases: ["Flat-bench fly", "Dumbbell flye"], browseGroup: "Chest", browseEquipment: "Dumbbells",
    patterns: ["horizontalAdduction"], primaryMuscles: ["pecs"], supportingMuscles: ["frontDelts", "biceps"],
    requires: ["dumbbellPair", "flatBench"], difficulty: "intermediate",
    measurement: { kind: "reps", load: "perDumbbell", perSide: false }, defaultReps: { min: 10, max: 15 },
    cue: "Open a comfortable arc, then bring your arms together.",
    guide: {
      setup: "Lie on a flat bench with your head and back supported and feet planted. Hold light dumbbells above your chest with palms facing each other and a small bend in your elbows.",
      steps: ["Maintain the same gentle elbow bend throughout the repetition.", "Open your arms slowly to the sides, stopping before your shoulders feel stretched or your upper arms pass the bench line.", "Bring the weights back above your chest along the same arc.", "Pause with the dumbbells close together without banging them."],
      breathing, avoid: "Avoid heavy loads, locked elbows, and lowering deeply below your torso. Use a press if this arc is uncomfortable.",
    },
  },
  {
    id: "cablefly", name: "Standing cable chest fly",
    aliases: ["Cable crossover", "Cable flye"], browseGroup: "Chest", browseEquipment: "Full gym",
    patterns: ["horizontalAdduction"], primaryMuscles: ["pecs"], supportingMuscles: ["frontDelts", "abs"],
    requires: ["cableMachine"], difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: false }, defaultReps: { min: 10, max: 15 },
    cue: "Bring your hands together in front of your chest.",
    guide: {
      setup: "Use two cable handles set near chest height. Choose the same light setting on both stacks, take a handle in each hand, and stand between them in a stable staggered stance. Record the setting per stack.",
      steps: ["Keep your elbows slightly bent and your shoulders comfortable.", "Bring both hands forward in an arc until they meet in front of your chest.", "Pause without crossing the handles or rounding your shoulders.", "Open slowly until your upper arms are about in line with your torso."],
      breathing, avoid: "Avoid leaning your body weight into the movement, opening behind your torso, or allowing the stacks to pull your arms back suddenly.",
    },
  },
  {
    id: "singlecablerow", name: "Single-arm cable row",
    aliases: ["One-arm seated cable row", "Unilateral cable row"], browseGroup: "Back", browseEquipment: "Full gym",
    patterns: ["horizontalPull"], primaryMuscles: ["lats", "midback"], supportingMuscles: ["biceps", "rearDelts", "obliques"],
    requires: ["cableMachine", "flatBench"], difficulty: "intermediate",
    measurement: { kind: "reps", load: "machineStack", perSide: true }, defaultReps: { min: 8, max: 12 },
    cue: "Row one elbow past your ribs while your torso stays still.",
    guide: {
      setup: "Fit a single handle to a low cable. Sit on a stable bench facing the cable, with your feet planted and the handle in one hand. Position yourself so you can extend your arm without rounding forward.",
      steps: ["Sit tall and gently brace your trunk against rotation.", "Pull your elbow back close to your side until your hand reaches your ribs.", "Pause without twisting your shoulders or leaning backward.", "Extend your arm with control, complete the repetitions, and switch sides."],
      breathing, avoid: "Avoid rotating to move a heavier stack or reaching so far that you lose your seated position.",
    },
  },
  {
    id: "backextension", name: "45-degree back extension",
    aliases: ["Roman-chair back extension", "Hip-hinge back extension"], browseGroup: "Back", browseEquipment: "Full gym",
    patterns: ["hinge"], primaryMuscles: ["erectors", "glutes", "hamstrings"], supportingMuscles: ["abs"],
    requires: ["backExtensionBench"], difficulty: "intermediate",
    measurement: { kind: "reps", load: "none", perSide: false }, defaultReps: { min: 8, max: 12 },
    cue: "Hinge at your hips, then return to a straight body line.",
    guide: {
      setup: "Adjust a 45-degree back-extension bench so its pad supports your upper thighs below the hip crease. Secure your feet in the supports and cross your arms over your chest.",
      steps: ["Begin with your head, torso, and legs forming a straight line.", "Bend from your hips to lower your torso within a controlled, comfortable range.", "Use your hips and trunk to return to the starting line.", "Pause in line with your legs instead of leaning past them."],
      breathing, avoid: "Avoid rounding abruptly, swinging upward, or hyperextending your back at the top. Do not use a machine whose supports cannot hold you securely.",
    },
  },
  {
    id: "tricepskickback", name: "Dumbbell triceps kickback",
    aliases: ["Supported triceps kickback", "One-arm kickback"], browseGroup: "Arms", browseEquipment: "Dumbbells",
    patterns: ["elbowExtension"], primaryMuscles: ["triceps"], supportingMuscles: ["rearDelts"],
    requires: ["dumbbellSingle", "benchOrSupport"], difficulty: "beginner",
    measurement: { kind: "reps", load: "combinedExternal", perSide: true }, defaultReps: { min: 10, max: 15 },
    cue: "Keep your upper arm still and straighten only your elbow.",
    guide: {
      setup: "Hold a light dumbbell in one hand. Brace the other hand on a stable bench and hinge forward. Bring the working upper arm alongside your torso with your elbow bent.",
      steps: ["Keep your torso and upper arm steady.", "Straighten your working elbow to move the weight behind you.", "Pause briefly without forcing the elbow beyond straight.", "Bend the elbow slowly, then complete the repetitions and switch sides."],
      breathing, avoid: "Avoid swinging your whole arm, rotating your torso, or selecting a weight you cannot pause with.",
      source: "https://www.acefitness.org/certifiednewsarticle/3008/ace-study-identifies-best-triceps-exercises/",
    },
  },
  {
    id: "concentrationcurl", name: "Concentration curl",
    aliases: ["Seated concentration curl", "Braced dumbbell curl"], browseGroup: "Arms", browseEquipment: "Dumbbells",
    patterns: ["elbowFlexion"], primaryMuscles: ["biceps"], supportingMuscles: ["forearms"],
    requires: ["dumbbellSingle", "flatBench"], difficulty: "beginner",
    measurement: { kind: "reps", load: "combinedExternal", perSide: true }, defaultReps: { min: 8, max: 12 },
    cue: "Brace your upper arm and curl without lifting your shoulder.",
    guide: {
      setup: "Sit on a stable bench with your feet apart. Hold one dumbbell, lean forward slightly, and brace the back of your upper arm against your inner thigh above the knee.",
      steps: ["Start with your arm extended comfortably and palm facing forward.", "Curl the dumbbell toward your shoulder while keeping your upper arm against your thigh.", "Pause without bending your wrist or moving your shoulder forward.", "Lower slowly, complete the repetitions, and switch arms."],
      breathing, avoid: "Avoid pressing your elbow directly into your knee, swinging your torso, or dropping the weight into a locked elbow.",
    },
  },
];
