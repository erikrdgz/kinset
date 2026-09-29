export const movements = [
  "squat",
  "goblet",
  "curl",
  "press",
  "rdl",
  "row",
  "floor",
  "pushup",
  "bridge",
  "bird",
  "pulldown",
  "legpress",
] as const;
export type Movement = (typeof movements)[number];
export const demoIds: ReadonlySet<string> = new Set(movements);
export const floorMovements = new Set<Movement>([
  "floor",
  "bridge",
  "bird",
  "pushup",
  "legpress",
]);
export const sideFirst = new Set<Movement>([
  "rdl",
  "row",
  "floor",
  "pushup",
  "bridge",
  "bird",
  "legpress",
]);
export const motionCue: Record<Movement, string> = {
  squat: "Lower with control · stand tall",
  goblet: "Keep the weight at your chest · sit down and stand",
  curl: "Keep elbows close · curl and lower",
  press: "Press overhead · lower with control",
  rdl: "Move hips back · keep weights close",
  row: "Support one hand · draw the other elbow toward your hip",
  floor: "Upper arms meet the floor · press upward",
  pushup: "Keep a straight body · lower toward the bench",
  bridge: "Feet stay planted · lift and lower your hips",
  bird: "Reach opposite arm and leg · alternate sides",
  pulldown: "Draw elbows down · return the bar with control",
  legpress: "Bend knees · press the platform away",
};
