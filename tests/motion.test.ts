import { readFileSync } from "node:fs";
import { Bone, Group, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { exercises } from "../src/domain";
import { applyPose, prepareRig, tempo } from "../src/motion/pose";
import { REP, demoIds, motionDuration, movements } from "../src/motion/catalog";
// Load the shipped skeleton hierarchy, so tests catch incompatible asset changes too.
function rigFromAsset() {
  const bytes = readFileSync(
    new URL("../public/motion/trainer.glb", import.meta.url),
  );
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  type Node = {
    name: string;
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    children?: number[];
  };
  const nodes: Node[] = gltf.nodes;
  const bones = nodes.map((n) => {
    const b = new Bone();
    b.name = n.name;
    if (n.translation) b.position.fromArray(n.translation);
    if (n.rotation) b.quaternion.fromArray(n.rotation);
    if (n.scale) b.scale.fromArray(n.scale);
    return b;
  });
  nodes.forEach((n, i) => n.children?.forEach((c) => bones[i].add(bones[c])));
  const root = new Group();
  bones.filter((b) => !b.parent).forEach((b) => root.add(b));
  return prepareRig(root);
}
describe("movement previews", () => {
  it("covers every catalog exercise", () => {
    for (const exercise of exercises)
      expect(demoIds.has(exercise.id)).toBe(true);
  });
  it.each(movements)(
    "%s animates continuously with finite, stable-length bones",
    (movement) => {
      const rig = rigFromAsset();
      const samples: number[][] = [];
      for (let frame = 0; frame <= 96; frame++) {
        const pose = applyPose(rig, movement, frame * 0.1);
        for (const b of rig.bones.values()) {
          const position = b.bone.getWorldPosition(new Vector3());
          expect(
            [...position.toArray(), ...b.bone.quaternion.toArray()].every(
              Number.isFinite,
            ),
          ).toBe(true);
          if (b.bone.name !== "pelvis")
            expect(b.bone.position.length()).toBeCloseTo(b.p.length(), 4);
        }
        samples.push([
          ...pose.hands.flatMap((h) => h.toArray()),
          ...pose.ankles.flatMap((a) => a.toArray()),
          ...["pelvis", "spine_03"].flatMap((bone) =>
            rig.bones.get(bone)!.bone.getWorldPosition(new Vector3()).toArray(),
          ),
        ]);
      }
      // A press with planted hands moves the chest, not the hands, ankles or
      // pelvis, so the torso has to be in the sample for this to mean anything.
      expect(
        samples.some((s) =>
          s.some(
            (n, i) =>
              Math.abs(n - samples[0][i]) >
              (["calf", "dbcalf"].includes(movement) ? 0.04 : 0.08),
          ),
        ),
      ).toBe(true);
      for (let i = 1; i < samples.length; i++)
        expect(
          Math.max(
            ...samples[i].map((n, j) => Math.abs(n - samples[i - 1][j])),
          ),
        ).toBeLessThan(0.13);
    },
  );
  it.each([
    "squat",
    "goblet",
    "rdl",
    "curl",
    "press",
    "floor",
    "bridge",
    "pushup",
    "row",
    "pulldown",
  ] as const)("%s keeps both feet planted", (movement) => {
    const rig = rigFromAsset();
    const balls = () =>
      ["ball_l", "ball_r"].map((name) =>
        rig.bones.get(name)!.bone.getWorldPosition(new Vector3()),
      );
    applyPose(rig, movement, 0);
    const start = balls();
    for (const time of [0.6, 1.2, 2.4, 3.6, 4.8]) {
      applyPose(rig, movement, time);
      balls().forEach((ball, i) =>
        expect(ball.distanceTo(start[i])).toBeLessThan(0.015),
      );
    }
  });
  it("bird dog alternates opposite limbs", () => {
    const rig = rigFromAsset();
    const first = applyPose(rig, "bird", REP * 0.4),
      second = applyPose(rig, "bird", REP * 1.4);
    expect(first.hands[0].y).toBeGreaterThan(first.hands[1].y + 0.3);
    expect(first.ankles[1].y).toBeGreaterThan(first.ankles[0].y + 0.3);
    expect(second.hands[1].y).toBeGreaterThan(second.hands[0].y + 0.3);
    expect(second.ankles[0].y).toBeGreaterThan(second.ankles[1].y + 0.3);
  });
});

it("keeps the deadlift a hip hinge with only a soft knee bend", () => {
  const rig = rigFromAsset();
  applyPose(rig, "rdl", REP * 0.45);
  const position = (name: string) =>
    rig.bones.get(name)!.bone.getWorldPosition(new Vector3());
  const knee = position("calf_l");
  expect(
    position("thigh_l").sub(knee).angleTo(position("foot_l").sub(knee)),
  ).toBeGreaterThan(2.5);
});
it("keeps supported wrists at the bench or mat", () => {
  const rig = rigFromAsset();
  for (const time of [0, 1.2, 2.4, 3.6]) {
    applyPose(rig, "pushup", time);
    for (const side of ["l", "r"])
      expect(
        rig.bones.get("hand_" + side)!.bone.getWorldPosition(new Vector3()).y,
      ).toBeCloseTo(0.715, 2);
    applyPose(rig, "bird", time);
    expect(
      rig.bones.get("hand_r")!.bone.getWorldPosition(new Vector3()).y,
    ).toBeCloseTo(0.108, 2);
  }
});

it.each(["calf", "dbcalf"] as const)(
  "%s keeps the balls of the feet in contact while lifting heels",
  (movement) => {
    const rig = rigFromAsset();
    applyPose(rig, movement, 0);
    const ball = rig.bones.get("ball_l")!.bone;
    const start = ball.getWorldPosition(new Vector3());
    for (const time of [0.6, 1.2, 2.4, 3.6]) {
      applyPose(rig, movement, time);
      expect(
        ball.getWorldPosition(new Vector3()).distanceTo(start),
      ).toBeLessThan(0.015);
    }
  },
);

describe("rep tempo", () => {
  /** Seconds spent moving toward the end range (up) and back to the start (down). */
  const travel = (id: "curl" | "squat") => {
    const dt = 0.001;
    let up = 0,
      down = 0;
    for (let t = 0; t < REP; t += dt) {
      const delta = tempo(id, t + dt) - tempo(id, t);
      if (delta > 1e-6) up += dt;
      if (delta < -1e-6) down += dt;
    }
    return { up, down };
  };
  it("holds at both ends of every rep", () => {
    for (const id of ["curl", "squat"] as const) {
      const samples = Array.from({ length: 400 }, (_, i) =>
        tempo(id, (REP * i) / 400),
      );
      expect(samples.filter((u) => u === 1).length).toBeGreaterThan(30);
      expect(samples.filter((u) => u === 0).length).toBeGreaterThan(30);
    }
  });
  it("lowers more slowly than it lifts", () => {
    // Curl lifts toward the end range; squat lowers toward it.
    expect(travel("curl").down).toBeGreaterThan(travel("curl").up * 1.2);
    expect(travel("squat").up).toBeGreaterThan(travel("squat").down * 1.2);
  });
  it("starts and finishes each phase gently", () => {
    const step = 0.01;
    for (const t of [0, REP * 0.3 - step, REP * 0.46, REP * 0.86 - step])
      expect(Math.abs(tempo("curl", t + step) - tempo("curl", t))).toBeLessThan(
        0.002,
      );
    const peak = Math.max(
      ...Array.from({ length: 100 }, (_, i) =>
        Math.abs(tempo("curl", i * step + step) - tempo("curl", i * step)),
      ),
    );
    expect(peak).toBeGreaterThan(0.012);
  });
  it("plays squats lowering first and curls lifting first", () => {
    expect(tempo("squat", REP * 0.2)).toBeGreaterThan(0.2);
    expect(tempo("squat", REP * 0.9)).toBe(0);
    expect(tempo("curl", REP * 0.2)).toBeGreaterThan(0.2);
    expect(tempo("curl", REP * 0.9)).toBe(0);
  });
});

describe("joint limits and contact", () => {
  const rig = rigFromAsset();
  const at = (name: string) =>
    rig.bones.get(name)!.bone.getWorldPosition(new Vector3());
  /** Signed hinge angle of `tip` about the parent's side axis, relative to rest. */
  const hinge = (parent: string, joint: string, tip: string) => {
    const p = rig.bones.get(parent)!,
      j = rig.bones.get(joint)!,
      t = rig.bones.get(tip)!;
    const now = at(tip)
      .sub(at(joint))
      .applyQuaternion(p.bone.getWorldQuaternion(new Quaternion()).invert())
      .normalize();
    const rest = t.worldP
      .clone()
      .sub(j.worldP)
      .applyQuaternion(p.worldQ.clone().invert())
      .normalize();
    const side = new Vector3(1, 0, 0).applyQuaternion(
      p.worldQ.clone().invert(),
    );
    return (
      (Math.atan2(rest.clone().cross(now).dot(side), rest.dot(now)) * 180) /
      Math.PI
    );
  };
  it.each(movements)(
    "%s bends knees and ankles only the way people can",
    (movement) => {
      const duration = motionDuration(movement);
      for (let i = 0; i < 40; i++) {
        applyPose(rig, movement, (duration * i) / 40);
        for (const s of ["l", "r"]) {
          expect(hinge("thigh_" + s, "calf_" + s, "foot_" + s)).toBeGreaterThan(
            -8,
          );
          const ankle = hinge("calf_" + s, "foot_" + s, "ball_" + s);
          expect(ankle).toBeGreaterThan(-40);
          expect(ankle).toBeLessThan(55);
        }
      }
    },
  );
  it.each(movements.filter((m) => m !== "legpress"))(
    "%s keeps toes above the floor",
    (movement) => {
      const duration = motionDuration(movement);
      for (let i = 0; i < 40; i++) {
        applyPose(rig, movement, (duration * i) / 40);
        for (const s of ["l", "r"]) {
          expect(at("ball_" + s).y).toBeGreaterThan(0.012);
          expect(at("ball_leaf_" + s).y).toBeGreaterThan(0.012);
        }
      }
    },
  );
  it("presses the leg press sled with the soles flat against the plate", () => {
    const normal = new Vector3(0, Math.SQRT1_2, Math.SQRT1_2);
    for (let i = 0; i < 20; i++) {
      const pose = applyPose(rig, "legpress", (REP * i) / 20);
      for (const s of ["l", "r"]) {
        const foot = rig.bones.get("foot_" + s)!;
        const sole = new Vector3(0, -1, 0).applyQuaternion(
          foot.bone
            .getWorldQuaternion(new Quaternion())
            .multiply(foot.worldQ.clone().invert()),
        );
        expect(sole.dot(normal)).toBeGreaterThan(0.99);
      }
      expect(pose.plate).not.toBeNull();
    }
  });
});

/* Orientation, not position. A hand can sit exactly where it belongs with the
   palm facing backwards, and a foot can stand on the right spot with the toes
   pointing behind it, so these read the bones' own axes.

   The hand's local +Y runs wrist to fingertips. The palm normal is local +X on
   the left and local -X on the right: the hands mirror, and in the bind pose
   both palms face the floor. This is checked against the finger bones in the
   test below, because taking the wrong axis here passes happily while every
   planted hand stands on its edge. The foot is flat at rest, so its sole is
   world-down carried through the bone's rotation. */
describe("hand and foot orientation", () => {
  const palm = (rig: ReturnType<typeof prepareRig>, side: string) =>
    new Vector3(side === "l" ? 1 : -1, 0, 0).applyQuaternion(
      rig.bones.get("hand_" + side)!.bone.getWorldQuaternion(new Quaternion()),
    );

  it("takes the palm normal from the axis the finger bones agree with", () => {
    const rig = rigFromAsset();
    for (const movement of ["pushup", "hammer", "lateral"] as const) {
      applyPose(rig, movement, REP * 0.45);
      for (const side of ["l", "r"]) {
        const place = (name: string) =>
          rig.bones.get(name)!.bone.getWorldPosition(new Vector3());
        const fingers = place(`middle_01_${side}`)
          .sub(place(`hand_${side}`))
          .normalize();
        const across = place(`pinky_01_${side}`)
          .sub(place(`index_01_${side}`))
          .normalize();
        const fromBones = new Vector3()
          .crossVectors(across, fingers)
          .multiplyScalar(side === "l" ? 1 : -1)
          .normalize();
        expect(palm(rig, side).dot(fromBones)).toBeGreaterThan(0.99);
      }
    }
  });
  const sole = (rig: ReturnType<typeof prepareRig>, side: string) => {
    const foot = rig.bones.get("foot_" + side)!;
    return new Vector3(0, -1, 0).applyQuaternion(
      foot.bone
        .getWorldQuaternion(new Quaternion())
        .multiply(foot.worldQ.clone().invert()),
    );
  };
  const place = (rig: ReturnType<typeof prepareRig>, name: string) =>
    rig.bones.get(name)!.bone.getWorldPosition(new Vector3());

  it.each(["pushup", "narrowpushup", "bridge", "bird", "donkey", "hydrant", "row"] as const)(
    "%s rests its supporting palms on the surface, not on their edge",
    (movement) => {
      const rig = rigFromAsset();
      for (let i = 0; i < 12; i++) {
        applyPose(rig, movement, (motionDuration(movement) * i) / 12);
        for (const side of ["l", "r"]) {
          // Only the planted hand: bird dog reaches the other one forward.
          if (place(rig, "hand_" + side).y > 0.25) continue;
          expect(palm(rig, side).y).toBeLessThan(-0.8);
        }
      }
    },
  );

  it.each(["hammer", "closefloor"] as const)(
    "%s holds a neutral grip, with the palms facing each other",
    (movement) => {
      const rig = rigFromAsset();
      applyPose(rig, movement, REP * 0.45);
      expect(palm(rig, "l").x).toBeLessThan(-0.9);
      expect(palm(rig, "r").x).toBeGreaterThan(0.9);
    },
  );

  it.each(["curl", "altcurl"] as const)(
    "%s finishes supinated, with the palm turned toward the shoulder",
    (movement) => {
      const rig = rigFromAsset();
      applyPose(rig, movement, REP * 0.45);
      // The left arm is the working one at this point in an alternating curl.
      expect(palm(rig, "l").y).toBeGreaterThan(0.4);
      expect(palm(rig, "l").z).toBeLessThan(-0.5);
    },
  );

  it.each(["press", "seatedpress", "floor"] as const)(
    "%s presses with a pronated grip rather than palms turned outward",
    (movement) => {
      const rig = rigFromAsset();
      applyPose(rig, movement, REP * 0.45);
      for (const side of ["l", "r"]) {
        expect(palm(rig, side).z).toBeGreaterThan(0.9);
        expect(Math.abs(palm(rig, side).x)).toBeLessThan(0.3);
      }
    },
  );

  it.each(["goblet", "sumo"] as const)(
    "%s cups the upright dumbbell from below",
    (movement) => {
      const rig = rigFromAsset();
      applyPose(rig, movement, REP * 0.45);
      for (const side of ["l", "r"])
        expect(palm(rig, side).y).toBeGreaterThan(0.8);
    },
  );

  it.each(["lateral", "reversefly"] as const)(
    "%s finishes the raise palm-down",
    (movement) => {
      const rig = rigFromAsset();
      applyPose(rig, movement, REP * 0.45);
      for (const side of ["l", "r"])
        expect(palm(rig, side).y).toBeLessThan(-0.9);
    },
  );

  it("grips the pulldown bar across it rather than along it", () => {
    const rig = rigFromAsset();
    for (let i = 0; i < 12; i++) {
      applyPose(rig, "pulldown", (REP * i) / 12);
      for (const side of ["l", "r"]) {
        // The bar runs along x, so a palm pointing that way is a hand turned
        // ninety degrees out of its grip.
        expect(Math.abs(palm(rig, side).x)).toBeLessThan(0.3);
        expect(palm(rig, side).y).toBeLessThan(-0.8);
      }
    }
  });

  it.each(["split", "lunge"] as const)(
    "%s keeps the rear toes pointing forward",
    (movement) => {
      const rig = rigFromAsset();
      for (let i = 0; i < 16; i++) {
        applyPose(rig, movement, (motionDuration(movement) * i) / 16);
        for (const side of ["l", "r"]) {
          const ball = place(rig, "ball_" + side);
          if (ball.y > 0.06) continue; // mid-step, off the floor
          const ankle = place(rig, "foot_" + side);
          expect(ball.z).toBeGreaterThan(ankle.z);
          expect(sole(rig, side).y).toBeLessThan(0.1);
        }
      }
    },
  );
});
