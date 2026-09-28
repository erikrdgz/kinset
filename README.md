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

- Have a qualified trainer review and correct the three procedural exercise motion previews before presenting them as instructional demonstrations. Character attribution is in `public/motion/CREDITS.md`.
- Optimize the anatomy assets further for mobile (currently about 11.5 MB across two lazy-loaded GLBs); review exercise content and muscle mappings with a qualified professional.
- Run the cloud authentication, row-access, sync conflict and deletion checks above.
- Add durable offline app-shell caching, service-worker update handling, device cache controls and automated browser regression tests.
- Audit keyboard and screen-reader use, contrast, 200% text zoom, slow mobile networks and real-device WebGL performance.
- Establish privacy and retention policies, consent for any analytics, backup/restore and error monitoring. No analytics are included in this preview.
- Verify name and asset rights before release. The Kinset name has not been cleared for availability.

## Implementation

React, TypeScript, Vite, Three.js, React Three Fiber, Drei, Supabase, Zod, idb-keyval, Lucide, and Vitest. Dependency versions are recorded in the lockfile. The viewer is in `src/Body.tsx`. Anatomy files and their adaptations retain the CC BY-SA license described in `public/models/ATTRIBUTION.md`. The viewer removes exported label meshes and fascia overlays at runtime; the original GLBs are unchanged.
