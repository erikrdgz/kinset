/* Motion QA harness, plain three.js: no React, no HMR, no render loop.
   The browser pane runs hidden so rAF never fires; renders are driven from the
   console with window.__qa.render().
     /qa.html?m=curl&phases=0,0.2,0.45,0.62,0.8&view=front|side        */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { applyPose, prepareRig, type Rig } from "../src/motion/pose";
import {
  REP,
  baseMovement,
  floorMovements,
  motionDuration,
  movements,
  type Movement,
} from "../src/motion/catalog";

if (import.meta.hot) import.meta.hot.decline();

const params = new URLSearchParams(location.search);
/* Two modes: one movement across its rep (m=), or several movements at one
   phase (ms=). The second only frames sensibly within a group that shares a
   camera, so pass standing and floor movements separately. */
const MS = params.get("ms")?.split(",").filter(Boolean) as Movement[] | undefined;
const MOVEMENT = (MS?.[0] ?? params.get("m") ?? "squat") as Movement;
if (!movements.includes(MOVEMENT)) throw new Error(`unknown movement ${MOVEMENT}`);
for (const m of MS ?? []) if (!movements.includes(m)) throw new Error(`unknown movement ${m}`);
const PHASE = Number(params.get("phase") ?? "0.45");
const PHASES = MS
  ? MS.map(() => PHASE)
  : (params.get("phases") ?? "0,0.2,0.45,0.62,0.8").split(",").map(Number);
const SIDE = params.get("view") === "side";
const LOW = floorMovements.has(baseMovement(MOVEMENT));
const GAP = Number(params.get("gap") ?? (LOW ? "2.2" : "1.5"));
const span = (PHASES.length - 1) * GAP;

const host = document.getElementById("root")!;
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
host.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color("#101010");
scene.add(new AmbientLight(0xffffff, 1.8));
const key = new DirectionalLight(0xffffff, 2.4);
key.position.set(2, 5, 4);
scene.add(key);
const fill = new DirectionalLight(0xffb68c, 1.4);
fill.position.set(-3, 2, -2);
scene.add(fill);
scene.add(new GridHelper(span + 10, Math.round((span + 10) * 2), 0x5c5c5c, 0x303030));

const camera = new PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);

const caption = document.createElement("div");
caption.style.cssText =
  "position:absolute;top:6px;left:8px;font:13px monospace;color:#8ab4ff";
caption.textContent = MS
  ? `${MS.length} movements · phase ${PHASE} · ${SIDE ? "side" : "front"}`
  : `${MOVEMENT} · ${SIDE ? "side" : "front"}`;
document.body.appendChild(caption);
const marks = (MS ?? PHASES).map((p) => {
  const el = document.createElement("span");
  el.style.cssText =
    "position:absolute;bottom:6px;transform:translateX(-50%);font:12px monospace;color:#ff9a69";
  el.textContent = String(p);
  document.body.appendChild(el);
  return el;
});

/* Equipment proxies: the real props live in React components, but a pose can
   only be judged against the thing it is meant to touch. */
const prop = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const m = new Mesh(
    new BoxGeometry(w, h, d),
    new MeshStandardMaterial({ color: "#353a3c", roughness: 0.85 }),
  );
  m.position.set(x, y, z);
  return m;
};
const equipment: Record<string, () => Mesh[]> = {
  bench: () => [prop(0.95, 0.1, 0.42, 0, 0.555, 0.53)],
  mat: () => [prop(0.82, 0.015, 2.05, 0, -0.005, -0.03)],
};
const base = baseMovement(MOVEMENT);
const props: Mesh[] = [];
if (base === "pushup" || MOVEMENT === "row") props.push(...equipment.bench());
if (MOVEMENT === "seatedpress") {
  const b = equipment.bench()[0];
  b.position.add(new Vector3(0, -0.125, -0.53));
  props.push(b);
}
if (["floor", "bridge", "bird"].includes(base)) props.push(...equipment.mat());

const rigs: { rig: Rig; group: Group; x: number; props?: Mesh[] }[] = [];

new GLTFLoader().load("/motion/trainer.glb", (gltf) => {
  PHASES.forEach((_, i) => {
    const group = new Group();
    const rig = prepareRig(clone(gltf.scene));
    group.add(rig.scene);
    scene.add(group);
    rigs.push({ rig, group, x: -span / 2 + i * GAP });
  });
  (window as any).__qa = { count: () => rigs.length, render };
  render();
});

function render() {
  const target = MOVEMENT === "row" ? 0.7 : MOVEMENT === "legpress" ? 0.65 : LOW ? 0.45 : 1.05;
  const focus = new Vector3(0, target, 0);
  // The app's own camera placement, pulled back until the whole row fits.
  const base = new Vector3(
    SIDE ? (LOW ? 3.2 : 4) : LOW ? 2.5 : 0.7,
    LOW ? 1.6 : 1.55,
    SIDE ? 0.6 : LOW ? 3.2 : 4.3,
  );
  if (SIDE && MOVEMENT === "row") base.set(-3.4, 1.4, 0.6);
  const dir = base.clone().sub(focus);
  const need = span / 2 / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
  camera.position.copy(
    dir.clone().normalize().multiplyScalar(Math.max(dir.length(), need + 1.5)).add(focus),
  );
  camera.lookAt(focus);
  camera.updateProjectionMatrix();
  // Lay the row across the screen, not along the line of sight. applyPose
  // anchors the pelvis in world space, so pose at the origin then translate.
  const right = new Vector3(0, 1, 0).cross(dir).normalize();
  rigs.forEach((r, i) => {
    r.group.position.set(0, 0, 0);
    r.group.updateMatrixWorld(true);
    const mv = MS?.[i] ?? MOVEMENT;
    // In sweep mode a phase means a position within one rep, so alternating
    // movements (two reps per cycle) line up with the rest.
    const span = MS ? REP : motionDuration(mv);
    applyPose(r.rig, mv, span * (PHASES[i] ?? 0));
    r.group.position.copy(right.clone().multiplyScalar(r.x));
    // One copy of each prop per rig, so every pose has its own to touch.
    if (!r.props) {
      r.props = props.map((m) => {
        const c = m.clone();
        r.group.add(c);
        return c;
      });
    }
  });
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
  rigs.forEach((r, i) => {
    const p = r.group.position.clone().project(camera);
    marks[i].style.left = `${innerWidth * (p.x + 1) * 0.5}px`;
  });
  return { shown: MS ?? MOVEMENT, view: SIDE ? "side" : "front", phases: PHASES };
}
