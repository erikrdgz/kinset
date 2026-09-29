import {
  Bone,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { baseMovement, type Movement } from "./catalog";
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const xAxis = v(1, 0, 0);
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
  const u = (1 - Math.cos((time / 4.8) * Math.PI * 2)) / 2;
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
    hip.set(0, 0.53, -0.2);
    tilt = 1.48;
  }
  if (movement === "pushup") {
    tilt = 0.9 + 0.2 * u;
    hip.set(0, 0.104 + 0.81 * Math.cos(tilt), -0.9 + 0.81 * Math.sin(tilt));
  }
  if (movement === "pulldown") {
    hip.set(0, 0.55, 0);
    tilt = -0.13;
  }
  if (movement === "legpress") {
    hip.set(0, 0.43, -0.37);
    tilt = -0.7;
  }
  if (id === "calf" || id === "dbcalf") hip.add(v(0, 0.06 * u, 0.06 * u));
  if (id === "split") {
    hip.set(0, 0.82 - 0.23 * u, -0.05);
    tilt = 0.12;
  }
  if (id === "lunge") {
    hip.set(0, 0.908 - 0.28 * u, -0.05 - 0.08 * u);
    tilt = 0.12 * u;
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
  const birdLeft = Math.floor(time / 4.8) % 2 === 0;
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
      footTilt = 0;
    if (movement === "row") ankle.z = sign === 1 ? 0.15 : -0.25;
    if (movement === "floor" || movement === "bridge") {
      ankle.z = 0.65;
      pole = v(0, 1, 0);
    }
    if (movement === "pushup") {
      ankle.z = -0.9;
      pole = v(0, 0, 1);
    }
    if (movement === "pulldown") {
      ankle.z = 0.48;
      pole = v(0, 0, 1);
    }
    if (movement === "legpress") {
      ankle.set(sign * 0.14, 0.62 + 0.23 * u, 0.12 + 0.26 * u);
      pole = v(0, 1, 0);
      footTilt = -Math.PI / 4;
    }
    if (movement === "bird") {
      const extending = (suffix === "r") === birdLeft;
      ankle = v(sign * 0.1, 0.09, -0.66);
      if (extending) ankle.lerp(v(sign * 0.1, 0.54, -1.02), u);
      pole = v(0, -1, 0);
      footTilt = extending ? -1.25 * u : 0;
    }
    const alternate = Math.floor(time / 4.8) % 2 === 0;
    if (id === "sumo") {
      ankle.x = sign * 0.24;
      pole = v(sign * 0.25, 0, 1);
    }
    if (id === "split") {
      ankle.z = sign === 1 ? 0.28 : -0.5;
      if (sign === -1) {
        ankle.y = 0.18;
        footTilt = 0.5;
      }
    }
    if (id === "lunge" && (suffix === "r") === alternate) {
      ankle.z -= 0.55 * u;
      ankle.y += 0.08 * u;
      footTilt = 0.5 * u;
    }
    if (id === "calf" || id === "dbcalf") {
      ankle.add(v(0, 0.06 * u, 0.06 * u));
      footTilt = 0.5 * u;
    }
    if (id === "seatedpress") ankle.z = 0.48;
    if (id === "deadbug") {
      ankle = v(sign * 0.12, 0.5, 0.45);
      if ((suffix === "r") === alternate)
        ankle.lerp(v(sign * 0.12, 0.13, 0.84), u);
      pole = v(0, 1, 0);
    }
    if (id === "donkey" || id === "hydrant") {
      const phase = (suffix === "r") === alternate ? u : 0;
      const angle = (id === "donkey" ? Math.PI / 2 : 0.8) * phase;
      aim(
        thigh,
        calf,
        id === "donkey"
          ? v(0, -Math.cos(angle), -Math.sin(angle))
          : v(sign * Math.sin(angle), -Math.cos(angle), 0),
      );
      aim(
        calf,
        foot,
        id === "donkey" ? v(0, Math.sin(angle), -Math.cos(angle)) : v(0, 0, -1),
      );
    } else ik(thigh, calf, foot, ankle, pole);
    orient(
      foot,
      new Quaternion()
        .setFromAxisAngle(xAxis, footTilt)
        .multiply(get(foot).worldQ),
    );
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
      ik(upper, lower, hand, v(sign * 0.2, 0.04, 0.34), v(sign * 0.1, -1, 0));
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
        v(sign * 0.15, 0.63, 0.43),
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
      ik(upper, lower, hand, v(sign * 0.27, 0.08, 0.12), v(sign * 0.5, 0, 0));
    } else if (movement === "pushup") {
      ik(
        upper,
        lower,
        hand,
        v(sign * 0.26, 0.63, 0.43),
        v(sign * 0.7, -0.3, -0.5),
      );
    } else if (movement === "bird") {
      const extending = (suffix === "l") === birdLeft;
      const target = v(sign * 0.2, 0.04, 0.34);
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
  return { u, hands, ankles };
}
