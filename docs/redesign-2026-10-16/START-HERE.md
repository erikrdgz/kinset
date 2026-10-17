# Kinset: product and execution brief

Prepared October 16, 2026. Audited commit: `8d43f72511de9b99f203f2c112725a0d05ace25c`.

## The product decision

Make Kinset a premium training companion for people who lift and want to run: a clear next workout, effortless logging, credible movement instruction, and progress they can understand. The workout is the center of the product. The library supports it.

Keep the useful foundations: custom plans, session snapshots, previous sets, local persistence, account isolation, and revision conflict detection. Replace the procedural demonstration experience with professionally reviewed media. Preserve the useful “areas worked” concept as a lightweight, accurate muscle map, with deeper anatomy available inside the library only if it earns its place.

The design direction is charcoal, warm white, restrained electric lime, large athletic typography, real human imagery, precise data, and purposeful motion. The attached references are mood and hierarchy references, not instructions to copy their claims, artwork, brands, or features. “Recovery 86%” in a reference is not evidence that Kinset can calculate recovery.

## What the audit found

- **30 exercises:** 13 legs, 5 shoulders, 4 chest, 3 back, 3 arms, 2 core. The first six results are all legs. Fix both the content inventory and discovery order.
- **Useful strength journal; limited programming:** equipment-based A/B routines and custom plans exist. Multiweek programs, a substantial workout collection, timed workouts, substitutions, and progression logic do not.
- **The guide opens with anatomy:** a user who asks how to perform an exercise must switch to the demonstration. Learning and logging need different defaults.
- **Six mobile navigation items:** Today, Train, Explore, Plans, History, Settings. Consolidate to Today, Train, Library, Progress; place settings under the profile.
- **Basic PWA groundwork exists despite the README saying otherwise.** It needs update safety, predictable caching, and production offline verification.
- **Running needs a native recording layer.** Keep the existing web investment; prove background recording on real phones before committing to a wrapper or rewrite.
- **Media licensing changes architecture.** Standard MuscleWiki streaming terms do not support downloadable workout videos. Treat offline rights as a selection criterion, not an implementation detail to discover later.

## Read order for execution

1. [01-current-state.md](01-current-state.md): evidence, feature inventory, file map, baseline checks.
2. [02-experience-and-art-direction.md](02-experience-and-art-direction.md): product flows, screen specifications, tokens, imagery, animation, accessibility.
3. [03-content-and-media.md](03-content-and-media.md): catalog expansion, workouts/programs, media options, sourcing decision, content model.
4. [04-engineering-plan.md](04-engineering-plan.md): architecture, data preservation, offline, metrics, sequencing, acceptance tests.
5. [05-running.md](05-running.md): platform decision, run experience, recording model, privacy, Strava integration, device gates.
6. [sources.md](sources.md): dated primary-source research and remaining vendor questions.

The source audit is reusable; check the diff from the audited commit before implementation and inspect only changed or task-relevant files. Do not repeat a full discovery phase. Vendor terms and SDK compatibility should be rechecked when actually contracting or installing, because those can change.

## Recommended delivery sequence

| Stage | Deliverable | Release condition |
|---|---|---|
| A | Preserve current data; add migration fixtures; extract domain and session state | Existing and migrated journals behave identically where semantics are unchanged |
| B | Premium Today → preview → strength session → summary → Progress slice | Real logging works, survives interruptions, and looks coherent on phones |
| C | Contextual guides, accurate muscle maps, searchable Library, first expanded content set | Media rights and review status explicit; no blocking media dependency |
| D | Full content collection, program scheduling, timed sessions, progression and advanced logging | Content and calculations pass the defined gates |
| E | Production offline/sync/auth hardening | Real account lifecycle, device storage failure, multi-device and offline tests pass |
| F | Native run recorder and run history, then optional Strava connection | Background, GPS quality, battery and privacy gates pass on real phones |

Offline and migration groundwork begins in A/B; E is the comprehensive release gate, not permission to defer data safety. Run feasibility can be investigated early, but run UI must not be presented as working GPS before its recorder exists.

## Opus handoff prompt

Use the following text in Opus with this repository open:

> Implement the Kinset redesign described in `docs/redesign-2026-10-16/START-HERE.md` and its linked specifications. This is an implementation task; the repository audit, research, design decisions, and acceptance criteria are already documented. First check changes since commit `8d43f72511de9b99f203f2c112725a0d05ace25c`, then work through the delivery stages. Preserve all existing user plans, journals, active sessions, IDs, units, and account isolation. Start with a complete Today → workout preview → strength session → summary → Progress slice, including migration and persistence behavior. Implement the four-tab information architecture, contextual movement help, and the charcoal/ivory/lime visual direction. Keep real set logging fast and independent of media/network availability. Replace the procedural demonstration default and retain muscle education using reviewed maps. Expand content according to the documented coverage plan; never pretend unlicensed media or unreviewed content is launch-ready. Implement running through the separate native recording feasibility and release gates. Do not repeat the broad research or substitute a superficial reskin. Make small reviewable changes, test against the documented acceptance cases, and keep an implementation ledger of completed, blocked, and unverified items. If paid assets or external credentials are unavailable, complete the adapter and honest fallback and clearly identify that release dependency. Do not invent media URLs, physiology scores, or successful device validation.

This package has been prepared for handoff; it has **not** been sent to or executed by Opus. No callable Opus destination was available in this session. App implementation was intentionally left for that execution step.

## Decisions already proposed; decisions still external

Proceed with four tabs, contextual help, the visual direction, structured exercise data, reviewed content expansion, preservation-first migrations, and local-first session logging. These are recommendations derived from the request, not findings from user testing.

External decisions: media supplier/contract and budget; access to qualified content review; first native platform and developer accounts; production SMTP and operational services. Defaults: maintain web parity, validate iPhone background recording first, then Android; procure a coherent downloadable media collection or commissioned clips if offline instruction is a launch promise. Do not make an API purchase or deployment merely because it appears in this brief.

## What was verified

Source inspection, desktop and 390 × 844 browser review of the existing demo, catalog counts, primary-source research, all 176 existing tests, database tests, and a production build. The build reports large JavaScript chunks. No real account lifecycle, screen-locked run, user study, exercise clinical review, media purchase, or production offline installation was performed.

The four reference images were visible in the conversation. Their temporary macOS source paths were no longer readable when copying was attempted. [The reference notes](references/README.md) preserve their visual direction; attach the originals to Opus as well if available.
