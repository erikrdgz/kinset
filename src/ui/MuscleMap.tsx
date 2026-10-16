import { muscleNames, muscleView, type MuscleId } from "../domain";

/**
 * A front/back muscle map.
 *
 * This replaces highlighting one broad group on an 11 MiB 3D model, which could only
 * ever say "Arms" for a curl. Regions are drawn as flat vector shapes so the map loads
 * instantly, works offline and reads at phone size.
 *
 * Two honesty constraints shape it. Prime movers and supporting muscles are
 * distinguished by fill *and* by pattern, never by colour alone, and every map carries a
 * text equivalent — a user who cannot see the drawing gets the same information. And the
 * caption says this describes areas worked, not measured activation, recovery or
 * readiness; the diagram has no basis for any of those.
 *
 * The shapes are schematic and original, not an anatomical illustration. The brief wants
 * a licensed front/back map produced as part of the asset package; this is the honest
 * placeholder until that exists.
 */

type Region = { id: MuscleId; d: string };

/** Front-of-body regions, drawn on a 100 × 220 torso-and-limbs silhouette. */
const front: Region[] = [
  { id: "pecs", d: "M34 46 h32 a6 6 0 0 1 6 6 v14 a30 30 0 0 1 -44 0 v-14 a6 6 0 0 1 6 -6 z" },
  { id: "frontDelts", d: "M22 44 a12 12 0 0 1 12 -4 v16 a16 16 0 0 1 -14 -4 z M78 44 a12 12 0 0 0 -12 -4 v16 a16 16 0 0 0 14 -4 z" },
  { id: "sideDelts", d: "M16 46 a10 10 0 0 1 7 -4 l-1 16 a12 12 0 0 1 -8 -6 z M84 46 a10 10 0 0 0 -7 -4 l1 16 a12 12 0 0 0 8 -6 z" },
  { id: "biceps", d: "M15 66 l7 -2 l2 20 l-7 2 z M85 66 l-7 -2 l-2 20 l7 2 z" },
  { id: "forearms", d: "M13 90 l7 -2 l3 24 l-7 2 z M87 90 l-7 -2 l-3 24 l7 2 z" },
  { id: "serratus", d: "M30 70 l6 2 l-2 12 l-6 -3 z M70 70 l-6 2 l2 12 l6 -3 z" },
  { id: "abs", d: "M40 72 h20 v34 h-20 z" },
  { id: "obliques", d: "M31 74 l8 0 v30 l-9 -4 z M69 74 l-8 0 v30 l9 -4 z" },
  { id: "hipFlexors", d: "M38 108 h24 v10 l-12 4 l-12 -4 z" },
  { id: "adductors", d: "M42 122 h16 v26 h-16 z" },
  { id: "quadriceps", d: "M31 120 h12 l-2 46 h-12 z M69 120 h-12 l2 46 h12 z" },
];

/** Back-of-body regions, same silhouette mirrored. */
const back: Region[] = [
  { id: "upperTraps", d: "M36 34 h28 l-6 14 h-16 z" },
  { id: "rearDelts", d: "M20 44 a12 12 0 0 1 13 -4 l-1 16 a16 16 0 0 1 -14 -4 z M80 44 a12 12 0 0 0 -13 -4 l1 16 a16 16 0 0 0 14 -4 z" },
  { id: "rotatorCuff", d: "M30 48 l7 2 l-2 9 l-7 -3 z M70 48 l-7 2 l2 9 l7 -3 z" },
  { id: "midback", d: "M36 50 h28 v18 h-28 z" },
  { id: "lats", d: "M28 56 l8 2 v30 l-10 -8 z M72 56 l-8 2 v30 l10 -8 z" },
  { id: "triceps", d: "M14 66 l8 -2 l2 20 l-8 2 z M86 66 l-8 -2 l-2 20 l8 2 z" },
  { id: "forearms", d: "M12 90 l8 -2 l3 24 l-8 2 z M88 90 l-8 -2 l-3 24 l8 2 z" },
  { id: "erectors", d: "M42 68 h16 v34 h-16 z" },
  { id: "glutes", d: "M32 104 h36 v22 a18 18 0 0 1 -36 0 z" },
  { id: "hamstrings", d: "M33 128 h12 l-2 40 h-12 z M67 128 h-12 l2 40 h12 z" },
  { id: "calves", d: "M34 172 h11 l-2 30 h-10 z M66 172 h-11 l2 30 h10 z" },
];

