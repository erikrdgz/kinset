import { extraExercises } from "./extraExercises";
import type { WorkoutPlan } from "./plans";
import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  goal: z.enum([
    "Build strength",
    "Build consistency",
    "Support getting leaner",
  ]),
  days: z.coerce.number().int().min(2).max(4),
  equipment: z.enum(["Dumbbells", "Full gym", "Bodyweight"]),
  experience: z.enum(["New to training", "Returning", "Consistent"]),
  unit: z.enum(["kg", "lb"]),
  weight: z.union([z.literal(""), z.coerce.number().positive().max(1500)]),
  height: z.union([z.literal(""), z.coerce.number().positive().max(300)]),
});
export type Profile = z.infer<typeof profileSchema>;
export type Muscle = "Chest" | "Back" | "Shoulders" | "Arms" | "Core" | "Legs";
export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Profile["equipment"];
  cue: string;
  reps: string;
};
export const exercises: Exercise[] = [
  ...extraExercises,
  {
    id: "goblet",
    name: "Goblet squat",
    muscle: "Legs",
    equipment: "Dumbbells",
    cue: "Hold one dumbbell at your chest. Lower with control through a comfortable range.",
    reps: "8–10",
  },
  {
    id: "floor",
    name: "Dumbbell floor press",
    muscle: "Chest",
    equipment: "Dumbbells",
    cue: "Lie on your back with knees bent. Press up, then lower until upper arms gently touch the floor.",
    reps: "8–12",
  },
  {
    id: "row",
    name: "Supported dumbbell row",
    muscle: "Back",
    equipment: "Dumbbells",
    cue: "Support one hand on a stable bench. Pull the weight toward your hip without twisting.",
    reps: "8–12 / side",
  },
  {
    id: "rdl",
    name: "Dumbbell Romanian deadlift",
    muscle: "Legs",
    equipment: "Dumbbells",
    cue: "Keep the weights close. Move hips back with a soft bend in your knees.",
    reps: "8–10",
  },
  {
    id: "press",
    name: "Dumbbell shoulder press",
    muscle: "Shoulders",
    equipment: "Dumbbells",
    cue: "Press overhead through a comfortable range, keeping your torso steady.",
    reps: "8–12",
  },
  {
    id: "curl",
    name: "Dumbbell curl",
    muscle: "Arms",
    equipment: "Dumbbells",
    cue: "Keep elbows near your sides. Lift and lower without swinging.",
    reps: "10–12",
  },
  {
    id: "squat",
    name: "Bodyweight squat",
    muscle: "Legs",
    equipment: "Bodyweight",
    cue: "Use a comfortable stance and depth. Keep movement controlled.",
    reps: "8–12",
  },
  {
    id: "pushup",
    name: "Incline push-up",
    muscle: "Chest",
    equipment: "Bodyweight",
    cue: "Use a stable elevated surface. Keep your body in a straight line as you lower and press.",
    reps: "6–10",
  },
  {
    id: "bridge",
    name: "Glute bridge",
    muscle: "Legs",
    equipment: "Bodyweight",
    cue: "Lie on your back with feet planted. Raise your hips without arching your lower back.",
    reps: "10–12",
  },
  {
    id: "bird",
    name: "Bird dog",
    muscle: "Core",
    equipment: "Bodyweight",
    cue: "From hands and knees, slowly extend opposite arm and leg while keeping your torso steady.",
    reps: "6–8 / side",
  },
  {
    id: "pulldown",
    name: "Lat pulldown",
    muscle: "Back",
    equipment: "Full gym",
    cue: "Pull toward your upper chest with a steady torso, then return with control.",
    reps: "8–12",
  },
  {
    id: "legpress",
    name: "Leg press",
    muscle: "Legs",
    equipment: "Full gym",
    cue: "Set a comfortable seat position. Lower with control and avoid locking your knees.",
    reps: "8–12",
  },
];
export type SetLog = {
  id: string;
  reps: number;
  weight: number;
  done: boolean;
};
export type Session = {
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  planId?: string;
  dayId?: string;
  planName?: string;
  unit: "kg" | "lb";
  entries: { exerciseId: string; targetReps?: string; sets: SetLog[] }[];
};
export type State = {
  profile: Profile | null;
  sessions: Session[];
  active: Session | null;
  plans?: WorkoutPlan[];
  activePlanId?: string | null;
  planProgress?: Record<string, number>;
  planDraft?: WorkoutPlan | null;
};
export const emptyState: State = { profile: null, sessions: [], active: null };
export function program(p: Profile, index = 0) {
  const ids =
    p.equipment === "Bodyweight"
      ? ["squat", "pushup", "bridge", "bird"]
      : p.equipment === "Full gym"
        ? index % 2
          ? ["legpress", "press", "row", "bird"]
          : ["goblet", "floor", "pulldown", "bird"]
        : index % 2
          ? ["rdl", "press", "row", "bird"]
          : ["goblet", "floor", "row", "bird"];
  return ids.map((id) => exercises.find((e) => e.id === id)!);
}
export function startSession(p: Profile, index = 0): Session {
  return {
    id: crypto.randomUUID(),
    name: `Full body ${index % 2 ? "B" : "A"}`,
    startedAt: new Date().toISOString(),
    unit: p.unit,
    entries: program(p, index).map((e) => ({
      exerciseId: e.id,
      sets: Array.from(
        { length: p.experience === "New to training" ? 2 : 3 },
        () => ({ id: crypto.randomUUID(), reps: 0, weight: 0, done: false }),
      ),
    })),
  };
}
export function completedSets(s: Session) {
  return s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
}
export function finishSession(s: Session): Session {
  if (!completedSets(s))
    throw new Error("Log at least one set before finishing.");
  return {
    ...s,
    finishedAt: new Date().toISOString(),
    entries: s.entries
      .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
      .filter((e) => e.sets.length),
  };
}
export function validSet(s: SetLog) {
  return (
    Number.isInteger(s.reps) &&
    s.reps > 0 &&
    s.reps <= 999 &&
    Number.isFinite(s.weight) &&
    s.weight >= 0 &&
    s.weight <= 2000
  );
}
