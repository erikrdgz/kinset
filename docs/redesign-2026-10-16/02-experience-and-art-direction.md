# Experience and art direction

These are proposed design decisions, informed by the code audit, the user's references, and the competitive research. They still need usability validation. “Premium” means the app feels deliberate, fast, readable and dependable while someone is tired, holding a dumbbell, or outdoors.

## Users and jobs

| Situation | What the person needs | Product response |
|---|---|---|
| Returning lifter, 25 minutes before work | Start an appropriate session without deciding among dozens of options | One recommended workout; duration/equipment visible; explicit shorter alternative |
| Regular lifter in a busy gym | Log quickly, recall last load, substitute occupied equipment | Prefilled suggestions, large controls, same-pattern swaps, free exercise navigation |
| Beginner facing an unfamiliar movement | Understand setup and execution without losing the workout | In-context video, two cues, optional deeper guide, return to exact set |
| Person interrupted by a call or poor reception | Trust that work is saved | Durable local writes, resumable timers/session, accurate status and recovery |
| Person adding running | See strength and running in one week; track outdoors with screen locked | Shared history/schedule, distinct run recorder, comprehensible splits and privacy |

A user should always know: what am I doing now, what is next, and did my work save?

## Information architecture

**Today · Train · Library · Progress**. Profile/avatar opens settings, connections, units, notifications, data controls and account actions.

- **Today:** the personal next action, week and recent activity. An active session takes precedence over recommendations.
- **Train:** My plan, workout collection, quick start, and eventually Run. This owns scheduling, plan building, saved routines, and program enrollment.
- **Library:** exercises, technique and muscle education. It is a secondary destination, not a required step before training.
- **Progress:** trends and complete history, with strength/run filters. The history detail remains accessible from summaries and Today.

During an active session use a dedicated full-height workspace with “Minimize” and an explicit session menu. Hide the regular bottom tabs to reduce distraction; minimizing restores them and shows a persistent Resume bar. Do not trap the user in a wizard. Only one active recording session in the first release; explain and offer resume/finish before another starts.

Use real navigable routes with preserved scroll/filter state. Back from a guide returns to the initiating set, exercise row or plan picker. Browser back does not discard work. Desktop adds a left navigation and contextual right panel, but uses the same tasks and labels.

## Screen contracts

### 1. First visit and setup

Offer a useful local-first start before account creation; invite account sync after value is demonstrated. Demo remains clearly separate from personal local training. Guest-to-account migration must offer a preview and deduplicate rather than overwrite cloud data.

Ask only what changes the first workout: goal, experience, available equipment, preferred session duration and weekly frequency. Use editable equipment chips with presets; “Dumbbells” does not imply a bench. Name and units are lightweight. Height/bodyweight stay optional in profile; no body-photo gate. Let people browse workouts without completing a questionnaire. Running permission is requested only when they start their first tracked run.

### 2. Today

Top: compact Kinset identity, date, profile. Then a compact seven-day strip with descriptive states: planned, completed, rest, rescheduled. The next-workout hero holds one title, real image, estimated duration range, equipment and focus. One primary action: **Start workout** or **Resume workout**. Below it: “View workout” and “Change today” actions, then the week's progress and a concise recent session.

Avoid hero copy that promises an exact duration for rep-based lifting; show e.g. “About 30–40 min” derived from prescription and rest. “Change today” offers reschedule, another workout, or a shorter curated variant. It does not randomly delete a pull or warm-up to meet a duration target. Missed workouts roll forward through an explicit choice; do not punish rest with broken-streak copy.

The fold should contain the main action on a 390 × 844 phone. Long titles wrap rather than shrink below readable size. No carousel is required to discover the next session. One recovery/mobility suggestion below the main task is enough.

### 3. Train and workout preview

Train opens to My plan and saved workouts; curated discovery is below. Browse by duration, equipment, focus and experience. Make the distinction visible: **workout** = one session; **program** = a sequence across weeks; **exercise** = one movement.

