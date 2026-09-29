import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Exercise } from "./domain";
import {
  type Movement,
  baseMovement,
  motionDuration,
  floorMovements,
  sideFirst,
  motionCue,
} from "./motion/catalog";
import { applyPose, prepareRig } from "./motion/pose";
import {
  Bench,
  PulldownMachine,
  LegPressMachine,
  FootPlate,
  ExerciseMat,
  Beam,
} from "./motion/Equipment";
/** Demos play 25% faster than the base pose timing; 1× and 0.5× stay relative to this. */
const MOTION_RATE = 1.25;
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
function Camera({ side, movement }: { side: boolean; movement: Movement }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const low = floorMovements.has(baseMovement(movement));
    const target = movement === "row" ? 0.7 : low ? 0.45 : 1.05;
    camera.position.set(
      side ? (low ? 3.2 : 4) : low ? 2.5 : 0.7,
      low ? 1.6 : 1.55,
      side ? 0.6 : low ? 3.2 : 4.3,
    );
    if (side && movement === "row") camera.position.set(-3.4, 1.4, 0.6);
    camera.lookAt(0, target, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, side, movement, invalidate]);
  return null;
}
function Dumbbell({ reference }: { reference: React.RefObject<Group | null> }) {
  return (
    <group ref={reference}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.017, 0.017, 0.23, 16]} />
        <meshStandardMaterial color="#9d9fa0" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.11, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.075, 0.075, 0.07, 6]} />
          <meshStandardMaterial color="#e55d28" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
function Trainer({
  movement,
  playing,
  speed,
  reset,
  hidden,
  seek,
  onProgress,
}: {
  movement: Movement;
  playing: boolean;
  speed: number;
  reset: number;
  hidden: boolean;
  seek: { time: number };
  onProgress: (time: number) => void;
}) {
  const asset = useGLTF(import.meta.env.BASE_URL + "motion/trainer.glb");
  const left = useRef<Group>(null),
    right = useRef<Group>(null),
    goblet = useRef<Group>(null),
    bar = useRef<Group>(null),
    plate = useRef<Group>(null),
    cable = useRef<Mesh>(null),
    elapsed = useRef(0),
    reported = useRef(-1);
  const { invalidate } = useThree();
  const rig = useMemo(() => prepareRig(clone(asset.scene)), [asset.scene]);
  useEffect(() => {
    elapsed.current = seek.time;
    invalidate();
  }, [seek, invalidate]);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [reset, movement, invalidate]);
  useEffect(() => {
    invalidate();
  }, [playing, speed, hidden, invalidate]);
  useEffect(
    () => () => {
      rig.scene.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshStandardMaterial).dispose();
      });
    },
    [rig],
  );
  useFrame((_, delta) => {
    if (playing && !hidden) {
      elapsed.current += Math.min(delta, 0.08) * speed * MOTION_RATE;
      invalidate();
    }
    const duration = motionDuration(movement);
    const time = elapsed.current % duration;
    if (Math.abs(time - reported.current) > 0.08) {
      reported.current = time;
      onProgress(time);
    }
    const pose = applyPose(rig, movement, elapsed.current);
    if (left.current) left.current.position.copy(pose.hands[0]);
    if (right.current) right.current.position.copy(pose.hands[1]);
    if (left.current)
      left.current.rotation.y = ["hammer", "closefloor"].includes(movement)
        ? Math.PI / 2
        : 0;
    if (right.current)
      right.current.rotation.y = ["hammer", "closefloor"].includes(movement)
        ? Math.PI / 2
        : 0;
    if (goblet.current) {
      goblet.current.position
        .copy(pose.hands[0])
        .add(pose.hands[1])
        .multiplyScalar(0.5);
      goblet.current.position.y -= 0.05;
      goblet.current.rotation.z = Math.PI / 2;
    }
    if (bar.current) {
      const midpoint = pose.hands[0]
        .clone()
        .add(pose.hands[1])
        .multiplyScalar(0.5);
      bar.current.position.copy(midpoint);
      if (cable.current) {
        cable.current.position.set(0, (2.05 + midpoint.y) / 2, midpoint.z);
        cable.current.scale.y = 2.05 - midpoint.y;
      }
    }
    if (plate.current)
      plate.current.position
        .copy(pose.ankles[0])
        .add(pose.ankles[1])
        .multiplyScalar(0.5)
        .add(v(0, 0.04, 0.17));
  });
  const base = baseMovement(movement);
  const pair = [
    "curl",
    "press",
    "rdl",
    "floor",
    "bentrow",
    "reversefly",
    "lateral",
    "frontraise",
    "hammer",
    "altcurl",
    "seatedpress",
    "closefloor",
    "dbcalf",
  ].includes(movement);
  return (
    <>
      <primitive object={rig.scene} />
      {pair && <Dumbbell reference={left} />}
      {(pair || movement === "row") && <Dumbbell reference={right} />}
      {base === "goblet" && <Dumbbell reference={goblet} />}
      {movement === "row" && (
        <group position={[0.36, 0, 0]} scale={[0.53, 1, 1]}>
          <Bench />
        </group>
      )}
      {base === "pushup" && <Bench />}
      {movement === "seatedpress" && (
        <group position={[0, -0.125, -0.53]}>
          <Bench />
        </group>
      )}
      {["floor", "bridge", "bird"].includes(base) && <ExerciseMat />}
      {movement === "pulldown" && (
        <>
          <PulldownMachine />
          <group ref={bar}>
            <Beam
              from={[-0.49, 0, 0]}
              to={[0.49, 0, 0]}
              radius={0.017}
              color="#e86a35"
            />
          </group>
          <mesh ref={cable}>
            <cylinderGeometry args={[0.005, 0.005, 1, 8]} />
            <meshStandardMaterial color="#94999b" />
          </mesh>
        </>
      )}
      {movement === "legpress" && (
        <>
          <LegPressMachine />
          <group ref={plate}>
            <FootPlate />
          </group>
        </>
      )}
    </>
  );
}

