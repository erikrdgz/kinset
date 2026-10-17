# Implementation ledger

Tracks what the redesign execution actually completed, what is blocked, and what is
unverified. Started October 16, 2026 from the audited commit
`8d43f72511de9b99f203f2c112725a0d05ace25c` (branch `redesign-core-slice`). HEAD matched
the audited commit exactly, so no source drift had to be reconciled.

Rules for this file: an item moves to **Done** only with evidence (changed files plus a
passing test or a recorded observation). "Unverified" is not a synonym for done. No
synthetic screenshot, mocked route or skeleton test is recorded as a shipped feature.

## Scope of this pass

The brief sequences delivery A–F. This pass executes the P0 core slice that
`START-HERE.md` names first: Stage A (data preservation) and Stage B (Today → preview →
strength session → summary → Progress), plus the K04/K05 work that makes the session
screen credible, and a K07 Progress baseline.

Deliberately **not** attempted in this pass, with reasons:

| Item | Why not now |
|---|---|
| K06 / K09 content expansion | Every new movement needs qualified technique review before publication (03-content-and-media.md). Review access is an external decision. The catalog model, review states and coverage counts are built; the 30 existing published movements stay the published set. |
| Filmed instruction media | No media contract exists and the brief forbids inventing media URLs. A provider-independent player with honest states is built instead; the filmed-asset slot is empty by design. |
| K08 production offline hardening | Needs a production install plus airplane-mode cold-reopen on real devices. Not performed. |
| K10 programs / K11 timed+superset depth | P1, and programs depend on reviewed progression rules. |
| Native background run recording | Gated on the field-test matrix in 05-running.md across real devices. The web recorder ships, labelled foreground-only on screen. |
| Strava connection | Needs server-side encrypted token custody; not something to improvise. GPX/FIT export is the sensible first step. |

## Done

Commits: `e074e76` (domain and migration), `5bc99c4` (training slice). Suite at 223
tests across 7 files, `tsc -b` clean, `vite build` passes.

