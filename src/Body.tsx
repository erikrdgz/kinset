import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import type { Muscle } from "./domain";
const MUSCLE_URL = import.meta.env.BASE_URL + "models/muscular.glb";
const SKELETON_URL = import.meta.env.BASE_URL + "models/skeleton.glb";
const DRACO_PATH = import.meta.env.BASE_URL + "draco/";
/* The meshes are the heaviest assets in the app. Loading this chunk starts the
   download, so entering Explore pays for the body before a card asks for it. */
useGLTF.preload(MUSCLE_URL, DRACO_PATH);
useGLTF.preload(SKELETON_URL, DRACO_PATH);
const groups: Record<Muscle, RegExp> = {
  Chest: /pectoralis/i,
  Back: /latissimus|trapezius|rhomboid|erector|infraspinatus|teres_major/i,
  Shoulders: /deltoid/i,
  Arms: /biceps_brachii|triceps_brachii|brachialis|brachioradialis/i,
  Core: /rectus_abdominis|oblique|transversus_abdominis/i,
  Legs: /quadriceps|rectus_femoris|vastus|biceps_femoris|semitendinosus|semimembranosus|gluteus|gastrocnemius|soleus|tibialis_anterior/i,
};
function Anatomy({ muscles }: { muscles: Muscle[] }) {
  const muscleAsset = useGLTF(MUSCLE_URL, DRACO_PATH);
  const skeletonAsset = useGLTF(SKELETON_URL, DRACO_PATH);
  const model = useMemo(() => {
    const muscleScene = muscleAsset.scene.clone(true),
      skeletonScene = skeletonAsset.scene.clone(true);
    for (const scene of [muscleScene, skeletonScene]) {
      const remove: Mesh[] = [];
      scene.traverse((o) => {
        if (
          o instanceof Mesh &&
          (/system/i.test(o.name) ||
            (/fascia/i.test(o.name) && !/tensor/i.test(o.name)))
        )
          remove.push(o);
      });
      remove.forEach((o) => o.removeFromParent());
    }
    muscleScene.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = new MeshStandardMaterial({
          color: "#807b77",
          roughness: 0.72,
          metalness: 0.05,
        });
        o.userData.baseName = o.name;
      }
    });
    skeletonScene.traverse((o) => {
      if (o instanceof Mesh)
        o.material = new MeshStandardMaterial({
          color: "#b3aaa1",
          roughness: 0.82,
        });
    });
    return { muscleScene, skeletonScene };
  }, [muscleAsset.scene, skeletonAsset.scene]);
  useEffect(() => {
    model.muscleScene.traverse((o) => {
      if (o instanceof Mesh) {
        const selected = muscles.some((m) => groups[m].test(o.name));
        (o.material as MeshStandardMaterial).color.set(
          selected ? "#ff692b" : "#807b77",
        );
      }
    });
  }, [model, muscles]);
  useEffect(
    () => () => {
      for (const scene of Object.values(model))
        scene.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshStandardMaterial).dispose();
        });
    },
    [model],
  );
  return (
    <group>
      <primitive object={model.muscleScene} />
      <primitive object={model.skeletonScene} />
    </group>
  );
}
export default function Body({ muscles }: { muscles: Muscle[] }) {
  return (
    <div
      className="body-canvas"
      role="img"
      aria-label={`Anatomical body model. Highlighted muscle groups: ${muscles.join(", ") || "none"}.`}
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, 4], fov: 32 }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={2.5} />
        <directionalLight position={[-3, 2, -3]} intensity={1.5} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.05}>
            <Anatomy muscles={muscles} />
          </Bounds>
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.7}
        />
      </Canvas>
    </div>
  );
}