const silhouette =
  "M50 10 a12 12 0 0 1 12 12 a12 12 0 0 1 -5 10 l10 4 a14 14 0 0 1 10 10 l6 26 l4 32 l-8 2 l-5 -26 l-2 32 l-4 40 l-3 48 h-12 l-3 -46 l-0 -24 l-0 24 l-3 46 h-12 l-3 -48 l-4 -40 l-2 -32 l-5 26 l-8 -2 l4 -32 l6 -26 a14 14 0 0 1 10 -10 l10 -4 a12 12 0 0 1 -5 -10 a12 12 0 0 1 12 -12 z";

function Figure({
  view,
  regions,
  primary,
  supporting,
}: {
  view: "front" | "back";
  regions: Region[];
  primary: Set<MuscleId>;
  supporting: Set<MuscleId>;
}) {
  return (
    <figure className="muscle-figure">
      <svg viewBox="0 0 100 220" role="img" aria-label={`${view} view`}>
        <defs>
          {/* Supporting muscles get a hatch as well as a lighter fill, so the two roles
              are distinguishable without relying on colour. */}
          <pattern
            id={`hatch-${view}`}
            width="4"
            height="4"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="4" className="map-support-bg" />
            <line x1="0" y1="0" x2="0" y2="4" className="map-support-line" />
          </pattern>
        </defs>
        <path className="map-body" d={silhouette} />
        {regions.map((region) => {
          const isPrimary = primary.has(region.id);
          const isSupporting = !isPrimary && supporting.has(region.id);
          if (!isPrimary && !isSupporting) return null;
          return (
            <path
              key={`${region.id}-${view}`}
              d={region.d}
              className={isPrimary ? "map-primary" : "map-supporting"}
              fill={isSupporting ? `url(#hatch-${view})` : undefined}
            />
          );
        })}
      </svg>
      <figcaption>{view === "front" ? "Front" : "Back"}</figcaption>
    </figure>
  );
}

export function MuscleMap({
  primaryMuscles,
  supportingMuscles,
}: {
  primaryMuscles: MuscleId[];
  supportingMuscles: MuscleId[];
}) {
  const primary = new Set(primaryMuscles);
  const supporting = new Set(supportingMuscles);
  const shown = (view: "front" | "back") =>
    [...primaryMuscles, ...supportingMuscles].some(
      (m) => muscleView[m] === view,
    );

  return (
    <div className="muscle-map">
      <div className="muscle-figures">
        {shown("front") && (
          <Figure view="front" regions={front} primary={primary} supporting={supporting} />
        )}
        {shown("back") && (
          <Figure view="back" regions={back} primary={primary} supporting={supporting} />
        )}
      </div>

      {/* The text equivalent. Not a fallback — the same information, always present. */}
      <dl className="muscle-key">
        <dt>Prime movers</dt>
        <dd>{primaryMuscles.map((m) => muscleNames[m]).join(", ") || "—"}</dd>
        <dt>Supporting</dt>
        <dd>
          {supportingMuscles.map((m) => muscleNames[m]).join(", ") ||
            "No significant supporting work."}
        </dd>
      </dl>

      <p className="fine">
        Areas worked, as a qualitative description of the movement. This is not measured
        muscle activation, and it does not describe recovery or readiness.
      </p>
    </div>
  );
}

export default MuscleMap;