Preview: title/image, intended audience, duration range, actual equipment, sequence of warm-up/main/cool-down blocks, exercise sets/reps or time, and a small muscle map. **Start workout** is fixed above the safe area. “Customize” makes an editable user copy; “Schedule” chooses a date; “Save” favorites the template. Substitution here changes this session unless the user explicitly applies it to the routine.

Every exercise row has a clear help affordance; tapping the main row can expand prescription. Do not hide setup requirements under a generic Full gym chip. Required support, cable anchor, bench, and pull-up bar must be visible.

### 4. Strength session: the most important screen

Top: workout name, elapsed active time, minimize/menu, progress such as “2 of 5 exercises.” Beneath: current exercise name and compact, tappable poster; target range; last performance; then set rows. Controls remain reachable above the keyboard and safe area.

Each row shows set type/number, previous result, load, reps, and complete. Suggested values are visually distinct until explicitly confirmed. Bodyweight does not require typing zero. Explain whether dumbbell load means each dumbbell, combined load or added external load; this is exercise metadata, not a hidden global assumption.

Completing a valid set saves locally, gives a short confirmation, and starts the configured rest timer. The interface should remain interactive immediately. Allow uncomplete/edit with derived records recalculated. Adding/removing sets, exercise notes, reordering and replacing exercises should not require ending the session. Provide a list/overview sheet so experienced users can move freely; default focus can move to the next unfinished set without auto-scrolling while the user types.

Rest is a compact persistent strip with remaining time, **−15**, **+15**, **Skip**, and next-set context. Rest defaults belong to the workout/exercise and are editable; remember user overrides. Finishing rest cues the user but never marks a set complete. Haptics/audio are optional and independently controllable. Web background alarms are best effort and must not be described as guaranteed.

**How-to sheet:** one tap from the current movement opens the film loop, setup cue, two form cues and “More guidance.” A secondary **Muscles** tab shows areas worked. Sheet dismissal restores exact input focus/scroll. It does not restart rest, pause the session unexpectedly, or redirect to Library. This is the core solution to the library getting in the way.

**Replace exercise sheet:** show matching pattern and available equipment first, with reasons (“same horizontal pull; bench required”). Select, review affected uncompleted sets, confirm the replacement. Never erase already logged sets. Alternatives are reviewed equivalences, not merely another exercise with the same broad muscle label. Keep “Skip for today” available without demanding a health explanation.

**Finish:** review completed vs skipped work and optionally notes/effort. “Finish and save” is idempotent; double tap/retry cannot duplicate history or advance a plan twice. A zero-set session offers return or discard, not a fake completed workout.

### 5. Timed movement / mobility player

Use the first reference's hierarchy here: segmented block progress, large time remaining, credible movement demonstration, exercise/side name, one cue, and large pause/next controls. Provide a preparation countdown, left/right segments, configurable transitions and an upcoming preview.

Timers are state machines with persisted deadlines/remaining duration. Navigation, media buffering and app backgrounding do not silently reset them. Explicit pause freezes the interval. On return after a long interruption, show what happened and offer resume/restart segment. Do not report skipped intervals as performed. Strength mode continues to prioritize load/reps rather than a giant countdown.

### 6. Session summary

One restrained moment of completion, then useful facts: performed exercises/sets, duration, valid records, notes, and next scheduled session. Show partial completion neutrally. Load-volume only appears with an explicit definition; do not compare bodyweight, assisted machines, timed holds and running as if their units were interchangeable.

Offer **Done**, **View details**, and optional share. Sharing is a deliberate preview/export action; no automatic posting. Any route image uses privacy trimming. A record claim must survive edits and unit conversion. An account-sync prompt may appear after local save, never before completion is safely recorded.

### 7. Library

Search names and reviewed aliases (“RDL”), filter equipment/muscle/pattern/difficulty, and expose favorites/recently used. Default browsing groups a small balanced selection by training role, then offers an explicit A–Z full list. Never rely on source-array insertion order. Show result counts and clear-filter/no-result recovery.

