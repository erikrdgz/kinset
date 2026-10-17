# Engineering plan and release gates

## Architecture decision

Retain React/TypeScript/Vite and Supabase for the first redesigned slice. A full frontend rewrite is not justified by the current evidence. Introduce clear feature boundaries and a domain model that can be reused by a native recorder. Prototype native background recording before selecting the final mobile shell; see [running specification](05-running.md).

Proposed boundaries (adapt names to repository conventions):

```text
src/app/                 routes, navigation, auth boundary, app providers
src/features/today/      next action and weekly schedule
src/features/training/   session workspace, summary, workout selection
src/features/plans/      plan editor, program enrollment, scheduling
src/features/library/    discovery, detail, contextual pickers
src/features/progress/   charts, history, exercise trends
src/features/running/    recording UI and platform adapter
src/domain/              versioned schemas, commands, metrics, migrations
src/data/                local repository, cloud repository, sync/outbox
src/media/               provider adapters, rights-aware player
src/ui/                  tokens, controls, sheets, typography, empty states
```

Extract working logic incrementally from the 1,829-line `App.tsx`; do not combine a storage rewrite, design rewrite and GPS launch in one unreviewable change. Replace global CSS accumulation with tokens and feature/component styles. Archive procedural demo code only after its entry points are replaced; preserve license notices for any retained assets.

