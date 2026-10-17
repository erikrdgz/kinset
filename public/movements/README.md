# Movement media

The initial collection covers **29 exact exercise variations**: 16 real films by Goulart
via wger and 13 pairs of static illustrations from Everkinetic. Both sources offer the
selected assets under CC BY-SA 4.0. Every source record, original URL, original SHA256,
licence and adaptation note is retained in `provenance.json`; human-readable attribution
is in `CREDITS.md`. The films and extracted posters remain CC BY-SA 4.0. This licence
applies to those media files, not unrelated application code.

Films are 640px H.264, 24 fps, 7–14 seconds, 268–871KB each. They load only on playback;
there is no autoplay, including when reduced motion is not enabled. Native controls,
pause/resume and half-speed are available. Films repeat after the user starts playback. Leaving the visible player or browser tab
pauses playback. The drawings show two manually selected positions and are explicitly
labelled as illustrations, never as film or an animated demonstration. No procedural
3D loads in this learning view. Uncovered movements retain their written guides.

## Matching and review

Assets were inspected for the correct movement, equipment and variation. Source
metadata alone was insufficient: a video labelled seated leg curl showed knee extension,
and a supposed unassisted pull-up was indistinguishable from the assisted variation.
Those clips were rejected. A seated dumbbell shoulder press is mapped only to
`seatedpress`, never to a standing press. The seated reverse fly has its own catalog ID.
A seated option is explicitly labelled on the overhead dumbbell triceps extension.

No asset is marked `techniqueReviewed`: that flag requires a qualified reviewer.
Provider terms and source attribution were checked on 2026-10-16.

## Manifest contract

`manifest.json` maps stable Kinset exercise IDs to independently licensed assets. Each
entry includes `kind`, `src`, an optional static `poster`, and optional `frames` for
manually selected images. Creative Commons entries require `attribution`, `sourceUrl`,
`licenseId`, `licenseUrl` and `changes`; the player exposes them with every demonstration.

`deliveryMode: "owned"` means the app may host/cache its copy, not that Kinset claims
copyright ownership. `streamOnly` plus `offlineAllowed: true` is prohibited. Signed
sources can use `expiresAt`. Run `npm run check:media` after adding or changing assets;
it checks IDs, provenance, posters, image positions and local files.

The source investigation in `docs/redesign-2026-10-16/03-content-and-media.md` remains
useful for expansion: broad commercial GIF libraries are generally paid. ExerciseDB's
free offering and third-party scraped mirrors were not used. Neither paid-provider
footage nor uncertainly licensed illustrations were downloaded into this collection.