Use consistent posters in list rows; no grid of autoplaying videos. Exercise detail defaults to movement instruction, with tabs/sections for **Guide · Muscles · Your history**. Contextual actions differ: **Add to workout** in a picker, **Replace exercise** during a substitution, **Save exercise** in discovery. Preserve the return destination.

Muscles use a clean front/back vector map with primary and supporting regions and a text equivalent. Hue plus intensity/pattern differentiates roles. “Areas worked” is a qualitative explanation, not measured activation or recovery. Keep full 3D anatomy behind an optional deeper Library view only if optimized and reviewed; it is not needed for launch.

### 8. Progress and history

Default view: weekly consistency, selected exercise trend, and recent sessions. Period controls: week/month/3 months/year. Strength and Run get separate metrics; a combined calendar is useful. A muscle coverage card shows logged working sets with a stated counting method, not anatomical heat implying tissue readiness.

Exercise trend exposes metric, unit, date and values; support list/table alternatives. Use one meaningful default metric per exercise type. History supports search, date/type filters, edit with audit semantics, repeat as a new session, notes, export and recoverable deletion. Changes invalidate affected derived records; no stale PR badges.

Empty states explain what unlocks a chart and link to an appropriate action. One session is a point, not an invented trend. Missing weeks are missing values, not automatically zero. No placeholder calories, sleep, VO2 max or readiness score.

### 9. Plans, programs and settings

Plan builder preserves current draft autosave, ordering, duplication and explicit activation. Add named blocks, rest, set type, timed/distance prescriptions, supersets, and date scheduling incrementally. Reordering must have button/keyboard alternatives to drag. Content updates do not rewrite a user's customized plan. Program enrollment captures a version; rescheduling changes the schedule, not completed history.

Settings: unit preferences, equipment locations, media/data saver, motion, audio/haptics, reminders, connected accounts, download management, privacy/export/import, account. Keep content credits in accessible detail/settings locations consistent with licenses. Include saved-on-device/sync state where it matters without letting a permanent status banner dominate every screen.

## Art direction: athletic editorial with precise instruments

The reference hierarchy translates to three visual modes within one system: photographic/editorial discovery, calm high-contrast training controls, and restrained analytical progress. Use the existing wordmark if retained by the owner; reduce excessive stretched/italic/condensed body typography and diagonal card cuts.

| Token / element | Proposed specification |
|---|---|
| Canvas | `#111010` charcoal |
| Surface / raised | `#1B1A19` / `#262423` |
| Primary text | `#F3F1ED` warm ivory |
| Secondary text | `#B9B4AE`; validate every actual foreground/background pair |
| Accent | `#FF692B` Kinset orange; dark text on filled accent buttons |
| Border | `#423E3B`; subtle structure, not the only control boundary |
| Warning / error | Separate amber / coral tokens, icon and text; no lime-as-universal-status |
| Display type | Existing Barlow Condensed bold can anchor large headings; use selectively |
| Interface type | Existing Barlow regular/medium or a chosen licensed, locally hosted equivalent; stable system fallback |
| Numerals | Tabular for timers, set values, pace and chart labels |
| Type scale | 14 metadata, 16 body/input, 20 section, 28–36 screen title, 48–80 editorial/time; responsive and zoomable |
| Spacing | 4/8/12/16/24/32/48; 20px phone page gutter; consistent 16–20px card padding |
| Corners | 16px cards, 12px controls, 24px sheets; pills reserved for chips/segmented controls |
| Targets | 48px minimum product target, 56px main training controls; separation for destructive actions |
| Icons | Existing Lucide with consistent stroke/size; always label unfamiliar actions |

**Accent correction, October 16:** this table originally specified electric lime
`#D5EB4B`, read from references that are all lime. The owner confirmed Kinset's brand
accent is **orange**, so the accent is the repository's existing `#FF692B` and the
neutrals above were retuned from green-leaning to warm-leaning to sit with it. Treat
every lime surface in `references/` as orange. See
[the reference notes](references/README.md).

