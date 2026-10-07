export const baseMovements = [
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
export type BaseMovement = (typeof baseMovements)[number];
export const variants = {
  sumo: "goblet",
  split: "squat",
  lunge: "squat",
  calf: "curl",
  dbcalf: "curl",
  goodmorning: "rdl",
  bentrow: "row",
  reversefly: "row",
  lateral: "curl",
  frontraise: "curl",
  hammer: "curl",
  altcurl: "curl",
  seatedpress: "press",
  closefloor: "floor",
  deadbug: "floor",
  donkey: "bird",
  hydrant: "bird",
  narrowpushup: "pushup",
} as const;
export type Movement = BaseMovement | keyof typeof variants;
export const movements: Movement[] = [
  ...baseMovements,
  ...(Object.keys(variants) as (keyof typeof variants)[]),
];
export function baseMovement(id: Movement): BaseMovement {
  return id in variants
    ? variants[id as keyof typeof variants]
    : (id as BaseMovement);
}
/** Seconds per rep at 1× in pose time. Alternating movements play one rep per side. */
export const REP = 4;
export function motionDuration(id: Movement) {
  return ["bird", "deadbug", "donkey", "hydrant", "lunge", "altcurl"].includes(
    id,
  )
    ? REP * 2
    : REP;
}
/** Movements that start by lowering into the rep (eccentric first). */
export const lowersFirst: ReadonlySet<Movement> = new Set<Movement>([
  "squat",
  "goblet",
  "sumo",
  "split",
  "lunge",
  "rdl",
  "goodmorning",
  "pushup",
  "narrowpushup",
]);
export const demoIds: ReadonlySet<string> = new Set(movements);
export const floorMovements = new Set<Movement>([
  "floor",
  "bridge",
  "bird",
  "pushup",
  "legpress",
]);
/** Movements whose shape only reads from the side. A front view foreshortens a
    front raise into hanging arms and folds a split squat into one leg. */
export const sideFirst = new Set<Movement>([
  "rdl",
  "row",
  "floor",
  "pushup",
  "bridge",
  "bird",
  "legpress",
  "frontraise",
  "split",
  "lunge",
  "calf",
  "dbcalf",
]);
/** Variants that need the opposite of the movement they are built on: both of
    these travel sideways, which the side camera hides. */
const frontFirst = new Set<Movement>(["reversefly", "hydrant"]);
export function opensFromSide(id: Movement) {
  if (frontFirst.has(id)) return false;
  return sideFirst.has(id) || sideFirst.has(baseMovement(id));
}
export const motionCue: Record<BaseMovement, string> = {
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
