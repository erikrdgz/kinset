import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Dumbbell, MoveUpRight, Play } from "lucide-react";
import {
  equipmentNames,
  patternNames,
  publishedExercises,
  libraryGroups,
  libraryGroupFor,
  matchesLibraryGroup,
  type ExerciseDefinition,
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
const groups = libraryGroups;

export function Library({
  query,
  group,
  exerciseId,
  onQuery,
  onGroup,
  onClear,
  onSelect,
  onClose,
}: {
  query: string;
  group: string;
  exerciseId?: string;
  onQuery: (next: string) => void;
  onGroup: (next: string) => void;
  onClear: () => void;
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
      if (!matchesLibraryGroup(e, group)) return false;
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
          label: alphabetical ? "A–Z" : query.trim() ? "Search results" : groups.find((g) => g.id === group)?.label ?? "Results",
          items: [...matches].sort((a, b) => a.name.localeCompare(b.name)),
        },
      ];
    // Every result appears once; presses and rear-delt work belong to Shoulders too.
    return groups
      .map((g) => ({
        id: g.id,
        label: g.label,
        items: matches
          .filter((e) => libraryGroupFor(e) === g.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((s) => s.items.length);
  }, [matches, alphabetical, query, group]);

  return (
    <div className="library">
      <header className="editorial-heading"><div><h1>Movement library<span className="orange-dot">.</span></h1></div><span className="heading-date">{publishedExercises.length} exercise guides</span></header>
      <div className={`library-discovery ${!query.trim() && (!group || group === "all") ? "has-feature" : ""}`}>
      {!query.trim() && (!group || group === "all") && <button className="library-editorial library-feature" data-reveal onClick={() => onSelect("lateral")}>
        <img src={`${import.meta.env.BASE_URL}movements/wger/lateral.jpg`} alt=""/>
        <span className="library-feature-copy"><span className="kicker">Filmed movement guide</span><strong>Dumbbell<br/>lateral raise.</strong><span className="library-feature-action"><Play size={14} fill="currentColor" aria-hidden="true"/> View technique & muscles</span></span>
        <MoveUpRight className="library-feature-arrow" size={24} aria-hidden="true"/>
      </button>}

      <div className="library-query">
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

      <div className="filters" role="group" aria-label="Filter by body region or activity">
        <button
          className={!group || group === "all" ? "chip selected" : "chip"}
          aria-pressed={!group || group === "all"}
          onClick={() => onGroup("all")}
        >
          All <span className="filter-count">{publishedExercises.length}</span>
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            className={group === g.id ? "chip selected" : "chip"}
            aria-pressed={group === g.id}
            onClick={() => onGroup(g.id)}
          >
            {g.label} <span className="filter-count">{publishedExercises.filter((exercise) => libraryGroupFor(exercise) === g.id).length}</span>
          </button>
        ))}
      </div>

      <div className="library-controls"><span className="library-result-count">{matches.length} {matches.length === 1 ? "movement" : "movements"}</span>
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
            onClick={onClear}
          >
            Clear filters
          </button>
        )}
      </div>
      </div>
      </div>

      {sections.length ? (
        sections.map((section, sectionIndex) => (
          <section key={section.id} className="library-group">
            <div className="library-group-title"><span>{String(sectionIndex+1).padStart(2,"0")}</span><h2>{section.label}</h2><small>{section.items.length} {section.items.length === 1 ? "movement" : "movements"}</small></div>
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
      {exercise.requires.length ? <Dumbbell size={21} strokeWidth={1.3}/> : <MoveUpRight size={21} strokeWidth={1.3}/>}
    </span>
  );
}

export default Library;
