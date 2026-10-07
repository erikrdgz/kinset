/* Hand and foot orientation. Position checks pass happily while a palm faces
   backwards or a toe points across the body, so this reads the bones' own axes. */
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Object3D, Quaternion, Vector3 } from "three";
import { applyPose, prepareRig } from "../src/motion/pose";
import { REP, movements, type Movement } from "../src/motion/catalog";
const buf = readFileSync("public/motion/trainer.glb");
const scene: Object3D = await new Promise((res, rej) =>
  new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", (g) => res(g.scene), rej),
);
const rig = prepareRig(scene);
const at = (n: string) => rig.bones.get(n)!.bone.getWorldPosition(new Vector3());
const axis = (n: string, a: Vector3) =>
  a.clone().applyQuaternion(rig.bones.get(n)!.bone.getWorldQuaternion(new Quaternion())).normalize();
const f = (v: Vector3) => `${v.x >= 0 ? " " : ""}${v.x.toFixed(2)},${v.y >= 0 ? " " : ""}${v.y.toFixed(2)},${v.z >= 0 ? " " : ""}${v.z.toFixed(2)}`;
const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);

const only = process.argv.slice(2) as Movement[];
const list = only.length ? only : (movements as Movement[]);
/* Bind pose is anatomical: arms out, palms forward. So for the hand, local +Y
   runs wrist to fingertips and local +Z is the palm normal. For the foot, local
   +Y runs ankle to ball and local +Z is the sole normal. */
const fingers = (s: string) => axis(`hand_${s}`, Y);
const palm = (s: string) => axis(`hand_${s}`, Z);
const toe = (s: string) => axis(`foot_${s}`, Y);
const sole = (s: string) => axis(`foot_${s}`, Z);

console.log("movement       sd  fingers            palm               toe                sole               wristY footY");
for (const m of list) {
  applyPose(rig, m, REP * 0.45);
  rig.scene.updateMatrixWorld(true);
  for (const s of ["l", "r"] as const) {
    console.log(
      (s === "l" ? m.padEnd(14) : " ".repeat(14)),
      s,
      f(fingers(s)), " ", f(palm(s)), " ", f(toe(s)), " ", f(sole(s)),
      at(`hand_${s}`).y.toFixed(2).padStart(6),
      at(`foot_${s}`).y.toFixed(2).padStart(5),
    );
  }
}
