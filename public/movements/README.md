# Movement media

Drop a GIF or short video library in here and the app will use it. Nothing else needs
changing: `manifest.json` maps Kinset exercise IDs onto assets, and every player reads
from it.

The manifest ships empty because no media is licensed yet. With no entries, the app
falls back to the written guides, which is a supported state rather than a broken one.

## Adding assets

1. Put files in this directory (or point `src` at a supplier URL).
2. Add an entry per movement to `manifest.json`.
3. Run `npm run check:media` — it fails on unknown IDs, missing provenance, and
   rights contradictions.

```json
{
  "version": 1,
  "entries": [
    {
      "exerciseId": "goblet",
      "kind": "gif",
      "src": "goblet.gif",
      "poster": "goblet.jpg",
      "width": 600,
      "height": 600,
      "attribution": "© Example Media Ltd, used under licence",
      "licenseId": "examplemedia-2026-commercial",
      "provider": "examplemedia",
      "providerAssetId": "12345",
      "deliveryMode": "owned",
      "offlineAllowed": true,
      "rightsCheckedAt": "2026-10-16",
      "techniqueReviewed": false
    }
  ]
}
```

## The fields that are not optional in practice

- **`licenseId`** — provenance. The check script refuses an entry without it.
- **`deliveryMode`** — `owned` may be cached and bundled into an offline pack;
  `streamOnly` may not. Several candidate suppliers forbid storing video at all, so
  `streamOnly` + `offlineAllowed: true` is rejected as a contradiction.
- **`expiresAt`** — for signed or time-limited URLs. An expired asset is reported to the
  user as expired rather than rendering as a broken image.
- **`techniqueReviewed`** — false until someone qualified has actually watched the clip
  and confirmed it shows the movement correctly. The player says so when it is false.

## Choosing a source

`docs/redesign-2026-10-16/03-content-and-media.md` compares the candidates and their
terms as of October 2026. The short version:

- Commissioned or negotiated downloadable clips are the preferred end state, because
  they are the only option that reliably supports offline instruction.
- MuscleWiki's standard terms permit video playback buffers only, which makes it an
  online source — set `deliveryMode: "streamOnly"`.
- ExerciseDB's free tier is documented as non-commercial, and the paid terms restrict
  persistent storage.
- wger separates AGPL code from CC BY-SA content; individual assets still need checking,
  and share-alike obligations travel with them.

Re-check any supplier's terms at contract time. The notes above are a reading of
published pages on a particular date, not legal advice, and they are not a substitute
for asking the vendor the questions listed in the brief.
