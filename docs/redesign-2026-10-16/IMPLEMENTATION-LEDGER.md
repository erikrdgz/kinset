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
| K13–K15 running, Strava, health | Gated on native background-recording field tests (05-running.md). No run UI is presented as working GPS. |

## Done

_(evidence recorded as work lands)_

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
| Real-device performance budgets | Measure on an agreed midrange phone |
| Usability targets in 02 §"Usability acceptance tasks" | A study with at least five lifters |
| Exercise technique and muscle attribution | Qualified reviewer sign-off |
| Live account lifecycle | Real signup, confirm, reset, delete against production email |

## Coverage counts

| Measure | Now | Full-redesign target (03) |
|---|---:|---:|
| Published movements | 30 | 90 |
| Movements with enriched structured metadata | 30 | 90 |
| Movements with reviewed filmed instruction | 0 | 90 |
| Published workout templates | 0 | 24 |
| Programs | 0 | 6 |
