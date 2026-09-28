import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Exercise } from "./domain";
export const demoIds = new Set(["squat", "curl", "press"]);
type Movement = "squat" | "curl" | "press";
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
function Camera({ side }: { side: boolean }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(side ? 4 : 0, 1.1, side ? 0 : 4);
    camera.lookAt(0, 1.05, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, side, invalidate]);
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
}: {
  movement: Movement;
  playing: boolean;
  speed: number;
  reset: number;
  hidden: boolean;
}) {
  const asset = useGLTF(import.meta.env.BASE_URL + "motion/trainer.glb");
  const left = useRef<Group>(null),
    right = useRef<Group>(null),
    elapsed = useRef(0);
  const { invalidate } = useThree();
  const rig = useMemo(() => {
    const scene = clone(asset.scene);
    scene.updateMatrixWorld(true);
    const bones = new Map<
      string,
      {
        bone: Bone;
        q: Quaternion;
        p: Vector3;
        worldQ: Quaternion;
        worldP: Vector3;
      }
    >();
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
  }, [asset.scene]);
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
      elapsed.current += Math.min(delta, 0.08) * speed;
      invalidate();
    }
    const u = (1 - Math.cos((elapsed.current / 4.8) * Math.PI * 2)) / 2;
    for (const b of rig.bones.values()) {
      b.bone.quaternion.copy(b.q);
      b.bone.position.copy(b.p);
    }
    rig.scene.updateMatrixWorld(true);
    const get = (name: string) => rig.bones.get(name)!;
    const position = (name: string) =>
      get(name).bone.getWorldPosition(new Vector3());
    const aim = (name: string, child: string, direction: Vector3) => {
      const b = get(name),
        rest = get(child).worldP.clone().sub(b.worldP).normalize();
      const desired = new Quaternion()
        .setFromUnitVectors(rest, direction.normalize())
        .multiply(b.worldQ);
      b.bone.quaternion.copy(
        b.bone
          .parent!.getWorldQuaternion(new Quaternion())
          .invert()
          .multiply(desired),
      );
      b.bone.updateWorldMatrix(false, true);
    };
    const pelvis = get("pelvis");
    const hip = pelvis.worldP
      .clone()
      .add(
        v(
          0,
          -0.008 - (movement === "squat" ? 0.27 * u : 0),
          movement === "squat" ? -0.17 * u : 0,
        ),
      );
    pelvis.bone.position.copy(pelvis.bone.parent!.worldToLocal(hip));
    rig.scene.updateMatrixWorld(true);
    if (movement === "squat")
      aim("spine_01", "spine_02", v(0, Math.cos(0.33 * u), Math.sin(0.33 * u)));
    for (const [suffix, sign] of [
      ["l", 1],
      ["r", -1],
    ] as const) {
      // Two-link inverse kinematics keeps the foot planted through the squat.
      const thigh = "thigh_" + suffix,
        calf = "calf_" + suffix,
        foot = "foot_" + suffix;
      const h = position(thigh),
        ankle = get(foot).worldP.clone();
      ankle.x = sign * 0.13;
      const l1 = get(calf).worldP.distanceTo(get(thigh).worldP),
        l2 = get(foot).worldP.distanceTo(get(calf).worldP);
      const line = ankle.clone().sub(h),
        d = Math.min(line.length(), l1 + l2 - 0.00001);
      line.normalize();
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
        height = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const forward = v(0, 0, 1).addScaledVector(line, -line.z).normalize();
      const knee = h
        .clone()
        .addScaledVector(line, a)
        .addScaledVector(forward, height);
      aim(thigh, calf, knee.clone().sub(h));
      aim(calf, foot, ankle.clone().sub(position(calf)));
      const f = get(foot);
      f.bone.quaternion.copy(
        f.bone
          .parent!.getWorldQuaternion(new Quaternion())
          .invert()
          .multiply(f.worldQ),
      );
      f.bone.updateWorldMatrix(false, true);
      const upper = "upperarm_" + suffix,
        lower = "lowerarm_" + suffix,
        hand = "hand_" + suffix;
      if (movement === "curl") {
        aim(upper, lower, v(sign * 0.08, -1, 0.04));
        const angle = 0.12 + 2.05 * u;
        aim(lower, hand, v(sign * 0.025, -Math.cos(angle), Math.sin(angle)));
      } else if (movement === "press") {
        aim(upper, lower, v(sign * (0.95 - 0.82 * u), 0.08 + 0.92 * u, 0.12));
        aim(lower, hand, v(-sign * 0.06, 1, 0.08));
      } else {
        aim(upper, lower, v(sign * 0.12, -0.18, 0.9));
        aim(lower, hand, v(-sign * 0.05, 0.05, 1));
      }
      if (movement !== "squat") {
        for (const b of rig.bones.values())
          if (
            new RegExp(
              "^(index|middle|ring|pinky)_0[123]_" + suffix + "$",
            ).test(b.bone.name)
          )
            b.bone.quaternion
              .copy(b.q)
              .multiply(new Quaternion().setFromAxisAngle(v(1, 0, 0), 1.2));
        get(hand).bone.updateWorldMatrix(false, true);
      }
      const weight = suffix === "l" ? left.current : right.current;
      if (weight)
        weight.position.copy(get(hand).bone.localToWorld(v(0, 0.075, 0)));
    }
  });
  return (
    <>
      <primitive object={rig.scene} />
      {movement !== "squat" && (
        <>
          <Dumbbell reference={left} />
          <Dumbbell reference={right} />
        </>
      )}
    </>
  );
}
export default function ExerciseDemo({ exercise }: { exercise: Exercise }) {
  const { active: loading } = useProgress();
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [side, setSide] = useState(false),
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
      <div className="motion-stage">{loading && <span className="motion-loading">Loading movement…</span>}
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.1, 4], fov: 34 }}
        >
          <Camera side={side} />
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
              movement={exercise.id as Movement}
              playing={playing}
              speed={speed}
              reset={reset}
              hidden={hidden}
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
            Front
          </button>
          <button aria-pressed={side} onClick={() => setSide(true)}>
            Side
          </button>
        </div>
      </div>
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