| Item | What landed | Evidence |
|---|---|---|
| K01 versioned schema | v2 journal with `schemaVersion`, entry IDs distinct from exercise IDs, planned/input/performed separated, per-set load semantics, snapshotted exercise names, persisted rest and pause intervals | `src/domain/schema.ts`; 11 migration tests |
| K01 migration | Deterministic, rerunnable v1→v2 deriving IDs rather than generating them; reconciles sessions, entries, sets, set identities, plans, drafts and units; quarantines rather than resets | `src/domain/migrate.ts`, `migrate.test.ts` |
| K01 live migration | Seeded a v1 journal (mixed kg/lb, unknown exercise ID, half-typed active session, plan + draft) into IndexedDB and reloaded | App reported "2 sessions and 7 sets carried across unchanged". All 7 set IDs and 3 session IDs preserved exactly; units stayed kg/lb; `retired-move` rendered as "Unknown movement (retired-move)" with its values; every migrated set `unspecifiedLegacy`; half-typed value kept as `input`, not as a record; the `kinset:v1:demo` original left in place |
| Catalog structure | All 30 IDs preserved, enriched with precise primary/supporting muscles, movement patterns, full equipment requirement lists, measurement and load semantics, aliases, difficulty, review and media state | `src/domain/exercises.ts`; 5 catalog tests |
| Honest selection | Unfillable slots reported with the equipment that would unlock them | `src/domain/selection.ts`; test asserts a bodyweight lineup reports an unmet pull instead of serving a glute bridge — the audit's finding 6 |
| K02 four tabs + routes | Today · Train · Library · Progress, settings under the profile, hash routes with history; typing in Library replaces rather than pushes | `src/app/routes.ts`, `src/app/Journal.tsx` |
| K02 tokens | Charcoal/ivory/**orange** token system; the legacy orange-gradient paint on secondary text scoped out of the new shell | `src/ui/tokens.css`, `src/ui/app.css` |
| K03 session workspace | Focused current movement, overview sheet, minimize + Resume bar, progress segments, finish review showing completed against skipped | Logged a set in-browser; finish review listed 1/2, 0/2, 0/2, 0/2 |
| K03 idempotent finish | Double-tapped "Finish and save" | One summary record; Progress reported "Sessions 1" |
| K03 summary | Keeps planned-but-unfinished work; load-volume states its convention and counts exclusions | Migrated session showed "35m approximate" and "2 sets are left out of that total" |
| K04 contextual help | How-to sheet opens on **instruction**, muscles second; returns focus to the opening control | Opened mid-set: typed "7" preserved, completed "10" preserved, scroll preserved, rest kept running 0:20 → 0:19 |
| K04 muscle map | Vector front/back map, prime movers vs supporting by fill **and** pattern, text equivalent always present, "not activation or recovery" caption | Rendered inline on Preview |
| K04 media honesty | Provider-independent slot; the 3D demo is opt-in and labelled computer-generated and unreviewed; filmed-asset path written but unreachable | `src/media/Player.tsx` |
| K05 rest persistence | Deadline stored on the session | 1:30 before a reload, 1:13 after — the audited timer lost it entirely |
| K05 edit/undo | Uncomplete returns a result to editable input; completed sets cannot be edited or removed in place | 6 session tests |
| K05 substitution | Matches pattern + full equipment, keeps completed sets, offers nothing rather than a bad swap | 3 substitution tests; sheet states what it keeps |
| Bodyweight handling | No typed zero required; bests and trends rank by reps where there is no external load | Summary read "Split squat — 10 reps", not "0 kg × 10" |
| Anatomy payload | The ~11 MiB GLB anatomy model left every code path; no GLTF chunk in the build | `dist/assets/` contains only the app chunk, the opt-in demo chunk and CSS |
| Interruption recovery | Demo choice kept for the tab, so a reload resumes instead of returning to sign-in | Reloaded mid-session; session, logged set and rest all resumed |
| Responsive | No horizontal overflow at 320px; on 390×844 the start action sits at 660–716px, above both the fold and the tab bar | Measured in-browser |

## Blocked on an external decision

| Item | Blocking dependency |
|---|---|
| Publishing movements beyond the existing 30 | Qualified technique reviewer |
| Filmed exercise instruction | Media supplier selection, contract and offline rights |
| Offline download packs | Depends on the media decision above; stream-only rights forbid durable caching |
| Password reset | Production SMTP (`PASSWORD_RESET_ENABLED` remains `false`) |
| Native run recorder | First-platform decision and developer accounts |

## Unverified

| Claim | What would verify it |
|---|---|
| Production offline cold reopen | Install the production build, quit, airplane mode, relaunch |
| Real-device performance budgets | Measure on an agreed midrange phone. The main chunk is 739 kB / 215 kB gzip and still over the brief's budget; the build warns. Code-splitting the shell is outstanding. |
| Usability targets in 02 §"Usability acceptance tasks" | A study with at least five lifters |
| Exercise technique and muscle attribution | Qualified reviewer sign-off. Every definition carries `techniqueReviewed: false`. |
| Live account lifecycle | Real signup, confirm, reset, delete against production email |
| Multi-device sync and conflict merge | Two real devices offline, then reconnected. Only the audited revision check is in place; per-entity sync is K12. |
| Screen reader and 200% zoom | Only keyboard focus order and the text equivalents were built; neither was exercised with assistive technology |

## Known follow-ups

- `src/Body.tsx` and `src/ExerciseInstructions.tsx` are now unreferenced. Their entry
  points are replaced, so they can be archived — but the anatomy GLBs carry CC BY-SA
  attribution, so removal should handle the credits page deliberately rather than as a
  side effect.
- Auth, onboarding and the plan editor still use the legacy stylesheet and have not been
  lifted onto the token system. The plan editor renders inside the new shell, so it
  inherits the neutral secondary text but not the rest of the design.
- `nextWorkout` still derives equipment from the coarse onboarding bucket via
  `assumedEquipment`. The explicit equipment chips in 02 §1 would remove the guess; the
  bench and machine assumptions are the ones most likely to be wrong today.

## Coverage counts

| Measure | Now | Full-redesign target (03) |
|---|---:|---:|
| Published movements | **90** | 90 |
| Movements with enriched structured metadata | **90** | 90 |
| Movements with reviewed technique | **0** | 90 |
| Movements with licensed media | **0** | 90 |
| Published workout templates | 0 | 24 |
| Programs | 0 | 6 |

Catalog distribution, against the audited starting point:

| Group | Audited | Now | Audited share | Now |
|---|---:|---:|---:|---:|
| Legs | 13 | 26 | 43.3% | 28.9% |
| Back | 3 | 16 | 10.0% | 17.8% |
| Arms | 3 | 13 | 10.0% | 14.4% |
| Core | 2 | 13 | 6.7% | 14.4% |
| Shoulders | 5 | 11 | 16.7% | 12.2% |
| Chest | 4 | 11 | 13.3% | 12.2% |

All 19 movement patterns are now represented, including triceps, carries,
anti-rotation and vertical pulling, which had none.

## Second pass: art direction, catalog, media, running

| Item | What landed | Evidence |
|---|---|---|
| Editorial art direction | Monumental duration numeral over generative point-cloud brand art, accent pill, segmented hero progress, stat tiles, hairline prescription tables | Today rebuilt; verified at 390×844 |
| Micro-animations | Sheets and rest strip rise, set check pops, exercise crossfade, row hover shift, summary mark — all at the motion table's durations, all removed under reduced motion | `src/ui/app.css` motion section |
| Catalog expansion | 42 strength, 12 mobility, 6 conditioning authored with original guides and full structured metadata | 90 published; distribution table above; 6 new catalog tests |
| Exercise roles | Strength slots draw only on strength movements; substitutions must share the original's role | Test: a child's-pose lat stretch is never offered as the pull or as a pulldown substitute |
| Media manifest | Provider-independent, rights-bearing manifest; `streamOnly` cannot be marked cacheable; expired assets reported as expired; `licenseId` mandatory | 9 manifest tests; `npm run check:media` |
| Run recorder | Spec state machine, checkpointed, idempotent, single watcher, manual pause intervals, manual entry | Driven in-browser with synthetic positions |
| Run filtering | Rejects vague fixes, impossible jumps and replayed sequences; gaps are not interpolated | 17 running tests; verified live — km 1 at 4:10 for 4 m/s, gap-spanning split flagged |
| Route rendering | Drawn from samples, no tiles, line breaks at reception gaps | Verified: two segments either side of a simulated 60 s gap |
| Privacy trimming | Removes every sample within a radius of both ends, including a loop passing back through | Test covers the out-and-back case |
| Run storage | Separate keys, never the 5 MB journal row | `src/data/runs.ts` |
