# Current-state audit

Evidence date: October 16, 2026. Source is authoritative where it differs from README. This is a product/code audit, not a claim of production readiness.

## What exists

| Area | Implemented behavior | Limitation / redesign implication |
|---|---|---|
| Accounts | Email login/signup, auth restore, recovery handling, sign-out, deletion handler | Password reset UI is disabled by `PASSWORD_RESET_ENABLED = false`; email delivery and lifecycle need live verification |
| Demo | Browser-local demo journal with a profile and seeded lineup | The inspected browser already contained demo history/custom plans; it was not a fresh onboarding test |
| Onboarding | Name, goal, 2–4 sessions/week, experience, three equipment buckets, units, optional measurements | Goals are recorded but do not select goal-specific programming; no duration preference or granular equipment inventory |
| Today | Next/active session, movement lineup, weekly completed-session dial, last session, plan link | Training, discovery, and navigation compete for attention; no rescheduling or contextual shorter session |
| Foundation | Equipment-dependent A/B workouts; beginner set count adjustment | Bodyweight uses the same four exercises; other variants largely alternate two lineups; no multiweek progression |
| Plans | Create, edit, duplicate, delete, reorder days/exercises, autosave draft, choose active plan, start any day | 1–7 days, ≤20 distinct exercises/day, 1–10 sets, rep ranges; no intervals, supersets, blocks or schedule dates |
| Session | Weight/reps, done toggle, previous values, add sets, guide, finish/discard, restore active journal | No exercise substitution/reorder/add/remove in-session; no notes, timed sets, warm-up types, effort, pause/resume duration, history editing |
| Rest | Automatic 90-second timer after a set; manual start and skip | Fixed duration; timestamp only in component memory, so rest is lost on full reload |
| History | Sessions, dates, set tables, completion counts, deletion | No trends, PR records, filtering, editing, calendar, or rerun action |
| Exercise library | 30 exercises; name search and muscle filters; desktop split view / mobile modal | No equipment filter on this screen, favorites, aliases, difficulty, or contextual add action; builder separately has equipment filtering |
| Demonstrations | 30 procedural 3D motion configurations; playback/camera controls; written guides | Illustrative approximations, not validated filmed instruction; model quality and complexity undermine the intended premium feel |
| Anatomy | Lazy 3D model with one broad muscle category highlighted | Single-group tagging cannot accurately express prime movers vs supporting muscles; a curl highlights the broad Arms group |
| Storage/sync | IndexedDB per owner; 5-second cloud polling; revision-checked journal writes; explicit conflict UI; JSON export | One large JSON record/account; conflict recovery replaces local copy after export; no import/restore UI |
| Web installation | Manifest, icons, production service-worker registration and shell caching | Basic implementation, not proven robust offline delivery; README and Settings still say offline reopening is unsupported |
| Running / health | None found | No run recorder, map, route schema, Strava OAuth, wearable sync, or native project |

## Exact catalog distribution

| Primary category | Count | Share |
|---|---:|---:|
| Legs | 13 | 43.3% |
| Shoulders | 5 | 16.7% |
| Chest | 4 | 13.3% |
| Back | 3 | 10.0% |
| Arms | 3 | 10.0% |
| Core | 2 | 6.7% |
| **Total** | **30** | **100%** |

Equipment labels: 16 Dumbbells, 12 Bodyweight, 2 Full gym. The last figure counts exercises labeled Full gym, not all exercises usable in a gym. The bodyweight label can conceal required furniture/support; equipment needs an explicit requirement list.

Arms currently contains three curl variants and no dedicated triceps movement. Core contains bird dog and dead bug. Back contains two dumbbell rows and a pulldown. Major needs include vertical pulling options, chest presses/push-up progressions, triceps, carries and bracing, timed holds, mobility, and conditioning.

`extraExercises` is prepended to the original catalog. Its first six entries are sumo squat, split squat, reverse lunge, calf raise, dumbbell calf raise, and good morning. Browser inspection confirmed this ordering. Simply adding more exercises at the end would leave the discovery problem intact.

Equal category counts are not a training prescription. Legs is a broad bucket containing several large muscle groups. Evaluate catalog coverage by movement pattern, equipment, difficulty, and substitutions; evaluate a user's training separately by logged work.

## High-value behavioral findings