export default function ExerciseDemo({ exercise }: { exercise: Exercise }) {
  const { active: loading } = useProgress();
  const movement = exercise.id as Movement;
  const [seek, setSeek] = useState({ time: 0 });
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(
      () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [speed, setSpeed] = useState(1),
    [side, setSide] = useState(sideFirst.has(baseMovement(movement))),
    [reset, setReset] = useState(0),
    [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return (
    <section
      className="motion-demo"
      aria-label={`${exercise.name} movement preview`}
    >
      <div className="motion-stage">
        {loading && <span className="motion-loading">Loading movement…</span>}
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.1, 4], fov: 34 }}
        >
          <Camera side={side} movement={movement} />
          <ambientLight intensity={1.6} />
          <directionalLight
            castShadow
            position={[2, 4, 3]}
            intensity={3}
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight
            position={[-2, 2, -2]}
            intensity={2}
            color="#ffb68c"
          />
          <Suspense fallback={null}>
            <Trainer
              movement={movement}
              playing={playing}
              speed={speed}
              reset={reset}
              hidden={hidden}
              seek={seek}
              onProgress={setProgress}
            />
          </Suspense>
          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.015, 0]}
          >
            <planeGeometry args={[10, 10]} />
            <shadowMaterial transparent opacity={0.25} />
          </mesh>
        </Canvas>
        <span className="motion-badge">MOVEMENT PREVIEW</span>
      </div>
      <div className="motion-controls">
        <button
          className="motion-play"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause demonstration" : "Play demonstration"}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button
          onClick={() => {
            setReset((x) => x + 1);
            setPlaying(false);
          }}
          aria-label="Restart demonstration"
        >
          <RotateCcw size={17} />
        </button>
        <button
          onClick={() => setSpeed(speed === 1 ? 0.5 : 1)}
          aria-label={`Playback speed ${speed}x. Switch to ${speed === 1 ? "half" : "normal"} speed`}
        >
          {speed}×
        </button>
        <div className="motion-views" role="group" aria-label="Viewing angle">
          <button aria-pressed={!side} onClick={() => setSide(false)}>
            Overview
          </button>
          <button aria-pressed={side} onClick={() => setSide(true)}>
            Side
          </button>
        </div>
      </div>
      <label className="motion-scrub">
        Step through the movement
        <input
          type="range"
          min="0"
          max={motionDuration(movement)}
          step="0.05"
          value={progress}
          aria-label="Movement position"
          onChange={(event) => {
            const time = Number(event.target.value);
            setPlaying(false);
            setProgress(time);
            setSeek({ time });
          }}
        />
      </label>
      <p className="motion-cue">
        {movement === baseMovement(movement)
          ? motionCue[baseMovement(movement)]
          : exercise.cue}
      </p>
      <p className="motion-note">
        Illustrative animation · technique review pending
      </p>
      <p className="model-credit">
        <a
          href={import.meta.env.BASE_URL + "motion/CREDITS.md"}
          target="_blank"
          rel="noreferrer"
        >
          Character & motion credits
        </a>
      </p>
    </section>
  );
}
