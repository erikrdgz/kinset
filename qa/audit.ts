import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Bone, Object3D, Quaternion, Vector3 } from "three";
import { applyPose, prepareRig } from "../src/motion/pose";
import { movements, motionDuration, type Movement } from "../src/motion/catalog";

const buf = readFileSync("public/motion/trainer.glb");
const scene: Object3D = await new Promise((res, rej) =>
  new GLTFLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    "",
    (g) => res(g.scene),
    rej,
  ),
);
const rig = prepareRig(scene);
const at = (n: string) => rig.bones.get(n)!.bone.getWorldPosition(new Vector3());

/** Torso frame: forward is where the chest faces, up runs along the spine. */
function torsoFrame() {
  const q = rig.bones.get("spine_03")!.bone.getWorldQuaternion(new Quaternion());
  const rest = rig.bones.get("spine_03")!.worldQ.clone().invert();
  const turn = q.clone().multiply(rest);
  return {
    forward: new Vector3(0, 0, 1).applyQuaternion(turn),
    up: new Vector3(0, 1, 0).applyQuaternion(turn),
  };
}

/** Signed offset of the middle joint from the straight line, along `axis`. */
function bendAxis(a: Vector3, mid: Vector3, b: Vector3, axis: Vector3) {
  const line = b.clone().sub(a);
  const len = line.length();
  if (len < 1e-6) return 0;
  line.divideScalar(len);
  const rel = mid.clone().sub(a);
  const off = rel.clone().addScaledVector(line, -rel.dot(line));
  return off.dot(axis.clone().normalize());
}

type Row = { movement: string; t: number; issue: string; detail: string };
const rows: Row[] = [];
const SAMPLES = 16;

for (const m of movements as Movement[]) {
  const dur = motionDuration(m);
  for (let i = 0; i < SAMPLES; i++) {
    const t = (dur * i) / SAMPLES;
    applyPose(rig, m, t);
    rig.scene.updateMatrixWorld(true);
    const { forward, up } = torsoFrame();
    for (const s of ["l", "r"] as const) {
      // Elbow must point away from the chest: the arm folds toward the body, never away.
      const sh = at(`upperarm_${s}`), el = at(`lowerarm_${s}`), wr = at(`hand_${s}`);
      const elbowFwd = bendAxis(sh, el, wr, forward);
      const armFold = sh.distanceTo(wr) / (sh.distanceTo(el) + el.distanceTo(wr));
      if (armFold < 0.985 && elbowFwd > 0.012)
        rows.push({ movement: m, t: +t.toFixed(2), issue: `elbow_${s}_bends_forward`,
          detail: `offset ${elbowFwd.toFixed(3)} fold ${armFold.toFixed(2)}` });

      // Knee must lead the hip-to-ankle line forward: a knee behind it is a backwards bend.
      const hp = at(`thigh_${s}`), kn = at(`calf_${s}`), an = at(`foot_${s}`);
      const kneeFwd = bendAxis(hp, kn, an, forward);
      const legFold = hp.distanceTo(an) / (hp.distanceTo(kn) + kn.distanceTo(an));
      if (legFold < 0.985 && kneeFwd < -0.012)
        rows.push({ movement: m, t: +t.toFixed(2), issue: `knee_${s}_bends_backward`,
          detail: `offset ${kneeFwd.toFixed(3)} fold ${legFold.toFixed(2)}` });

      // Toes should follow the shin, not point back up it.
      const ball = at(`ball_${s}`);
      const toe = ball.clone().sub(an).normalize();
      const shin = an.clone().sub(kn).normalize();
      if (toe.dot(shin) < -0.55)
        rows.push({ movement: m, t: +t.toFixed(2), issue: `foot_${s}_folds_back`,
          detail: `dot ${toe.dot(shin).toFixed(3)} x 0` });

      // A hand driven through the torso reads as a limb in the wrong place.
      const chest = at("spine_03");
      const belly = at("spine_01");
      const axisPt = chest.clone().add(belly).multiplyScalar(0.5);
      const wristGap = wr.distanceTo(axisPt);
      if (wristGap < 0.1)
        rows.push({ movement: m, t: +t.toFixed(2), issue: `hand_${s}_inside_torso`,
          detail: `gap ${wristGap.toFixed(3)} x 0` });

      // Nothing may sink through the floor.
      for (const b of [`hand_${s}`, `foot_${s}`, `ball_${s}`, `lowerarm_${s}`, `calf_${s}`]) {
        const y = at(b).y;
        if (y < -0.03)
          rows.push({ movement: m, t: +t.toFixed(2), issue: `${b}_below_floor`, detail: `y ${y.toFixed(3)}` });
      }
    }
    void up;
  }
}

const byKey = new Map<string, { n: number; worst: Row }>();
for (const r of rows) {
  const k = `${r.movement}|${r.issue}`;
  const prev = byKey.get(k);
  const mag = Math.abs(parseFloat(r.detail.split(" ")[1]));
  if (!prev) byKey.set(k, { n: 1, worst: r });
  else {
    prev.n++;
    if (mag > Math.abs(parseFloat(prev.worst.detail.split(" ")[1]))) prev.worst = r;
  }
}
/* Geometry the checks call odd but the movement genuinely needs. Each entry
   says why, so a real regression in the same movement still stands out. */
const accepted: Record<string, string> = {
  "goodmorning|elbow_l_bends_forward":
    "forearms crossed over the chest sit ahead of the shoulder-to-wrist line",
  "goodmorning|elbow_r_bends_forward":
    "forearms crossed over the chest sit ahead of the shoulder-to-wrist line",
  "bird|elbow_l_bends_forward":
    "the reaching arm is mid-extension here and is straight by the top of the rep",
  "bird|elbow_r_bends_forward":
    "the reaching arm is mid-extension here and is straight by the top of the rep",
};
console.log(`samples ${SAMPLES} per movement · ${movements.length} movements\n`);
const sorted = [...byKey.entries()].sort((a, b) => b[1].n - a[1].n);
const open = sorted.filter(([k]) => !(k in accepted));
for (const [k, v] of open) {
  const [mv, issue] = k.split("|");
  console.log(`${mv.padEnd(14)} ${issue.padEnd(26)} ${String(v.n).padStart(2)}/${SAMPLES}  worst t=${v.worst.t} ${v.worst.detail}`);
}
console.log(open.length ? `\n${open.length} to look at` : "clean");
const known = sorted.filter(([k]) => k in accepted);
if (known.length) {
  console.log("\naccepted:");
  for (const [k, v] of known)
    console.log(`  ${k.replace("|", " ").padEnd(40)} ${v.n}/${SAMPLES}  ${accepted[k]}`);
}
