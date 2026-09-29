# Kinset

A mobile-first strength-training journal. Plan your week, log your sets, and understand the broad muscle groups involved in your training.

**Status: working preview, not a production release.** Demo mode is usable without a backend. Real accounts require the Supabase setup below. Anatomical geometry comes from Z-Anatomy / BodyParts3D under CC BY-SA, with bundled attribution. Exercise-to-muscle mappings still need professional review.

## Run locally

```sh
npm ci
cp .env.example .env
npm run dev
npm test
npm run test:database
npm run build
```

Node.js 22 or later is recommended. Leave the Supabase fields empty to use demo mode. Demo data is stored in this browser's IndexedDB, independently from account data.

## Included

- Responsive phone-first interface with Today, Train, Explore, History, and Settings.
- Onboarding: goal, schedule, experience, equipment, units, optional body measurements.
- Small general fitness template library selected by equipment and experience. Goals are recorded; this version does not generate individualized prescriptions or a fat-loss plan.
- Workout logging with checked sets, previous performance, rest timer, active-session recovery, history and deletion.
- Lazy-loaded React Three Fiber anatomical model and list-based exercise discovery.
- Illustrative rigged movement previews for bodyweight squat, dumbbell curl, and dumbbell shoulder press. Play/pause, half speed, restart, front/side views, and a Movement/Muscles switch. The motions are authored approximations, not trainer-reviewed instructional assets; playback starts paused and suspends when the tab is hidden.
- Supabase email signup, confirmation, login, password recovery, sign-out and an account-deletion Edge Function.
- Per-account journals protected by row-level security, with atomic revision checks to detect concurrent device writes.
- IndexedDB saving and retrying cloud sync while the app remains open. Full offline reopening / PWA installation is not implemented yet.
- Data export as JSON.

## Connect a new Supabase project

1. Create a Supabase project in your account. Keep the database password and service role key private.
2. Run `supabase/migrations/202609280001_journals.sql` in the project's SQL editor, or apply it through the Supabase CLI.
3. Copy the **project URL** and **publishable key** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. Never put a service-role key in a Vite environment variable.
4. Enable email/password authentication and email confirmation. Set the site URL to your deployment URL. Add `http://localhost:5173/` and your exact deployment URL to the allowed redirect URLs. If using a GitHub Pages subpath, include `/kinset/`.
5. Configure production SMTP before a public release; test confirmation and recovery delivery.
6. Deploy `supabase/functions/delete-account` to your project using the Supabase CLI. The function validates the caller's JWT itself and deletes only that authenticated user. With publishable-key deployments, configure gateway JWT verification according to Supabase's current guidance; do not remove the in-function user verification.
7. Restart the dev server. Create two test accounts and verify that neither can read or overwrite the other's journal. Verify confirmation, reset, deletion, sign-out, and a conflict between two browser sessions.

The embedded PostgreSQL tests verify revision handling, account isolation, direct-write denial, anonymous access denial and deletion cascade. No Supabase project was provisioned by this repository. Cloud workflows need end-to-end validation against your project before release.

## Storage and sync

The first version stores one JSON journal per account to keep writes atomic. `save_journal` checks the prior revision before writing; conflicts require exporting local changes and choosing the cloud copy. There is no silent last-write-wins merge. Local records are namespaced by user ID. Logging out does not erase the device's cached journal, allowing pending offline work to survive; avoid shared devices. Account deletion clears this browser's copy and cascades cloud deletion, but cannot erase offline caches on other devices. Clearing browser storage removes local-only/demo data.

The document has a 5 MB server limit. A production iteration should normalize sessions and sets into separate tables and support per-session conflict resolution before long-term histories become large.

## GitHub Pages preview

The manual `Deploy preview to GitHub Pages` workflow builds for `/kinset/`. Set Pages to deploy from GitHub Actions. Add repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to connect accounts. Without them the deployment runs in demo mode. Publishing is a separate step from pushing source.

## Before a public release