1. **How-to opens the wrong layer.** `ExerciseStage` and the selected-exercise effect open anatomy first; movement requires another action. The same shared modal is reached from Today, workout logging, library, and plan editing. An unfamiliar lifter needs a concise demonstration and cues in context. A browsing user may want deeper anatomy.
2. **The session is a long form.** Every movement/set is rendered in one scroll. Keep an overview for experienced lifters, but make the active exercise and next set easy to find. Avoid enforcing a linear sequence when someone needs to alternate equipment.
3. **Previous values disappear across unit changes.** The previous-session query requires matching session units. Preserve original units and add explicit conversions rather than implying history is missing.
4. **Completion erases planned-but-unfinished work.** `finishSession` keeps only completed sets/entries. A new summary cannot reconstruct skipped work. Preserve planned and performed records separately going forward; do not fabricate missing legacy records.
5. **History names are not fully snapshotted.** Sessions hold exercise IDs and target reps; history resolves exercise names through today's catalog. Retiring an exercise can damage history display unless a stable archived definition or snapshot is retained.
6. **Random demo selection has a missing-pull edge case.** No Back exercise is labeled Bodyweight. The pull slot in `shuffledProgram` falls back to `program(...)[2]`, a glute bridge, potentially also duplicating an already selected leg movement. This follows from code inspection, not a browser reproduction. The new selector must report unmet patterns instead of disguising a lower-body movement as a pull.
7. **A save indicator can precede durable storage.** `update()` sets a saved message before its asynchronous write resolves. Surface a truthful “Saving…” → “Saved on device” transition, and an actionable failure. Preserve the local-first intent.
8. **The current cloud payload is a growth ceiling.** SQL caps it at 5,000,000 bytes. Raw GPS points must never be appended to this blob.
9. **Service-worker policy is broad.** `public/sw.js` runtime-caches same-origin GET responses and activates immediately. It does not precache build-hashed JS/CSS in its shell list. New same-origin media proxies could accidentally be cached against vendor terms. Replace with explicit request classes and a safe update lifecycle.
10. **The app is built around tab state.** Navigation uses `useState("Today")`, not real route state. Browser back/deep links and independent screen restoration need an explicit design.

## Code entry map

Line references are for the audited commit and will drift.

| File | Relevant entry points |
|---|---|
| `src/App.tsx` | Auth ~316/363; onboarding ~566; journal ~729; timer ~126/747; ExerciseStage ~225; navigation ~1704; previous sets ~1183 |
| `src/domain.ts` | Exercise schema ~19; catalog ~28; sets/sessions ~127; foundation selection ~156; shuffle ~179; completion ~226 |
| `src/extraExercises.ts` | 18 added exercises and their guides; current library ordering |
| `src/plans.ts` | Validation, default reps, foundation plan, selection, snapshot creation and rotation |
| `src/PlanManager.tsx` | Plan editor, exercise picker, plan actions; preserve current working behavior |
| `src/storage.ts` | Owner-keyed IndexedDB, serial writes, cloud revision logic and conflict flow |
| `src/Body.tsx` | Anatomy assets, broad muscle regex mappings, preload behavior |
| `src/ExerciseDemo.tsx`, `src/motion/*` | Procedural demonstration renderer and motion definitions |
| `src/guides.ts`, `src/ExerciseInstructions.tsx` | Existing written instruction structure |
| `src/styles.css` | 4,203 lines; evolving global rules; replace with tokens/components deliberately |
| `src/main.tsx`, `public/sw.js`, `public/manifest.webmanifest` | Existing PWA registration and caching |
| `supabase/migrations/202609280001_journals.sql` | Owner read RLS, revision RPC, payload cap |
| `supabase/functions/delete-account/index.ts` | Account deletion; retain authenticated-user verification |
| `src/*.test.ts`, `tests/motion.test.ts`, `scripts/test-database.mjs` | Existing domain/plan/guide/motion/database regression coverage |

## Verification record

Executed: `npm test` → **176 passed across 4 files**; `npm run test:database` → **pass** for plan/draft round-trip, revision conflict, isolation, write denial, anonymous denial and deletion cascade; `npm run build` → **pass with chunk-size warning**.

Build output: main JS 683.94 kB / 199.97 kB gzip; shared GLTF chunk 983.30 kB / 262.25 kB gzip; CSS 61.24 kB / 13.17 kB gzip. These are build asset sizes, not measured page-transfer totals. Anatomy GLBs occupy approximately 11 MiB combined on disk; movement character approximately 480 KiB. No Lighthouse or phone frame-rate result is claimed.

Browser review: local demo at desktop width and 390 × 844, Today, Library and exercise detail. Confirmed six mobile tabs, leg-heavy ordering, prominent “3D demo” framing, and anatomy-first detail. Existing demo data was left intact; no completed workouts/accounts were created or deleted for this audit. Session workflow findings above are source-derived rather than a full browser workout test.

No applicable AGENTS.md was found in the repository or checked parent directories. Repository source was clean when auditing began. Only the handoff documentation was intentionally added.
