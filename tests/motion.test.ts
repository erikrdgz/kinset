import { readFileSync } from "node:fs";
import { Bone, Group, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { exercises } from "../src/domain";
import { applyPose, prepareRig } from "../src/motion/pose";
import { demoIds, movements } from "../src/motion/catalog";
// Load the shipped skeleton hierarchy, so tests catch incompatible asset changes too.
function rigFromAsset() {
  const bytes = readFileSync(
    new URL("../public/motion/trainer.glb", import.meta.url),
  );
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  type Node = {
    name: string;
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    children?: number[];
  };
  const nodes: Node[] = gltf.nodes;
  const bones = nodes.map((n) => {
    const b = new Bone();
    b.name = n.name;
    if (n.translation) b.position.fromArray(n.translation);
    if (n.rotation) b.quaternion.fromArray(n.rotation);
    if (n.scale) b.scale.fromArray(n.scale);
    return b;
  });
  nodes.forEach((n, i) => n.children?.forEach((c) => bones[i].add(bones[c])));
  const root = new Group();
  bones.filter((b) => !b.parent).forEach((b) => root.add(b));
  return prepareRig(root);
}
describe("movement previews", () => {
  it("covers every catalog exercise", () => {
    for (const exercise of exercises)
      expect(demoIds.has(exercise.id)).toBe(true);
  });
  it.each(movements)(
    "%s animates continuously with finite, stable-length bones",
    (movement) => {
      const rig = rigFromAsset();
      const samples: number[][] = [];
      for (let frame = 0; frame <= 96; frame++) {
        const pose = applyPose(rig, movement, frame * 0.1);
        for (const b of rig.bones.values()) {
          const position = b.bone.getWorldPosition(new Vector3());
          expect(
            [...position.toArray(), ...b.bone.quaternion.toArray()].every(
              Number.isFinite,
            ),
          ).toBe(true);
          if (b.bone.name !== "pelvis")
            expect(b.bone.position.length()).toBeCloseTo(b.p.length(), 4);
        }
        samples.push([
          ...pose.hands.flatMap((h) => h.toArray()),
          ...pose.ankles.flatMap((a) => a.toArray()),
          ...rig.bones
            .get("pelvis")!
            .bone.getWorldPosition(new Vector3())
            .toArray(),
        ]);
      }
      expect(
        samples.some((s) =>
          s.some((n, i) => Math.abs(n - samples[0][i]) > 0.08),
        ),
      ).toBe(true);
      for (let i = 1; i < samples.length; i++)
        expect(
          Math.max(
            ...samples[i].map((n, j) => Math.abs(n - samples[i - 1][j])),
          ),
        ).toBeLessThan(0.13);
    },
  );
  it.each([
    "squat",
    "goblet",
    "rdl",
    "curl",
    "press",
    "floor",
    "bridge",
    "pushup",
    "row",
    "pulldown",
  ] as const)("%s keeps both feet planted", (movement) => {
    const rig = rigFromAsset();
    const start = applyPose(rig, movement, 0).ankles;
    for (const time of [0.6, 1.2, 2.4, 3.6, 4.8]) {
      const pose = applyPose(rig, movement, time);
      pose.ankles.forEach((ankle, i) =>
        expect(ankle.distanceTo(start[i])).toBeLessThan(0.015),
      );
    }
  });
  it("bird dog alternates opposite limbs", () => {
    const rig = rigFromAsset();
    const first = applyPose(rig, "bird", 2.4),
      second = applyPose(rig, "bird", 7.2);
    expect(first.hands[0].y).toBeGreaterThan(first.hands[1].y + 0.3);
    expect(first.ankles[1].y).toBeGreaterThan(first.ankles[0].y + 0.3);
    expect(second.hands[1].y).toBeGreaterThan(second.hands[0].y + 0.3);
    expect(second.ankles[0].y).toBeGreaterThan(second.ankles[1].y + 0.3);
  });
});

it("keeps the deadlift a hip hinge with only a soft knee bend", () => {
  const rig = rigFromAsset();
  applyPose(rig, "rdl", 2.4);
  const position = (name: string) =>
    rig.bones.get(name)!.bone.getWorldPosition(new Vector3());
  const knee = position("calf_l");
  expect(
    position("thigh_l").sub(knee).angleTo(position("foot_l").sub(knee)),
  ).toBeGreaterThan(2.5);
});
it("keeps supported wrists at the bench or mat", () => {
  const rig = rigFromAsset();
  for (const time of [0, 1.2, 2.4, 3.6]) {
    applyPose(rig, "pushup", time);
    for (const side of ["l", "r"])
      expect(
        rig.bones.get("hand_" + side)!.bone.getWorldPosition(new Vector3()).y,
      ).toBeCloseTo(0.63, 2);
    applyPose(rig, "bird", time);
    expect(
      rig.bones.get("hand_r")!.bone.getWorldPosition(new Vector3()).y,
    ).toBeLessThan(0.06);
  }
});