- Have a qualified trainer review and correct the 30 procedural exercise motion previews before presenting them as instructional demonstrations. Character attribution is in `public/motion/CREDITS.md`.
- Optimize the anatomy assets further for mobile (currently about 11.5 MB across two lazy-loaded GLBs); review exercise content and muscle mappings with a qualified professional.
- Run the cloud authentication, row-access, sync conflict and deletion checks above.
- Add durable offline app-shell caching, service-worker update handling, device cache controls and automated browser regression tests.
- Audit keyboard and screen-reader use, contrast, 200% text zoom, slow mobile networks and real-device WebGL performance.
- Establish privacy and retention policies, consent for any analytics, backup/restore and error monitoring. No analytics are included in this preview.
- Verify name and asset rights before release. The Kinset name has not been cleared for availability.

## Implementation

React, TypeScript, Vite, Three.js, React Three Fiber, Drei, Supabase, Zod, idb-keyval, Lucide, and Vitest. Dependency versions are recorded in the lockfile. The viewer is in `src/Body.tsx`. Anatomy files and their adaptations retain the CC BY-SA license described in `public/models/ATTRIBUTION.md`. The viewer removes exported label meshes and fascia overlays at runtime; the original GLBs are unchanged.

## Movement guides

All 30 catalog exercises open with an animated 3D preview: squat, goblet squat, curl, shoulder press, Romanian deadlift, supported row, floor press, incline push-up, glute bridge, alternating bird dog, lat pulldown, and leg press, plus 18 additional movements and variations including lunges, split squats, calf raises, raises, rows, neutral-grip curls, dead bugs, and quadruped hip exercises. Benches, a mat, a cable bar, and a moving leg-press platform give context to supported exercises. Controls include pause/play, half speed, restart, camera views, and a movement scrubber. Playback starts automatically unless reduced motion is requested, and pauses rendering while the tab is hidden.

Written setup, movement, breathing, and form cues remain below each animation and are available if the 3D viewer fails. A shared movement catalog controls availability across the app; future exercises without a supported animation open their written guide. All motion is illustrative, authored procedurally, and requires qualified trainer review before launch. `tests/motion.test.ts` checks the shipped skeleton for animation coverage, continuity, fixed bone lengths, foot contact, and alternating limbs.

## Custom workout plans

Open **Plans** to create a routine from scratch or customize the foundation program. A plan supports 1–7 workout days with up to 20 distinct exercises per day, 1–10 sets, and positive whole-number rep ranges without a 100-rep cap. Days and exercises can be reordered. Drafts autosave with the journal; saving a plan is separate from selecting **Use plan**. Plans can be edited, duplicated, deleted, or started from any day.

The Today screen follows the active plan’s rotation. Completing a session advances that plan’s next day; discarding a session does not. Each session snapshots its day name, exercises, set count, and rep targets, so later plan edits/deletion do not change an active log or workout history. Plans, draft edits, and rotation position share the existing IndexedDB persistence, versioned Supabase journal, offline queue, conflict handling, and JSON export. Older journals without plan fields retain their foundation routine. Live Supabase accounts still require project configuration.

## Connected preview — September 29, 2026

The local preview and GitHub Pages build are configured for the Kinset Supabase project. The journal schema and RLS are deployed, email/password signup with confirmation is enabled, and authentication callbacks include the live `/kinset/` URL and both localhost preview URLs. The `delete-account` function is deployed with user verification inside the handler. Only the browser-safe publishable key is passed to the client; server keys remain in Supabase.

Verified against the live database in a rolled-back transaction: owner reads, revision updates, stale-write rejection, and cross-account read isolation. Unauthenticated API requests to journal reads, writes, and account deletion are rejected. Local database tests also cover deletion cascade and direct-write denial. Actual signup email delivery, password recovery, and the full browser account lifecycle still require an inbox test; custom production SMTP has not been configured.

The visual system uses a stretched Kinset masthead, an orange session poster with the primary action first, a separate exercise lineup, and a weekly progress rail. Workout history uses set-by-set tables with explicit logged status. Rep counts have no arbitrary 100/999 upper cap; only positive safe integers are accepted.
