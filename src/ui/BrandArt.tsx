import { useMemo } from "react";

/**
 * Generative brand art for the slots that want a photograph.
 *
 * The art direction calls for authentic athlete photography, and none is licensed. The
 * references' second image — white granular ridges on black with sparse technical
 * linework — is the sanctioned alternative, so this draws that: a seeded point-cloud
 * ridge with a warm glow behind it.
 *
 * It is deliberately abstract. It never depicts a body or a movement, so it cannot be
 * mistaken for instruction, and it carries no claim a photograph would. Seeded by the
 * workout name so a given session always looks like itself.
 */

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A ridge line: a 1-D value-noise walk, rendered as a filled mountain silhouette. */
function ridge(random: () => number, points: number, amplitude: number) {
  const heights: number[] = [];
  let value = 0.5;
  let velocity = 0;
  for (let i = 0; i < points; i++) {
    velocity += (random() - 0.5) * 0.22;
    velocity *= 0.72;
    value = Math.min(1, Math.max(0, value + velocity));
    // Taper toward the edges so the ridge reads as a peak, not a band.
    const taper = Math.sin((i / (points - 1)) * Math.PI) ** 0.8;
    heights.push(value * taper * amplitude);
  }
  return heights;
}

export function BrandArt({
  seed,
  className = "",
  density = 1,
}: {
  seed: string;
  className?: string;
  /** Lower for small cards, where a full cloud turns to mud. */
  density?: number;
}) {
  const { paths, dots } = useMemo(() => {
    const random = seeded(hash(seed));
    const width = 400;
    const height = 220;
    const layers = 3;
    const paths: string[] = [];
    const dots: Array<{ x: number; y: number; r: number; o: number }> = [];

    for (let layer = 0; layer < layers; layer++) {
      const points = 42;
      const amplitude = (0.42 + layer * 0.16) * height;
      const base = height - layer * 10;
      const heights = ridge(random, points, amplitude);
      const step = width / (points - 1);
      let d = `M 0 ${height}`;
      heights.forEach((h, i) => {
        d += ` L ${(i * step).toFixed(1)} ${(base - h).toFixed(1)}`;
      });
      d += ` L ${width} ${height} Z`;
      paths.push(d);

      // Granular scatter along the ridge, densest near its crest.
      const count = Math.round((70 - layer * 16) * density);
      for (let i = 0; i < count; i++) {
        const t = random();
        const index = Math.min(points - 1, Math.floor(t * points));
        const x = index * step + (random() - 0.5) * step;
        const crest = base - heights[index];
        const y = crest - random() * random() * 46;
        dots.push({
          x,
          y,
          r: 0.5 + random() * 1.1,
          o: 0.18 + random() * 0.6,
        });
      }
    }
    return { paths, dots };
  }, [seed, density]);

  return (
    <div className={`brand-art ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id={`glow-${hash(seed)}`} cx="30%" cy="18%" r="80%">
            <stop offset="0%" className="art-glow-in" />
            <stop offset="100%" className="art-glow-out" />
          </radialGradient>
        </defs>
        <rect width="400" height="220" fill={`url(#glow-${hash(seed)})`} />
        {paths.map((d, i) => (
          <path key={i} d={d} className="art-ridge" data-layer={i} />
        ))}
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            className="art-dot"
            style={{ opacity: dot.o }}
          />
        ))}
      </svg>
    </div>
  );
}

export default BrandArt;