Keep existing Radix Select/Lucide/Zod. Use the native video element for media; CSS plus Motion only where needed. [Vite PWA](https://vite-pwa-org.netlify.app/guide/) is a candidate for build-manifest precaching/update orchestration. It is not proof the app will reopen offline or record GPS in the background. Map rendering is a separately loaded feature. Avoid adding a new dependency for every small control; test installed-version compatibility before choosing package versions.

## Domain contracts to implement before expanding the UI

| Entity | Required concepts |
|---|---|
| ExerciseDefinition | Stable ID/version, aliases, browse groups, precise primary/supporting muscles, movement patterns, equipment requirements, difficulty, measurement/load semantics, guide, review status, media references, deprecation |
| WorkoutTemplate | Stable ID/version, audience, duration estimate, required equipment, blocks, ordered exercise prescriptions, alternatives, reviewer/publication state |
| ProgramDefinition / Enrollment | Versioned weeks/sessions/progression rules; enrollment snapshot; schedule and explicit overrides |
| UserPlan | User-owned editable routine and draft; source-template reference; blocks and ordered entries; active rotation |
| Session | Stable ID, type, status, source snapshot, started/finished time, timezone, original units, active/pause intervals, exercise entries, notes, version |
| SessionExercise | Unique entry ID separate from exercise ID, exercise-definition snapshot, order, original prescription, substitutions and logged sets |
| SetRecord | Stable ID, planned/performed values, measurement kind, load semantics, side, set type, completion timestamp, effort/notes optional |
| ScheduleItem | Planned local date/timezone, plan/program reference, state, linked completed session and reschedule lineage |
| MediaAsset | Provider/license/delivery/cache constraints, stable asset identifiers, variants, poster, review state |
| RunActivity / RouteChunk | Separate from strength journal; ordered native-persisted samples and derived summaries; see run spec |

Use discriminated measurement schemas so invalid combinations cannot slip through: a time-based plank doesn't need reps=1; a run doesn't require weight=0; an assisted pull-up isn't treated as negative external load. Preserve original raw values and units; canonical values aid comparisons but never overwrite the source log.

Allow duplicate exercise definitions in separate workout blocks by using entry IDs; the current per-day uniqueness constraint must change deliberately. Supersets reference stable group IDs and explicit sequence/rest behavior. Reordering indices must not change identity. The session snapshot is independent of future plan or catalog edits.

State changes should be explicit commands: start, update set, complete/uncomplete set, replace remaining exercise, skip, pause, resume, finish, discard. A reducer/service validates transitions and applies each operation ID once. UI components should not directly reconstruct entire journals to implement every action.

## Preservation and migration

1. Add `schemaVersion` and parse data at local/cloud/import boundaries. Quarantine malformed records with export/recovery access; do not silently reset a journal to empty.
2. Before migration, retain a recoverable original snapshot. Test fixtures must include legacy journals without plans, custom drafts, active sessions, mixed kg/lb history, missing optional fields, unknown exercise IDs and partially completed work.
3. Preserve all 30 existing exercise IDs. Add stable entry IDs without changing set/session IDs. Fill exercise-name snapshots from the archived current catalog when possible; unknown IDs get a readable placeholder and raw ID, not a crash.
4. Keep legacy completion semantics intact. Records already stripped of unfinished sets remain “planned detail unavailable”; never reconstruct invented skip counts. Existing dumbbell logs have uncertain per-hand/combined interpretation, so label legacy semantics rather than guessing.
5. Migration is deterministic and rerunnable, writes to a new versioned local key transactionally, verifies counts/checksums, and swaps only after success. An interrupted migration can resume or restore the old copy.
6. During the first UI slice, a versioned journal adapter can keep existing revision writes. Before large histories/run sync, migrate to per-entity records. Do not introduce uncontrolled dual writes. Choose one write authority per account/version, record a cutover marker, and preserve rollback data.
7. Old clients must not overwrite newer schemas. Validate supported schema versions server-side; provide a safe update-required state with export/resume considerations. Coordinate deployment and service-worker update behavior.
8. A migration report reconciles source/target session, entry, set, plan and draft counts plus units/timestamps. No release if user data silently changes.

## Storage, sync and security

Target normalized tables: profiles/preferences, user plans and versions, program enrollments/schedule, sessions, session exercises, set logs, run activities, route chunks, and sync operation receipts. Public catalog/media metadata is separate from private user journals. Raw route files use private storage with authenticated access; never a public bucket.

Local repository persists confirmed commands transactionally with an outbox before showing durable success. Cloud acknowledgments are a separate state. On web, use IndexedDB transactions across entities/outbox (a small structured repository or an evaluated transaction-capable library); idb-keyval's whole-record simplicity need not dictate the future model. On native, the recorder writes its own durable native store and can operate without JavaScript.

Outbox operations carry `operationId`, entity ID, base revision and payload. Server applies ownership checks, optimistic concurrency and duplicate-operation detection atomically. Retry with bounded exponential backoff/jitter; do not retry permission/schema failures forever. Repeated “finish” is safe and plan advancement happens once.

Merge independent sessions automatically. For simultaneous edits to the same set/plan, retain both versions and show a targeted resolution. Never silently replace an entire journal to settle one changed set. Deletes use tombstones so another offline device cannot resurrect them; actual account erasure has its own authenticated cascade and storage cleanup.

Every user table and storage path has RLS/access policies with cross-owner tests. Keep privileged API keys, Strava refresh tokens and media-provider keys off the Vite client. Restrict transparent media proxies to known assets/origins, authenticate appropriately, and prevent open-proxy abuse. Exclude precise location and sensitive payloads from logs/analytics. Maintain account-scoped caches and clear them at the correct lifecycle events.

Account deletion stops active tracking, handles pending local writes explicitly, deletes applicable cloud objects and confirms local removal. Other offline devices cannot be remotely erased instantly; they must handle revoked sessions and local-cache clearing on reconnect. Offer a clear device-cache control at sign-out for shared-device use.

## Offline and update behavior

The existing service worker is groundwork, not a completed requirement. Implement:

- Versioned precache of the actual app shell/build assets and locally licensed essential instructions. Cache fonts where licensed. Lazy-load library extras, charts, maps and any optional anatomy.
- Explicit cache allowlists; auth, database writes, private APIs and stream-only media are excluded. Supplier metadata/media TTLs are enforced independently. Never use a catch-all same-origin media cache.
- User-visible download packs only for assets with offline rights. Show size/progress/last-updated status, support eviction, handle quota failure, and preserve user logs before expendable media.
- A service-worker update waits for a safe point; do not activate a breaking update mid-workout. Save locally before update, preserve compatible active sessions, and handle rollback.
- “Saving”, “Saved on device”, “Sync pending”, “Synced”, and actionable storage errors are distinct. “Offline” describes connectivity, not a guarantee that data is safely stored.
- Reopening in airplane mode must work after the defined installation/download flow, including a hard restart. Test the production build because the dev server does not register the worker.
- No account creation requirement for an already started local session. Authentication expiry must not prevent local completion; explain how to reconnect securely.

## Metric definitions

| Metric | Rule |
|---|---|
| Completed session | One finished nonempty activity with stable ID; repeated sync/finish does not increase count |
| Consistency | Completed eligible sessions against explicitly planned sessions/days; distinguish rest/rescheduled/missed |
| Active duration | Elapsed time minus explicit pauses; do not present time since a forgotten open tab as exercise time |
| Exercise best | Compare compatible exercise variant, measurement kind, load semantics and unit-converted data; retain original display |
| Working sets by muscle | Default primary-muscle attribution only; show supporting work separately rather than silently double-counting each set across all muscles |
| Load-volume | Completed working-set reps × external load under a stated convention; exclude incompatible timed/assisted/bodyweight records from a combined total |
| Estimated 1RM | Optional later metric; label estimate and formula, restrict to suitable data and explain limits; not a launch prerequisite |
| Running metrics | Use accepted samples, recorded pause intervals and quality flags; see run specification |

A muscle-map chart describes training exposure, not tissue damage, readiness or recovery. No “86% recovered” without a separate validated basis. Do not generate physiological scores from an arbitrary elapsed-time decay. Weight/calorie/nutrition dashboards are outside the core redesign despite their presence in a visual reference.

## Prioritized backlog

| ID | Priority | Scope | Dependency / acceptance |
|---|---|---|---|
| K01 | P0 | Versioned schemas, migration fixtures and stable history | Existing data survives; no ID/unit/count changes |
| K02 | P0 | Four-tab routes, tokens and responsive shell | Back/restore works; 320px+ and large text usable |
| K03 | P0 | Today, preview, focused strength logging, summary | Real end-to-end session, durable local confirmation |
| K04 | P0 | Contextual guide/player and primary/supporting map | One-tap help; exact return; no media-blocked logging |
| K05 | P0 | Rest persistence, edit/undo, session substitutions | Reload, reordered sets, completed-data preservation |
| K06 | P0 | First 48 reviewed movements / eight workouts | Coverage and rights audit; no placeholder demos passed off as real |
| K07 | P0 | History/Progress baseline and metric definitions | Empty/single-point/mixed-unit/edit cases correct |
| K08 | P0 | Auth recovery, sync failure and production offline | Live lifecycle and failure tests before public launch |
| K09 | P1 | Full 90-movement/24-workout collection | Technical/content/media quality gates |
| K10 | P1 | Six programs, schedule/reschedule, transparent progression | Versioned enrollment; no history mutation |
| K11 | P1 | Timed mobility, supersets, set types, effort/notes | Typed prescriptions and accessible controls |
| K12 | P1 | Import/restore, per-entity sync and conflict UX | Safe preview, owner isolation, idempotent import |
| K13 | P1 | Native run feasibility → production recorder | Hardware gates; separate schema; private routes |
| K14 | P2 | Strava connection, optional reminders and share cards | Explicit opt-in, durable retries and privacy preview |
| K15 | P2 | HealthKit/Health Connect, watch controls, live activities | Separate native permissions/deduplication project after recorder stability |

P0 is the first credible premium release; P1 completes the broader requested training scope. These are sequencing priorities, not instructions to drop P1. Later candidates: plate calculator, equipment presets by gym, advanced analysis, coach assignment. Defer social feed, leaderboards, food logging, AI form scoring and autonomous “AI coach” prescriptions until the core experience is proven. Each adds substantial content, moderation or accuracy obligations without solving today's logging problems.

## Acceptance tests with meaningful failure cases

1. **Old journal migration:** all fixture identities/counts/units preserved; interrupted/repeated migration doesn't duplicate; unknown catalog IDs render safely.
2. **Session integrity:** completed set survives refresh immediately after local-save confirmation; storage failure never shows “Saved”; double-finish yields one history record and one plan advance.
3. **Context:** open guide with partially typed values, change guide tabs, close; same set/value/scroll/timer remains. Navigate away/minimize/reopen similarly.
4. **Timers:** rest survives reload; interval pause/resume and long background interruption follow defined state. Changing system clock doesn't create a negative duration or extra completed interval.
5. **Substitution:** match equipment/pattern; retain already completed work; new entry IDs avoid index collisions. Missing pull equipment produces an honest limitation, not a glute bridge substitution.
6. **History:** edit/delete/restore recomputes charts/PRs. Changing profile units shows comparable history without rewriting original loads. Template/catalog updates cannot rename or erase old exercises unexpectedly.
7. **Plan/program:** save is distinct from activate; custom drafts survive; reordering/deleting a plan leaves active/history snapshots intact; rescheduling does not double-count completion.
8. **Sync:** two devices create different sessions offline and merge; competing edits to one set surface a conflict; network retry doesn't duplicate; tombstones prevent resurrection.
9. **Access:** anonymous/cross-owner reads and writes fail for every table/storage endpoint; account deletion removes routes as well as sessions; media/Strava keys never enter browser bundles.
10. **Media:** invalid/expired URL, 429, no internet, disabled autoplay, missing poster, reduced motion and storage quota failure all preserve usable logging/guide text; stream-only assets never enter durable cache.
11. **PWA:** install production build, open needed screens, quit, airplane mode, relaunch; record and finish; reconnect and confirm once-only sync. Update while active defers safely.
12. **Accessibility:** keyboard and screen-reader task completion, dialog focus restoration, readable errors, chart table alternative, no per-second announcement flood, 200% text zoom and 320px no essential horizontal clipping.
13. **Performance:** record network/bundle budgets, input latency and scrolling on an agreed midrange phone. Proposed targets: local input feedback under 100ms, warm Today usable under 1s, cold main view under 2.5s on a documented mobile-network profile. These are goals, not measured current results.
14. **Content:** every published template references valid published exercises, equipment union is correct, prescriptions match measurement kinds, sides/rests valid, all media has provenance and review status.
15. **Run:** execute the separate field-test matrix, not just mocked GPS unit tests.

Retain current domain/database checks, update motion-related tests deliberately when retiring the procedural renderer, and add focused browser regression coverage for the critical journeys. Passing numerical skeleton tests cannot certify instructional form.

## Operational readiness and scope transparency

Provide redacted error reporting, backup/restore rehearsal, deletion/retention handling, content incident rollback, asset health checks and dependency maintenance. Optional product measurement should track task completion and failures without raw loads, body data or routes in event payloads. Collect only what is needed and honor user preferences.

Track implementation as a checklist with evidence: changed files, passed tests, screenshots, device/version, unresolved dependencies. No synthetic screenshot or mocked route counts as a shipped feature. Document where licensed content or real-device validation remains unavailable. The reference package supports implementation; it does not substitute for those external release gates.
