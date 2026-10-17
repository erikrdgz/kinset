import { buildTrack, projectRoute, type RouteSample } from "../domain/running";

/**
 * A route drawn from the recorded samples alone.
 *
 * No map tiles. That is a deliberate choice rather than a shortcut: tiles mean a
 * licensed provider, attribution, a request budget and caching rights, and they mean
 * sending the user's coordinates to a third party to render their own run. The shape of
 * the route is the part that carries meaning, and it can be drawn from the data we
 * already hold, offline, with nothing leaving the device.
 *
 * Gaps in reception are drawn as gaps. The line breaks where the recording broke rather
 * than running a confident straight edge through territory nobody recorded.
 */
export function RouteMap({
  samples,
  className = "",
  ariaLabel,
}: {
  samples: RouteSample[];
  className?: string;
  ariaLabel?: string;
}) {
  const track = buildTrack(samples);
  const { points } = projectRoute(track.samples, 100, 100);

  if (points.length < 2)
    return (
      <div className={`route-map route-map-empty ${className}`}>
        <p className="fine">No route recorded for this activity.</p>
      </div>
    );

  // Split the polyline wherever a gap was recorded, so the line is not continuous
  // across a stretch that was never captured.
  const gapStarts = new Set(track.gaps.map((g) => g.toSeq));
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    if (gapStarts.has(point.seq) && run.length) {
      segments.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length) segments.push(run);

  const start = points[0];
  const end = points[points.length - 1];

  return (
    <div className={`route-map ${className}`}>
      <svg
        viewBox="-4 -4 108 108"
        role="img"
        aria-label={
          ariaLabel ??
          `Recorded route${track.gaps.length ? `, with ${track.gaps.length} gap in reception` : ""}`
        }
      >
        {segments.map((seg, i) => (
          <polyline
            key={i}
            className="route-line"
            points={seg.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
          />
        ))}
        <circle className="route-start" cx={start.x} cy={start.y} r="3" />
        <circle className="route-end" cx={end.x} cy={end.y} r="3" />
      </svg>
      {track.gaps.length > 0 && (
        <p className="fine">
          {track.gaps.length === 1 ? "One break" : `${track.gaps.length} breaks`} in
          reception. The line stops where the recording did; the distance covered in
          between is not counted.
        </p>
      )}
    </div>
  );
}

export default RouteMap;