Measured against these values: ivory on canvas 17.0:1, secondary on canvas 9.9:1, orange
on canvas 6.6:1, canvas text on filled orange 6.6:1 — all pass AA for normal text. Those
four pairs are computed, not sampled from a running build; every remaining pair still
needs checking in place.

This is a proposed token system, not a verified contrast audit. Aim for WCAG AA: normal text 4.5:1, large text 3:1; avoid faint gray labels copied from concept imagery. The 48px product target deliberately exceeds WCAG 2.2's 24 CSS-pixel minimum subject to exceptions. [Contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Build dark mode first. Add a complete light token set only after the core flow works; do not alternate unrelated dark/light themes within an active session. An ivory editorial panel is a deliberate surface treatment with checked contrast, not a second design system.

## Image direction and deliverables

- **Hero photography:** authentic athletes of varied bodies/ages, tight intentional crops with clear subject and negative space for type; charcoal/neutral training settings, natural skin, directional light. Preserve equipment and body mechanics. Compose mobile and desktop crops separately.
- **Instruction:** consistent camera height, background, framing and cadence; full relevant movement visible, equipment/contacts clear. Filmed humans preferred. Use professionally authored animations only after art-direction and technique review. A GIF can replace the rendering mechanism while still looking cheap; judge the content itself.
- **Program covers:** one coherent photographic series; abstract lime organic/point-cloud motifs permitted for mobility/editorial content. No generic stock collage. Brand art and instruction are separate asset roles.
- **No instructional AI video as a shortcut:** generated imagery can support non-instructional brand exploration, but it cannot establish correct technique. Do not claim any generated asset was reviewed by a trainer.
- **Asset manifest:** creator/source, rights, expiration, permitted transformations, dimensions, crop focal point, alt text, poster, variants and approval status. No hotlinking arbitrary search images or copying the references into production.

Produce six coherent program covers, a small hero-photo set, consistent exercise posters/loops, an original licensed front/back muscle map, and a limited brand texture family. Missing assets should lead to a calm honest fallback, not mismatched random visuals.

## Motion specification

| Trigger | Treatment | Proposed duration / behavior |
|---|---|---|
| Press | Subtle scale/color response | 80–120ms; no delayed action |
| Set completion | Check and row emphasis; optional haptic | 140–180ms; persistence runs independently |
| Sheet | Short translate + fade; focus retained/trapped appropriately | 220–280ms, interruptible |
| Exercise switch | Brief crossfade preserving layout | 160–200ms; no sweeping carousel |
| Rest | Stable tabular digits; subtle progress sweep | Clock-derived; no bouncing each second |
| Summary | One completion mark / short draw | 300–450ms once; no repeated confetti |
| Chart period | Transition existing data where understandable | 180–240ms; no invented interpolation points |

Use CSS for simple feedback and [Motion for React](https://motion.dev/docs/react) only where coordinated sheets/layout transitions justify it. Respect reduced motion: remove translations/scaling, avoid autoplay, provide posters and user-triggered playback. Do not announce every timer tick through a screen reader. Announce meaningful transitions once. Nothing essential relies on animation, color, swipe, or hover.

## Usability acceptance tasks

Test the complete slice with at least five people spanning beginner/returning/regular lifters before claiming it is validated. Proposed targets, not current results:

1. Identify and start the next workout within 15 seconds without assistance.
2. Log a familiar suggested set with one confirmation; correct values with no more than two field edits.
3. Open technique help and return to the same set without losing input or timer state.
4. Replace occupied equipment in three clear decisions and explain what changed.
5. Recover from an app interruption with no confirmed work lost.
6. Explain a progress chart and distinguish a suggestion from a recorded result.

Test 320/390/430px phones, tablet and desktop; large text, keyboard open, screen reader, reduced motion, low bandwidth and outdoor contrast. Record task failures and change the design; visual polish alone does not meet the UX bar.
