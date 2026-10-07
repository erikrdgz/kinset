import {
  Bone,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { REP, baseMovement, lowersFirst, type Movement } from "./catalog";
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const xAxis = v(1, 0, 0);
const zAxis = v(0, 0, 1);
const rx = (angle: number) => new Quaternion().setFromAxisAngle(xAxis, angle);
/** Pitch of a direction about the x axis; rx(a) adds a to it. */
const pitch = (d: Vector3) => Math.atan2(d.z, d.y);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
/** Concentric: leave the start smoothly, drive through the middle, ease into the end range. */
const drive = (x: number) => smoother(x);
/** Eccentric: controlled throughout, with a longer deceleration into the stretch. */
const control = (x: number) => smoother(1 - Math.pow(1 - x, 1.4));
/**
 * Rep position, 0 at the start and 1 at the end range. Each rep has a hold at both ends
 * and an eccentric that takes longer than the concentric.
 */
export function tempo(id: Movement, time: number) {
  const p = (((time % REP) + REP) % REP) / REP;
  if (lowersFirst.has(id)) {
    if (p < 0.4) return control(p / 0.4);
    if (p < 0.5) return 1;
    if (p < 0.8) return 1 - drive((p - 0.5) / 0.3);
    return 0;
  }
  if (p < 0.3) return drive(p / 0.3);
  if (p < 0.46) return 1;
  if (p < 0.86) return 1 - control((p - 0.46) / 0.4);
  return 0;
}
/** Leg press sled travel in the plate's normal direction. */
const sled = v(0, Math.SQRT1_2, Math.SQRT1_2);
/** Rest sole centre relative to the ankle, used to seat the leg press plate. */
const soleCentre = v(0, -0.1037, 0.089);
const pressTilt = (-3 * Math.PI) / 4;
// Contact tuning, measured against the mesh in QA.
const QUAD_HIP = 0.515;
const QUAD_BALL_Z = -0.7;
const QUAD_HAND_Y = 0.108;
const PUSH_BALL_Z = -0.78;
const PUSH_ANKLE = -0.2;
const PUSH_DEPTH = 0.18;
const PUSH_HAND_Y = 0.715;
const BRIDGE_HAND_Y = 0.108;
const FLOOR_FEET_Z = 0.56;
const CALF_RAISE = 0.7;
const SPLIT_DROP = 0.26;
const SPLIT_BALL_Z = -0.62;
const LUNGE_DROP = 0.3;
const LUNGE_BALL_Z = -0.6;
const PRESS_HIP = [0.43, -0.37] as const;
const PRESS_RECLINE = -1.05;
const PRESS_REACH = [0.436, 0.393] as const;
const PRESS_TRAVEL = 0.21;
export type RestBone = {
  bone: Bone;
  q: Quaternion;
  p: Vector3;
  worldQ: Quaternion;
  worldP: Vector3;
};
export function prepareRig(scene: Object3D) {
  scene.updateMatrixWorld(true);
  const bones = new Map<string, RestBone>();
  scene.traverse((o) => {
    if (o instanceof Bone)
      bones.set(o.name, {
        bone: o,
        q: o.quaternion.clone(),
        p: o.position.clone(),
        worldQ: o.getWorldQuaternion(new Quaternion()),
        worldP: o.getWorldPosition(new Vector3()),
      });
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.material = new MeshStandardMaterial({
        color: "#8a8d8f",
        roughness: 0.64,
        metalness: 0.12,
      });
    }
  });
  return { scene, bones };
}
export type Rig = ReturnType<typeof prepareRig>;
// A two-segment chain bends toward a pole, and clamps reach to preserve bone lengths.
export function solveJoint(
  origin: Vector3,
  target: Vector3,
  pole: Vector3,
  l1: number,
  l2: number,
) {
  const line = target.clone().sub(origin);
  const d = Math.max(
    Math.abs(l1 - l2) + 0.00001,
    Math.min(line.length(), l1 + l2 - 0.00001),
  );
  line.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const bend = pole.clone().addScaledVector(line, -pole.dot(line)).normalize();
  return origin.clone().addScaledVector(line, a).addScaledVector(bend, height);
}
export function applyPose(rig: Rig, id: Movement, time: number) {
  const movement = baseMovement(id);
  const u = tempo(id, time);
  const alternate = Math.floor(time / REP) % 2 === 0;
  const get = (name: string) => rig.bones.get(name)!;
  const pos = (name: string) => get(name).bone.getWorldPosition(new Vector3());
  for (const b of rig.bones.values()) {
    b.bone.quaternion.copy(b.q);
    b.bone.position.copy(b.p);
  }
  rig.scene.updateMatrixWorld(true);
  const orient = (name: string, worldQ: Quaternion) => {
    const b = get(name).bone;
    b.quaternion.copy(
      b.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(worldQ),
    );
    b.updateWorldMatrix(false, true);
  };
  const aim = (name: string, child: string, direction: Vector3) => {
    const b = get(name),
      rest = get(child).worldP.clone().sub(b.worldP).normalize();
    orient(
      name,
      new Quaternion()
        .setFromUnitVectors(rest, direction.clone().normalize())
        .multiply(b.worldQ),
    );
  };
  const ik = (
    a: string,
    b: string,
    c: string,
    target: Vector3,
    pole: Vector3,
  ) => {
    const origin = pos(a),
      l1 = get(a).worldP.distanceTo(get(b).worldP),
      l2 = get(b).worldP.distanceTo(get(c).worldP);
    const joint = solveJoint(origin, target, pole, l1, l2);
    aim(a, b, joint.clone().sub(origin));
    aim(b, c, target.clone().sub(pos(b)));
  };
  // Toe offset from the ankle at rest; the same for both feet apart from x.
  const ballRel = get("ball_l").worldP.clone().sub(get("foot_l").worldP);
  ballRel.x = 0;
  const shinPitch = (s: string) =>
    wrap(
      pitch(pos("foot_" + s).sub(pos("calf_" + s))) -
        pitch(
          get("foot_" + s)
            .worldP.clone()
            .sub(get("calf_" + s).worldP),
        ),
    );
  const ankleOver = (ball: Vector3, tilt: number) =>
    ball.clone().sub(ballRel.clone().applyQuaternion(rx(tilt)));
  /**
   * Stands a foot on its ball with the toes flat. `rel` holds the ankle relative to the shin
   * (+ points the toes); `weight` blends from a flat foot (0) to the ball stance (1).
   */
  const plant = (
    s: string,
    ball: Vector3,
    rel: number,
    pole: Vector3,
    weight = 1,
  ) => {
    let tilt = 0;
    for (let i = 0; i < 4; i++) {
      ik("thigh_" + s, "calf_" + s, "foot_" + s, ankleOver(ball, tilt), pole);
      tilt = weight * (shinPitch(s) + rel);
    }
    ik("thigh_" + s, "calf_" + s, "foot_" + s, ankleOver(ball, tilt), pole);
    return tilt;
  };
  /** Foot follows the shin, turned by `rel` about the leg's own side axis. */
  const footFollows = (s: string, rel: number) => {
    const c = get("calf_" + s);
    const turn = c.bone
      .getWorldQuaternion(new Quaternion())
      .multiply(c.worldQ.clone().invert());
    const side = xAxis.clone().applyQuaternion(turn);
    orient(
      "foot_" + s,
      new Quaternion()
        .setFromAxisAngle(side, rel)
        .multiply(turn)
        .multiply(get("foot_" + s).worldQ),
    );
  };
  /** Toes lie flat on the floor at 1 and follow the foot at 0. */
  const toesFlat = (s: string, amount: number) => {
    const ball = get("ball_" + s);
    const follow = ball.bone.getWorldQuaternion(new Quaternion());
    orient("ball_" + s, follow.slerp(ball.worldQ, amount));
  };
  let tilt = 0,
    hip = get("pelvis")
      .worldP.clone()
      .add(v(0, -0.008, 0));
  if (movement === "squat" || movement === "goblet") {
    hip.add(v(0, -0.27 * u, -0.17 * u));
    tilt = 0.33 * u;
  }
  if (movement === "rdl") {
    hip.add(v(0, 0.025 * u, -0.2 * u));
    tilt = 1.1 * u;
  }
  if (movement === "row") {
    hip.set(0, 0.86, -0.25);
    tilt = 1.1;
  }
  if (movement === "floor") {
    hip.set(0, 0.13, 0.05);
    tilt = -Math.PI / 2;
  }
  if (movement === "bridge") {
    hip.set(0, 0.13 + 0.2 * u, 0.05 + 0.04 * u);
    tilt = -Math.PI / 2 - 0.4 * u;
  }
  if (movement === "bird") {
    hip.set(0, QUAD_HIP, -0.2);
    tilt = 1.48;
  }
  if (movement === "pushup") {
    // Straight line from the balls of the feet; the body pivots over the toes.
    tilt = 0.9 + PUSH_DEPTH * u;
    hip
      .copy(ankleOver(v(0, 0.0152, PUSH_BALL_Z), tilt + PUSH_ANKLE))
      .add(v(0, 0.805, -0.014).applyQuaternion(rx(tilt)));
  }
  if (movement === "pulldown") {
    hip.set(0, 0.55, 0);
    tilt = -0.13;
  }
  if (movement === "legpress") {
    hip.set(0, PRESS_HIP[0], PRESS_HIP[1]);
    tilt = PRESS_RECLINE;
  }
  // Calf raise: the body rises by exactly what the heel rotation lifts the ankle.
  const raise = id === "calf" || id === "dbcalf" ? CALF_RAISE * u : 0;
  if (raise)
    hip.add(ankleOver(v(0, 0.0152, 0.1132), raise).sub(v(0, 0.1037, -0.0358)));
  if (id === "split") {
    hip.set(0, 0.84 - SPLIT_DROP * u, -0.08);
    tilt = 0.12;
  }
  if (id === "lunge") {
    hip.set(0, 0.908 - LUNGE_DROP * u, -0.05 - 0.14 * u);
    tilt = 0.14 * u;
  }
  if (id === "seatedpress") {
    hip.set(0, 0.55, 0);
    tilt = 0;
  }
  const pelvis = get("pelvis");
  pelvis.bone.position.copy(pelvis.bone.parent!.worldToLocal(hip.clone()));
  orient(
    "pelvis",
    new Quaternion().setFromAxisAngle(xAxis, tilt).multiply(pelvis.worldQ),
  );
  if (movement === "bridge")
    orient(
      "neck_01",
      new Quaternion()
        .setFromAxisAngle(xAxis, -Math.PI / 2)
        .multiply(get("neck_01").worldQ),
    );
  const hands: Vector3[] = [];
  const ankles: Vector3[] = [];
  for (const [index, suffix, sign] of [
    [0, "l", 1],
    [1, "r", -1],
  ] as const) {
    const thigh = "thigh_" + suffix,
      calf = "calf_" + suffix,
      foot = "foot_" + suffix;
    let ankle = v(sign * 0.13, 0.1037, -0.0358),
      pole = v(0, 0, 1),
      footTilt = 0,
      // Set when the foot stands on its ball rather than flat.
      ball: Vector3 | null = null,
      ballAnkle = 0,
      ballWeight = 1;
    if (movement === "row") ankle.z = sign === 1 ? 0.15 : -0.25;
    if (movement === "floor" || movement === "bridge") {
      ankle.z = FLOOR_FEET_Z;
      ankle.y += 0.004; // on the mat
      pole = v(0, 1, 0);
    }
    if (movement === "pushup") {
      // Legs stay straight, so the foot turns with the body on the balls of the feet.
      footTilt = tilt + PUSH_ANKLE;
      ankle = ankleOver(v(sign * 0.13, 0.0152, PUSH_BALL_Z), footTilt);
    }
    if (movement === "pulldown") {
      ankle.z = 0.48;
      pole = v(0, 0, 1);
    }
    if (movement === "legpress") {
      // Feet flat on the sled; it travels along its own normal.
      ankle = pos(thigh)
        .add(v(0, PRESS_REACH[0], PRESS_REACH[1]))
        .addScaledVector(sled, PRESS_TRAVEL * u);
      ankle.x = sign * 0.13;
      pole = v(0, 1, 0);
      footTilt = pressTilt;
    }
    if (id === "sumo") {
      ankle.x = sign * 0.24;
      pole = v(sign * 0.25, 0, 1);
    }
    if (id === "split") {
      if (sign === 1) ankle.z = 0.28;
      else {
        ball = v(sign * 0.13, 0.0152, SPLIT_BALL_Z);
        ballAnkle = 0.1;
      }
    }
    if (id === "lunge" && (suffix === "r") === alternate) {
      // Step back: the heel peels first, the foot arcs clear and lands on its ball.
      const travel = Math.min(1, u * 1.15);
      ball = v(sign * 0.13, 0.0152, 0.1132)
        .lerp(v(sign * 0.13, 0.0152, LUNGE_BALL_Z), travel)
        .add(v(0, 0.07 * Math.sin(Math.PI * travel), 0));
      ballAnkle = 0.1;
      ballWeight = smoother(Math.min(1, u * 3));
    }
    if (raise) {
      ankle = ankleOver(v(sign * 0.13, 0.0152, 0.1132), raise);
      footTilt = raise;
    }
    if (id === "seatedpress") ankle.z = 0.48;
    if (id === "deadbug") {
      ankle = v(sign * 0.12, 0.5, 0.45);
      if ((suffix === "r") === alternate)
        ankle.lerp(v(sign * 0.12, 0.13, 0.84), u);
      pole = v(0, 1, 0);
    }
    if (movement === "bird") {
      // Kneel on tucked toes; the working leg lifts out of that exact position.
      const phase = (suffix === "r") === alternate ? u : 0;
      const rest = plant(
        suffix,
        v(sign * 0.1, 0.021, QUAD_BALL_Z),
        0,
        v(0, -1, 0),
      );
      if (phase > 0) {
        const knee = pos(calf),
          upperLeg = knee.clone().sub(pos(thigh)),
          lowerLeg = pos(foot).sub(knee);
        let turnFoot = 0;
        if (id === "hydrant") {
          upperLeg.applyAxisAngle(zAxis, sign * 0.85 * phase);
          lowerLeg.applyAxisAngle(zAxis, sign * 0.85 * phase);
        } else {
          // Donkey: thigh to horizontal, shin to vertical. Bird dog: whole leg long.
          const thighTo = id === "donkey" ? v(0, 0.05, -1) : v(0, 0.08, -1);
          const shinTo = id === "donkey" ? v(0, 1, -0.05) : thighTo;
          upperLeg.applyAxisAngle(
            xAxis,
            wrap(pitch(thighTo) - pitch(upperLeg)) * phase,
          );
          lowerLeg.applyAxisAngle(
            xAxis,
            wrap(pitch(shinTo) - pitch(lowerLeg)) * phase,
          );
          if (id === "bird") turnFoot = -0.15 * phase;
        }
        aim(thigh, calf, upperLeg);
        aim(calf, foot, lowerLeg);
        footFollows(suffix, turnFoot);
        // Toes stay pressed flat until the ball clears the floor by a toe length.
        toesFlat(
          suffix,
          1 - Math.min(1, Math.max(0, (pos("ball_" + suffix).y - 0.035) / 0.1)),
        );
      } else {
        orient(foot, rx(rest).multiply(get(foot).worldQ));
        toesFlat(suffix, 1);
      }
    } else if (ball) {
      footTilt = plant(suffix, ball, ballAnkle, pole, ballWeight);
    } else ik(thigh, calf, foot, ankle, pole);
    if (movement === "floor" && id === "deadbug") footFollows(suffix, 0.15);
    else if (movement !== "bird") {
      orient(foot, rx(footTilt).multiply(get(foot).worldQ));
      if (ball || raise || movement === "pushup") toesFlat(suffix, 1);
    }
    ankles[index] = pos(foot);
    const upper = "upperarm_" + suffix,
      lower = "lowerarm_" + suffix,
      hand = "hand_" + suffix;
    if (["split", "lunge", "calf", "dbcalf"].includes(id)) {
      aim(upper, lower, v(sign * 0.08, -1, 0));
      aim(lower, hand, v(0, -1, 0.05));
    } else if (id === "goodmorning") {
      ik(
        upper,
        lower,
        hand,
        pos("spine_03").add(v(-sign * 0.1, 0, 0.12)),
        v(sign * 0.5, -1, 0),
      );
    } else if (["lateral", "frontraise", "reversefly"].includes(id)) {
      const angle = (id === "frontraise" ? 1.4 : 1.3) * u;
      const direction =
        id === "frontraise"
          ? v(sign * 0.02, -Math.cos(angle), Math.sin(angle))
          : v(sign * Math.sin(angle), -Math.cos(angle), 0.12);
      aim(upper, lower, direction);
      aim(lower, hand, direction.clone().add(v(0, 0.04, 0.08)));
    } else if (id === "bentrow") {
      aim(upper, lower, v(sign * 0.04, -Math.cos(1.6 * u), -Math.sin(1.6 * u)));
      aim(lower, hand, v(0, -1, 0.1));
    } else if (id === "deadbug") {
      const phase = (suffix === "l") === alternate ? u : 0;
      const direction = v(
        sign * 0.03,
        Math.cos(1.35 * phase),
        -Math.sin(1.35 * phase),
      );
      aim(upper, lower, direction);
      aim(lower, hand, direction);
    } else if (id === "donkey" || id === "hydrant") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.2, QUAD_HAND_Y, 0.34),
        v(sign * 0.1, -1, 0),
      );
    } else if (id === "closefloor") {
      aim(
        upper,
        lower,
        v(sign * 0.2 * (1 - u), 0.02 + 0.98 * u, 0.98 * (1 - u)),
      );
      aim(lower, hand, v(0, 1, 0));
    } else if (id === "narrowpushup") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.15, PUSH_HAND_Y, 0.43),
        v(sign * 0.2, -0.3, -1),
      );
    } else if (movement === "curl") {
      aim(upper, lower, v(sign * 0.08, -1, 0.04));
      const angle =
        0.12 +
        2.05 * (id === "altcurl" && (suffix === "l") !== alternate ? 0 : u);
      aim(lower, hand, v(sign * 0.025, -Math.cos(angle), Math.sin(angle)));
    } else if (movement === "press") {
      aim(upper, lower, v(sign * (0.95 - 0.82 * u), 0.08 + 0.92 * u, 0.12));
      aim(lower, hand, v(-sign * 0.06, 1, 0.08));
    } else if (movement === "goblet") {
      const target = pos("spine_03").add(v(sign * 0.065, -0.03, 0.2));
      ik(upper, lower, hand, target, v(sign * 0.55, -1, 0));
    } else if (movement === "rdl") {
      aim(upper, lower, v(sign * 0.04, -1, 0.06));
      aim(lower, hand, v(0, -1, 0.05));
    } else if (movement === "row") {
      if (suffix === "l")
        ik(upper, lower, hand, v(0.24, 0.63, 0.42), v(0.2, -1, -0.2));
      else {
        aim(upper, lower, v(-0.04, -Math.cos(1.6 * u), -Math.sin(1.6 * u)));
        aim(lower, hand, v(0, -1, 0.1));
      }
    } else if (movement === "floor") {
      aim(
        upper,
        lower,
        v(sign * (0.88 - 0.78 * u), 0.02 + 0.98 * u, 0.45 * (1 - u)),
      );
      aim(lower, hand, v(-sign * 0.05, 1, 0));
    } else if (movement === "bridge") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.27, BRIDGE_HAND_Y, 0.12),
        v(sign * 0.5, 0, 0),
      );
    } else if (movement === "pushup") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.26, PUSH_HAND_Y, 0.43),
        v(sign * 0.7, -0.3, -0.5),
      );
    } else if (movement === "bird") {
      const extending = (suffix === "l") === alternate;
      const target = v(sign * 0.2, QUAD_HAND_Y, 0.34);
      if (extending) target.lerp(v(sign * 0.2, 0.6, 0.96), u);
      ik(upper, lower, hand, target, v(sign * 0.1, -1, 0));
    } else if (movement === "pulldown") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.4, 1.53 - 0.48 * u, 0.13),
        v(sign * 1, -0.2, 0),
      );
    } else if (movement === "legpress") {
      ik(upper, lower, hand, v(sign * 0.27, 0.34, -0.28), v(sign * 1, -1, 0));
    } else {
      aim(upper, lower, v(sign * 0.12, -0.18, 0.9));
      aim(lower, hand, v(-sign * 0.05, 0.05, 1));
    }
    // Palm extends from the wrist in local +Y; point it down for supported hands.
    if (
      ["pushup", "bird", "bridge"].includes(movement) ||
      (id === "row" && suffix === "l")
    ) {
      orient(hand, new Quaternion().setFromUnitVectors(v(0, 1, 0), v(0, 0, 1)));
    }
    if (id === "narrowpushup")
      orient(hand, new Quaternion().setFromUnitVectors(v(0, 1, 0), v(0, 0, 1)));
    if (id === "hammer" || id === "closefloor")
      orient(
        hand,
        get(hand)
          .bone.getWorldQuaternion(new Quaternion())
          .multiply(
            new Quaternion().setFromAxisAngle(v(0, 1, 0), (sign * Math.PI) / 2),
          ),
      );
    const grips =
      ["curl", "press", "rdl", "row", "floor", "goblet", "pulldown"].includes(
        movement,
      ) &&
      !(id === "row" && suffix === "l") &&
      id !== "deadbug";
    if (grips)
      for (const b of rig.bones.values())
        if (
          new RegExp("^(index|middle|ring|pinky)_0[123]_" + suffix + "$").test(
            b.bone.name,
          )
        )
          b.bone.quaternion
            .copy(b.q)
            .multiply(new Quaternion().setFromAxisAngle(xAxis, 1.2));
    get(hand).bone.updateWorldMatrix(false, true);
    hands[index] = get(hand).bone.localToWorld(v(0, 0.075, 0));
  }
  // Leg press plate face sits flush under both soles.
  const plate =
    movement === "legpress"
      ? ankles[0]
          .clone()
          .add(ankles[1])
          .multiplyScalar(0.5)
          .add(soleCentre.clone().applyQuaternion(rx(pressTilt)))
          .addScaledVector(sled, 0.025)
      : null;
  return { u, hands, ankles, plate };
}
