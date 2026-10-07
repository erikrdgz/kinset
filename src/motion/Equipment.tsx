import { Quaternion, Vector3 } from "three";
type Point = [number, number, number];
export function Beam({
  from,
  to,
  radius = 0.025,
  color = "#555a5d",
}: {
  from: Point;
  to: Point;
  radius?: number;
  color?: string;
}) {
  const a = new Vector3(...from),
    b = new Vector3(...to),
    delta = b.clone().sub(a);
  return (
    <mesh
      position={a.add(b).multiplyScalar(0.5)}
      quaternion={new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        delta.clone().normalize(),
      )}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, delta.length(), 12]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}
function Pad({
  position,
  size,
  rotation = 0,
}: {
  position: Point;
  size: Point;
  rotation?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={[rotation, 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color="#353a3c" roughness={0.85} />
    </mesh>
  );
}
export function Bench() {
  return (
    <group>
      <Pad position={[0, 0.555, 0.53]} size={[0.95, 0.1, 0.42]} />
      {[-0.36, 0.36].map((x) => (
        <Beam
          key={x}
          from={[x, 0.02, 0.53]}
          to={[x, 0.51, 0.53]}
          radius={0.035}
        />
      ))}
      <Beam from={[-0.44, 0.025, 0.53]} to={[0.44, 0.025, 0.53]} />
    </group>
  );
}
export function PulldownMachine() {
  return (
    <group>
      <Pad position={[0, 0.43, 0]} size={[0.48, 0.1, 0.44]} />
      <Beam from={[0, 0.02, 0]} to={[0, 0.38, 0]} radius={0.045} />
      <Beam from={[0, 0.03, -0.4]} to={[0, 2.05, -0.4]} radius={0.035} />
      <Beam from={[0, 2.05, -0.4]} to={[0, 2.05, 0.2]} />
      <Beam from={[-0.45, 0.025, -0.4]} to={[0.45, 0.025, -0.4]} />
      <Pad position={[0, 0.64, 0.28]} size={[0.48, 0.1, 0.1]} />
    </group>
  );
}
/** Reclined 45° sled. Seat and back fit the leg press pose; rails follow the plate's travel. */
export function LegPressMachine() {
  // Rails run under the plate's lower edge, parallel to its travel (y - z = 0.726).
  const rail = (y: number): Point => [0, y, y - 0.726];
  const low = rail(0.75),
    high = rail(1.3);
  return (
    <group>
      <Pad position={[0, 0.31, -0.38]} size={[0.48, 0.12, 0.4]} />
      <Pad
        position={[0, 0.515, -0.835]}
        size={[0.48, 0.9, 0.08]}
        rotation={-1.05}
      />
      {[-0.39, 0.39].map((x) => (
        <group key={x}>
          <Beam
            from={[x, low[1], low[2]]}
            to={[x, high[1], high[2]]}
            radius={0.027}
          />
          <Beam from={[x, 0.025, high[2]]} to={[x, high[1], high[2]]} />
          <Beam from={[x, 0.025, low[2]]} to={[x, low[1], low[2]]} />
        </group>
      ))}
      <Beam from={[-0.45, 0.025, low[2]]} to={[0.45, 0.025, low[2]]} />
      <Beam from={[-0.45, 0.025, high[2]]} to={[0.45, 0.025, high[2]]} />
      <Beam from={[0, 0.025, -1.02]} to={[0, 0.025, high[2]]} />
      <Beam from={[0, 0.025, -0.4]} to={[0, 0.3, -0.4]} radius={0.04} />
      <Beam from={[0, 0.025, -0.98]} to={[0, 0.47, -0.9]} radius={0.03} />
    </group>
  );
}
export function FootPlate() {
  return (
    <group rotation={[-Math.PI / 4, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.64, 0.38, 0.05]} />
        <meshStandardMaterial color="#de612f" roughness={0.7} />
      </mesh>
      {/* Carriage that rides the rails */}
      <mesh position={[0, -0.2, 0.045]} castShadow>
        <boxGeometry args={[0.86, 0.08, 0.04]} />
        <meshStandardMaterial color="#555a5d" roughness={0.65} />
      </mesh>
    </group>
  );
}
export function ExerciseMat() {
  return <Pad position={[0, -0.005, -0.03]} size={[0.82, 0.015, 2.05]} />;
}
