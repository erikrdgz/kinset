import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Object3D, Vector3 } from "three";
import { applyPose, prepareRig } from "../src/motion/pose";
import { REP, movements, type Movement } from "../src/motion/catalog";
const buf = readFileSync("public/motion/trainer.glb");
const scene: Object3D = await new Promise((res, rej) =>
  new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", (g) => res(g.scene), rej),
);
const rig = prepareRig(scene);
const at = (n: string) => rig.bones.get(n)!.bone.getWorldPosition(new Vector3());
const d = (a: string, b: string) => at(b).clone().sub(at(a)).normalize();
const f = (v: Vector3) => `${v.x >= 0 ? " " : ""}${v.x.toFixed(2)},${v.y >= 0 ? " " : ""}${v.y.toFixed(2)},${v.z >= 0 ? " " : ""}${v.z.toFixed(2)}`;
console.log("movement        upperarm_l(sh->el)  forearm_l(el->hand)  thigh_l         handY  armFold");
for (const m of movements as Movement[]) {
  applyPose(rig, m, REP * 0.45);
  rig.scene.updateMatrixWorld(true);
  const sh = at("upperarm_l"), el = at("lowerarm_l"), wr = at("hand_l");
  const fold = sh.distanceTo(wr) / (sh.distanceTo(el) + el.distanceTo(wr));
  console.log(
    m.padEnd(15),
    f(d("upperarm_l", "lowerarm_l")), "  ",
    f(d("lowerarm_l", "hand_l")), "  ",
    f(d("thigh_l", "calf_l")),
    wr.y.toFixed(2).padStart(6),
    fold.toFixed(2).padStart(7),
  );
}
