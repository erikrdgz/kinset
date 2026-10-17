import { useMemo } from "react";

function hash(text: string) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** A quiet topographic sculpture. Decorative, never presented as training data. */
export function BrandArt({ seed, className = "", density = 1 }: {
  seed: string;
  className?: string;
  density?: number;
}) {
  const lines = useMemo(() => {
    const phase = (hash(seed) % 100) / 100;
    const count = Math.round(44 * Math.max(.5, Math.min(density, 1.5)));
    return Array.from({ length: count }, (_, row) => {
      const depth = row / (count - 1);
      const coordinates = Array.from({ length: 121 }, (_, column) => {
        const t = column / 120;
        const x = 400 * t;
        const envelope = Math.sin(t * Math.PI) ** 1.8;
        const first = Math.exp(-((t - .4 - depth * .12) ** 2) / .009);
        const second = .55 * Math.exp(-((t - .67 + depth * .09) ** 2) / .015);
        const twist = Math.sin(t * 14 + depth * 5 + phase) * 11 * envelope;
        const y = 100 + depth * 111 - (first + second) * (60 + 45 * Math.sin(depth * Math.PI)) + twist;
        return `${column ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return { path: coordinates.join(" "), opacity: .1 + Math.sin(depth * Math.PI) * .38 };
    });
  }, [seed, density]);

  return (
    <div className={`brand-art contour-art ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" fill="none">
        {lines.map((line, index) => (
          <path key={index} d={line.path} stroke={index === Math.floor(lines.length * .62) ? "#ff692b" : "#c7cdd1"}
            strokeWidth={index === Math.floor(lines.length * .62) ? .8 : .55} opacity={line.opacity} />
        ))}
      </svg>
    </div>
  );
}

export default BrandArt;
