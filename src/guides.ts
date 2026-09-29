export type ExerciseGuide = {
  setup: string;
  steps: string[];
  breathing: string;
  avoid: string;
  source?: string;
};
export const guides: Record<string, ExerciseGuide> = {
  goblet: {
    setup:
      "Stand with feet about shoulder-width apart. Hold one dumbbell close to your chest with both hands.",
    steps: [
      "Brace your trunk and keep your whole foot in contact with the floor.",
      "Bend your hips and knees together, letting your knees follow the direction of your toes.",
      "Lower only as far as you can stay balanced and comfortable.",
      "Push through your feet to stand, keeping the weight close to your chest.",
    ],
    breathing: "Breathe in as you lower; breathe out as you stand.",
    avoid:
      "Avoid heels lifting, knees collapsing inward, or forcing extra depth.",
    source:
      "https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/",
  },
  floor: {
    setup:
      "Lie on the floor with knees bent and feet planted. Hold a dumbbell in each hand above your chest.",
    steps: [
      "Keep wrists stacked over your elbows and upper arms at a comfortable angle to your torso.",
      "Lower the weights slowly until your upper arms gently touch the floor.",
      "Pause without bouncing your elbows.",
      "Press the weights back above your chest, keeping your shoulders controlled.",
    ],
    breathing: "Breathe in on the way down and out as you press.",
    avoid:
      "Avoid flaring elbows straight out, bouncing off the floor, or bending wrists backward.",
  },
  row: {
    setup:
      "Place one hand on a stable bench. Stagger your feet and hinge at your hips; let a dumbbell hang from the other hand.",
    steps: [
      "Keep your torso steady and your neck aligned with your back.",
      "Draw your elbow toward your hip, keeping the weight close to your body.",
      "Pause before the movement pulls your torso into a twist.",
      "Lower the weight under control. Complete the planned reps, then switch sides.",
    ],
    breathing: "Breathe out as you pull and in as you lower.",
    avoid:
      "Avoid jerking the weight, shrugging toward your ear, or rotating your chest to finish the pull.",
  },
  rdl: {
    setup:
      "Stand with feet about hip-width apart, holding dumbbells in front of your thighs. Keep a slight bend in your knees.",
    steps: [
      "Brace your trunk, then move your hips backward.",
      "Let the weights travel close to your legs as your torso tips forward.",
      "Stop when you feel a comfortable stretch in your hamstrings or before your back starts to round.",
      "Push through your feet and bring your hips forward to return to standing.",
    ],
    breathing: "Breathe in as you hinge and out as you stand.",
    avoid:
      "Avoid reaching for the floor, turning the movement into a deep squat, or leaning backward at the top.",
  },
  press: {
    setup:
      "Stand with feet comfortably apart. Bring the dumbbells to shoulder height with wrists above elbows.",
    steps: [
      "Keep your ribs and pelvis aligned and your knees relaxed.",
      "Press both weights upward through a comfortable range.",
      "Finish without forcing your elbows to lock or arching your back.",
      "Lower slowly to shoulder height and repeat.",
    ],
    breathing: "Breathe out while pressing and in while lowering.",
    avoid:
      "Avoid leaning back, flaring your ribs, or using a leg bounce to move the weights.",
  },
  curl: {
    setup:
      "Stand tall with dumbbells at your sides, palms facing forward, and knees relaxed.",
    steps: [
      "Keep your upper arms close to your torso.",
      "Bend your elbows to bring the weights upward without moving your shoulders forward.",
      "Pause at the top of your comfortable range.",
      "Lower slowly until your arms are nearly straight.",
    ],
    breathing: "Breathe out as you curl and in as you lower.",
    avoid:
      "Avoid swinging your body, lifting your elbows forward, or letting the weights drop.",
  },
  squat: {
    setup:
      "Stand with feet about shoulder-width apart, with toes turned out slightly if comfortable. Reach your arms forward for balance.",
    steps: [
      "Keep your feet planted and brace your trunk gently.",
      "Bend at your hips and knees, sitting down between your feet.",
      "Use a depth you can control while keeping your knees tracking with your toes.",
      "Press through your feet to stand tall again.",
    ],
    breathing: "Breathe in as you lower and out as you stand.",
    avoid:
      "Avoid heels lifting, collapsing your knees inward, or forcing a depth you cannot control.",
  },
  pushup: {
    setup:
      "Place your hands on a sturdy bench or fixed elevated surface. Step back until your body forms a straight line.",
    steps: [
      "Keep your hands near shoulder width and brace your abdomen.",
      "Bend your elbows to bring your chest toward the surface.",
      "Stop at a comfortable depth, keeping your hips in line with your shoulders.",
      "Push the surface away to return to the starting position.",
    ],
    breathing: "Breathe in as you lower and out as you push away.",
    avoid:
      "Avoid an unstable surface, letting your hips sag, or reaching forward with your chin.",
  },
  bridge: {
    setup:
      "Lie on your back with knees bent, feet flat about hip-width apart, and arms resting beside you.",
    steps: [
      "Gently brace your abdomen before moving.",
      "Press through your feet and squeeze your glutes to raise your hips.",
      "Stop when your hips line up with your trunk; keep your lower back from arching.",
      "Lower your hips slowly to the floor and repeat.",
    ],
    breathing: "Breathe out as you lift and in as you lower.",
    avoid:
      "Avoid pushing through your neck, lifting into a back arch, or letting your knees fall outward.",
    source:
      "https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/",
  },
  bird: {
    setup:
      "Start on hands and knees, with hands beneath shoulders and knees beneath hips.",
    steps: [
      "Gently brace your abdomen and look toward the floor.",
      "Reach one arm forward and the opposite leg backward without shifting your trunk.",
      "Hold briefly with your hips level and your back steady.",
      "Return slowly, then repeat with the opposite arm and leg. Count reps for each side.",
    ],
    breathing: "Keep breathing steadily; breathe out as you reach.",
    avoid:
      "Avoid lifting your leg so high that your back arches or rotating your hips toward the ceiling.",
    source:
      "https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/",
  },
  pulldown: {
    setup:
      "Adjust the thigh pad to hold you comfortably in the seat. Grip the bar slightly wider than shoulder width, with feet planted.",
    steps: [
      "Sit tall with a small, steady backward lean.",
      "Draw your elbows down toward your sides, bringing the bar toward your upper chest.",
      "Stop before you need to swing or strain to pull farther.",
      "Let the bar rise slowly while keeping the weight stack controlled.",
    ],
    breathing: "Breathe out as you pull down and in as you return.",
    avoid:
      "Avoid pulling behind your neck, swinging your torso, or letting the stack slam down.",
  },
  legpress: {
    setup:
      "Follow the machine’s setup instructions. Adjust the seat so your back and pelvis stay supported; place feet securely on the platform.",
    steps: [
      "Check the safety stops and select a manageable load before releasing the platform.",
      "Bend your knees slowly, keeping them aligned with your toes.",
      "Stop before your pelvis rolls away from the pad or your heels lift.",
      "Press through your feet to extend your legs without snapping your knees straight. Re-engage the safety stops before exiting.",
    ],
    breathing: "Breathe in as you lower and out as you press.",
    avoid:
      "Avoid forcing a deep range, lifting your hips from the seat, or fully locking your knees.",
  },
};
