/* Derive the palm frame from the finger bones rather than assuming which local
   axis is which. fingers = along the hand, across = index knuckle to pinky
   knuckle, palm normal = their cross product. */
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
const f = (v: Vector3) => `${v.x >= 0 ? " " : ""}${v.x.toFixed(2)},${v.y >= 0 ? " " : ""}${v.y.toFixed(2)},${v.z >= 0 ? " " : ""}${v.z.toFixed(2)}`;
function frame(s: "l" | "r") {
  const fingers = at(`middle_01_${s}`).sub(at(`hand_${s}`)).normalize();
  const across = at(`pinky_01_${s}`).sub(at(`index_01_${s}`)).normalize();
  /* The hands mirror, so the cross product flips between them: on the left it
     gives the palm normal, on the right the back of the hand. */
  const normal = new Vector3()
    .crossVectors(across, fingers)
    .multiplyScalar(s === "l" ? 1 : -1)
    .normalize();
  const thumb = at(`thumb_04_leaf_${s}`).sub(at(`thumb_01_${s}`)).normalize();
  return { fingers, across, normal, thumb };
}
rig.scene.updateMatrixWorld(true);
console.log("REST");
for (const s of ["l", "r"] as const) {
  const x = frame(s);
  console.log(`  ${s}: fingers${f(x.fingers)} across(idx->pinky)${f(x.across)} normal${f(x.normal)} thumb${f(x.thumb)}`);
  console.log(`      thumb vs across dot ${x.thumb.dot(x.across).toFixed(2)}  (negative = thumb on the index side, as it should be)`);
  const q = rig.bones.get(`hand_${s}`)!.bone.getWorldQuaternion(new Quaternion());
  for (const [n, a] of [["+X", new Vector3(1,0,0)], ["+Y", new Vector3(0,1,0)], ["+Z", new Vector3(0,0,1)]] as const)
    console.log(`      local ${n} -> ${f(a.clone().applyQuaternion(q))}`);
}
const only = process.argv.slice(2) as Movement[];
console.log("\nmovement       sd fingers            palm normal        thumb");
for (const m of (only.length ? only : (movements as Movement[]))) {
  applyPose(rig, m, REP * 0.45);
  rig.scene.updateMatrixWorld(true);
  for (const s of ["l", "r"] as const) {
    const x = frame(s);
    console.log((s === "l" ? m.padEnd(14) : " ".repeat(14)), s, f(x.fingers), " ", f(x.normal), " ", f(x.thumb));
  }
}
