# Research sources and decision record

Accessed October 16, 2026. Primary sources only for product/platform claims. Provider statements describe their offering; they are not an independent quality assessment. Commercial terms, quotas, pricing and SDK compatibility must be reconfirmed at procurement/integration time. No accounts were created, vendors contacted, subscriptions purchased or media downloaded in this research.

## Product benchmarks

| Source | Observation | Kinset design inference |
|---|---|---|
| [Nike: what NTC offers](https://www.nike.com/help/a/ntc-info/app) | Describes class-led workouts, structured whiteboard workouts, drill videos and programs | Separate workout execution from optional technique help; offer both rep-based and guided timed modes |
| [Hevy feature inventory](https://www.hevyapp.com/features/) | Lists previous values, rest timers, set types, supersets, effort logging, exercise trends and muscle-distribution views | These are useful depth benchmarks for the journal; they do not require copying its social product |
| [Strava upload documentation](https://developers.strava.com/docs/uploads/) | Describes interoperable activity upload | Treat integration as an optional export path, not a dependency for recording |

These are documentation comparisons, not hands-on competitive usability studies. The four-tab architecture, catalog target, visual tokens and prioritization are this brief's recommendations. They are not facts attributed to Nike, Hevy or Strava.

## Media and licensing

| Source | Use in this brief |
|---|---|
| [MuscleWiki API](https://api.musclewiki.com/) | Video/data capabilities and plan feature distinctions |
| [MuscleWiki pricing](https://api.musclewiki.com/pricing) | Observed plan prices and call quotas |
| [MuscleWiki API terms](https://api.musclewiki.com/api-terms) | Storage, delivery, branding and attribution constraints; page says updated October 8, 2026 |
| [MuscleWiki API documentation](https://api.musclewiki.com/docs) | Candidate integration surface; actual paid API responses were not tested |
| [Gym Visual license](https://gymvisual.com/content/9-license) | Purchased asset use and restrictions; written clarification needed for exact distribution model |
| [Gym Visual catalog](https://gymvisual.com/13-media-content) | Animation/video offering and indicative item prices |
| [ExerciseDB free V1 docs](https://oss.exercisedb.dev/docs) | Free dataset scope and stated non-commercial restriction |
| [AscendAPI ExerciseDB terms](https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356) | Persistent-storage restrictions; ensure terms match the exact contracted offering |
| [wger documentation](https://wger.readthedocs.io/en/stable/) | Code/content licensing distinction; individual media still needs verification |

The chosen brand direction favors filmed human movement. That preference is an art-direction judgment, not a finding that every animation is inaccurate. Buying a library does not remove the need to review the exact variation and technique.

## Running and native lifecycle

| Source | Use in this brief |
|---|---|
| [W3C Geolocation](https://www.w3.org/TR/geolocation/) | Browser visibility/permission constraints |
| [Capacitor geolocation](https://next.capacitorjs.com/docs/apis/geolocation) | Standard plugin's stated lack of direct background support; v8 documentation branch viewed |
| [Community background geolocation](https://github.com/capacitor-community/background-geolocation) | Candidate plugin, explicit compatibility/lifecycle caveats |
| [Apple background location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background) | Native background-session capabilities and lifecycle |
| [Apple location authorization](https://developer.apple.com/documentation/CoreLocation/requesting-authorization-to-use-location-services) | Permission scope and runtime behavior |
| [Apple location energy guidance](https://developer.apple.com/documentation/xcode/accessing-the-device-s-location-efficiently) | Sampling/battery tradeoffs |
| [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types) | Location service declarations and prerequisites |
| [Android foreground startup restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start) | Starting services in permitted lifecycle states |
| [Strava uploads](https://developers.strava.com/docs/uploads/) | Async upload and compatible formats |
| [Strava limits/capacity](https://developers.strava.com/docs/rate-limits/) | Review/capacity and quota dependency |
| [Strava getting started](https://developers.strava.com/docs/getting-started/) | OAuth/webhook integration guidance |
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) | Web map-rendering candidate; tiles/provider terms remain a separate selection |

## UI and web infrastructure

| Source | Use in this brief |
|---|---|
| [Motion for React](https://motion.dev/docs/react) | Optional coordinated React animation |
| [Vite PWA](https://vite-pwa-org.netlify.app/guide/) | Candidate build-aware precache/update integration |
| [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Text contrast baseline |
| [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Minimum target standard, distinct from Kinset's larger product target |

## What remains unknown

- Actual user task performance and preferences beyond the request; proposed usability study is not yet run.
- Final human-media quality/coverage, licensed offline rights, supplier response and negotiated costs.
- Qualified reviewer approval of exercises, muscle mappings, workout prescriptions and program progression.
- Live account creation/confirmation/reset/deletion behavior and production email delivery.
- Production offline cold reopen and safe updating across devices.
- Native plugin compatibility, locked-screen durability, GPS accuracy and battery performance on target devices.
- App-store submission requirements for the selected final implementation, and Strava production access approval.

Resolve these narrowly at the relevant delivery gate. They do not justify repeating the whole repository audit or withholding the implementation of independent work.
