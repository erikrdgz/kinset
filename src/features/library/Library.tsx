import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import {
  equipmentNames,
  patternNames,
  publishedExercises,
  type ExerciseDefinition,
  type MovementPattern,
} from "../../domain";
import { HowTo } from "./HowTo";
import { loadManifest, mediaFor } from "../../media/manifest";

/**
 * The movement library.
 *
 * Two audited problems are fixed here. Browsing no longer depends on array insertion
 * order — `extraExercises` was prepended, so the first six results were all legs — and
 * the default view groups by training role so the balance of the catalog is visible
 * rather than accidental. An explicit A–Z mode is available and is deterministic.
 *
 * Search covers reviewed aliases, so "RDL" finds the Romanian deadlift.
 */
const groups: Array<{ id: string; label: string; patterns: MovementPattern[] }> = [
  { id: "push", label: "Push", patterns: ["horizontalPush", "verticalPush"] },
  { id: "pull", label: "Pull", patterns: ["horizontalPull", "verticalPull"] },
  { id: "legs", label: "Legs", patterns: ["squat", "hinge", "lunge", "hipExtension", "hipAbduction", "ankleExtension"] },
  { id: "core", label: "Core", patterns: ["antiExtension", "antiRotation", "carry"] },
  { id: "arms", label: "Arms", patterns: ["elbowFlexion", "elbowExtension"] },
  { id: "shoulders", label: "Shoulders", patterns: ["shoulderAbduction", "shoulderFlexion"] },
];

export function Library({
  query,
  group,
  exerciseId,
  onQuery,
  onGroup,
  onSelect,
  onClose,
}: {
  query: string;
  group: string;
  exerciseId?: string;
  onQuery: (next: string) => void;
  onGroup: (next: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [alphabetical, setAlphabetical] = useState(false);
  const [, setManifestReady] = useState(false);

  // Thumbnails appear once the manifest resolves; the list renders immediately either way.
  useEffect(() => {
    void loadManifest().then(() => setManifestReady(true));
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return publishedExercises.filter((e) => {
      if (group && group !== "all") {
        const definition = groups.find((g) => g.id === group);
        if (
          definition &&
          !e.patterns.some((p) => definition.patterns.includes(p))
        )
          return false;
      }
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.aliases.some((a) => a.toLowerCase().includes(needle))
      );
    });
  }, [query, group]);

  const sections = useMemo(() => {
    if (alphabetical || query.trim() || (group && group !== "all"))
      return [
        {
          id: "results",
          label: alphabetical ? "A–Z" : "Results",
          items: [...matches].sort((a, b) => a.name.localeCompare(b.name)),
        },
      ];
    // Grouped by training role, so the catalog's shape is visible at a glance.
    return groups
      .map((g) => ({
        id: g.id,
        label: g.label,
        items: matches
          .filter((e) => e.patterns.some((p) => g.patterns.includes(p)))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((s) => s.items.length);
  }, [matches, alphabetical, query, group]);

  return (
    <div className="library">
      <header className="library-head">
        <h1>Library</h1>
        <p className="muted tabular">
          {matches.length} of {publishedExercises.length} movements
        </p>
      </header>

      <div className="search-row">
        <Search size={18} aria-hidden="true" />
        <input
          className="search"
          type="search"
          aria-label="Search movements by name or alias"
          placeholder="Search, or try RDL…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>

      <div className="filters" role="group" aria-label="Filter by training role">
        <button
          className={!group || group === "all" ? "chip selected" : "chip"}
          onClick={() => onGroup("all")}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            className={group === g.id ? "chip selected" : "chip"}
            onClick={() => onGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="library-controls">
        <button
          className="quiet"
          aria-pressed={alphabetical}
          onClick={() => setAlphabetical((v) => !v)}
        >
          {alphabetical ? "Grouped" : "A–Z"}
        </button>
        {(query.trim() || (group && group !== "all")) && (
          <button
            className="quiet"
            onClick={() => {
              onQuery("");
              onGroup("all");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {sections.length ? (
        sections.map((section) => (
          <section key={section.id}>
            <h2>{section.label}</h2>
            <ul className="exercise-list">
              {section.items.map((e) => (
                <li key={e.id}>
                  <button onClick={() => onSelect(e.id)}>
                    <Poster exercise={e} />
                    <span className="exercise-name">
                      <strong>{e.name}</strong>
                      <small>
                        {e.patterns.map((p) => patternNames[p]).join(" · ")}
                      </small>
                      <small className="faint">
                        {e.requires.length
                          ? e.requires.map((r) => equipmentNames[r]).join(" · ")
                          : "No equipment"}
                      </small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="empty-inline">
          <p>
            <strong>Nothing matches “{query.trim()}”.</strong>
          </p>
          <p className="muted">
            Try a shorter word, or clear the filters to see all{" "}
            {publishedExercises.length} movements.
          </p>
          <button
            className="quiet"
            onClick={() => {
              onQuery("");
              onGroup("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {exerciseId && <HowTo exerciseId={exerciseId} onClose={onClose} />}
    </div>
  );
}

/**
 * A consistent list poster: the manifest's still frame when one is licensed, otherwise a
 * typographic mark. Never a grid of autoplaying video — the references put a calm
 * thumbnail in the row and keep motion for the detail view.
 */
function Poster({ exercise }: { exercise: ExerciseDefinition }) {
  const media = mediaFor(exercise.id);
  const still = media?.resolvedPoster ?? (media?.kind === "image" ? media.resolvedSrc : undefined);
  if (still && !media?.expired)
    return (
      <span className="poster">
        <img src={still} alt="" loading="lazy" decoding="async" />
      </span>
    );
  return (
    <span className="poster" aria-hidden="true">
      {exercise.name
        .replace(/^(Dumbbell|Bodyweight|Standing|Seated|Alternating) /, "")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}

export default Library;
