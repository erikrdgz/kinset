# Running: product and technical specification

## Decision

Running belongs in Kinset, but it is a substantial recording feature. A map and a browser location watcher are insufficient for the expectation “start a run, lock my phone, and trust the result.”

Keep web support for run history, manual runs and planning. For reliable phone recording, add a native recording service. Recommended first investigation: a Capacitor shell around the existing React app with native-owned durable location capture. Compare against a React Native client only if wrapper interaction/performance or plugin quality fails the feasibility gate; avoid a speculative full rewrite.

The web Geolocation specification waits for visibility in relevant acquisition paths, and browsers are not a reliable screen-locked recorder. Apple's native location APIs provide background workout support with appropriate configuration; Android requires the appropriate location foreground service and permissions. The standard Capacitor geolocation plugin explicitly lacks direct background support. [W3C Geolocation](https://www.w3.org/TR/geolocation/), [Apple background location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background), [Android service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [Capacitor geolocation](https://next.capacitorjs.com/docs/apis/geolocation).

A wrapper is only viable when location recording continues and persists while its web view is suspended. Evaluate compatible maintained plugins or a small native implementation; the community background-geolocation project's documentation includes version and Android bridge caveats. Do not assume compatibility with the newest Capacitor version. [Community plugin](https://github.com/capacitor-community/background-geolocation).

## Native feasibility gate

Prove a user-initiated run on physical iPhone and Android: lock screen, switch apps, disable networking, receive a call, pause/resume, reconnect and recover the recorded route. Confirm native persistence independently of React execution. Verify platform-specific behavior on process termination and force quit; never promise continuous capture through states the OS forbids. Recovery preserves captured work and shows a gap rather than fabricating a continuous track.

Start with the user's foreground action and the least permission scope that actually supports the intended recording. Background recording does not automatically imply a blanket “Always” location request on every platform. Follow current OS/version requirements and make the ongoing recording visible. Android service startup and while-in-use restrictions must be handled. [Apple authorization](https://developer.apple.com/documentation/CoreLocation/requesting-authorization-to-use-location-services), [Android startup restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

## Experience

**Before:** Train → Run. Show Outdoor run / Walk / Manual activity. Explain location access at first use, then GPS acquisition/quality and a prominent Start. Offer start without GPS as a clearly time-only session. No permission prompt during general onboarding.

**During:** distance and elapsed/active time are primary; average pace and current smoothed pace secondary. A route map is optional on the recording screen so metrics remain legible outdoors. Large pause control; finish separated from pause. Optional audio splits, haptics, km/mi and screen-lock controls. Show weak GPS or temporary gaps without alarming full-screen interruptions. No automatic social sharing.

**Paused:** unmistakable state, Resume and Finish. First release uses manual pause; auto-pause can follow real-world validation. Distinguish timer-active time from moving time; do not change one based on an undocumented speed threshold.

**After:** route, distance, elapsed/active time, average pace, splits, quality notes, effort/notes, and save. Elevation only if source/filter quality supports it; omit guessed calories/VO2 estimates. Edit title/notes/privacy, export or share intentionally. Include strength and runs in the weekly calendar without mixing their metrics.

**Permission denied/GPS unavailable:** preserve useful manual/timer recording and an explanation. If precise accuracy is unavailable, label limitations. A blank map or unavailable tile service must not stop recording.

## Recorder and data contract

State machine: `idle → acquiring → recording ↔ paused → finishing → saved`, with recoverable interrupted/error states. Persist every transition. Start/stop is idempotent; restarting the UI attaches to the existing native session instead of creating a second watcher.

Store an activity summary plus append-only sample chunks. Each sample includes activity ID, monotonic sequence, timestamp, latitude/longitude, horizontal accuracy, and available altitude/vertical accuracy/speed/bearing/source. Preserve raw source samples privately for recalculation; filtered/derived tracks have a calculation-version marker. Check sequence IDs to deduplicate replayed native events.

The native service writes small durable batches independently of network and JavaScript; choose/checkpoint intervals based on measured loss/battery tradeoffs. Persist pause intervals and last sequence. Sync chunks via a resumable outbox after recording can safely proceed offline. Do not upload the entire growing route repeatedly or put it into the existing 5MB journal JSON.

Distance is the sum of accepted consecutive segments. Filter invalid timestamps, impossible jumps and poor-accuracy samples with tested rules; retain quality flags and avoid interpolating across long gaps. Use smoothing for current pace, not to falsify raw data. Split computation should handle boundary crossing and units deterministically. Mark questionable sections and partial distance. Never snap runners across unmapped shortcuts or roads simply to make the route prettier.

Proposed initial sampling/accuracy thresholds must be tuned against walking/running speeds, tunnels, turns, urban canyons and battery consumption; do not hard-code an unvalidated “one update per second is always best” rule. Stop location services promptly when recording ends. [Apple energy guidance](https://developer.apple.com/documentation/xcode/accessing-the-device-s-location-efficiently).

## Maps and privacy

[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) is a reasonable web history-map renderer. It does not supply GPS capture, hosted tiles, geocoding, offline rights or unlimited map usage. Choose a licensed tile/style provider, display attribution, budget requests and validate caching rights. A native map renderer can be selected at the native gate; neither selection should dictate the run data model.

Routes are private by default. Give users separate controls for cloud sync, export and sharing. Before sharing, hide start/end areas using a configurable radius and account for routes that loop back through those areas; trim all sensitive segments, not just the first/last point. Offer a no-map card. Preview the exact shared output. Privacy trimming reduces exposure but cannot guarantee anonymity.

Raw GPX/FIT export may disclose exact locations: clearly distinguish it from a privacy-trimmed share image/export and require an explicit user choice. Keep precise coordinates out of analytics, crash logs, public URLs and thumbnail metadata. Deleting an activity must also delete its route objects and derived shared artifacts under the product's control. Local-only routes remain a supported choice if cloud sync is declined.

## Strava: optional interoperability, not the recorder

Record Kinset-owned activities first. Phase one export: user-selected GPX/FIT as appropriate, with timestamps and privacy choice. Phase two: OAuth connection and a user-requested or opt-in upload queue. Keep tokens server-side/encrypted, request minimal scopes, handle revocation and prevent duplicate uploads. Authentication, upload processing and retry failures get explicit user states.

Strava supports asynchronous uploads and documents compatible formats. Its current application-capacity/review process can limit rollout; do not make Kinset recording depend on approval. Use webhooks for deauthorization and relevant activity changes if importing data. Imported records retain provenance and deduplication keys. [Uploads](https://developers.strava.com/docs/uploads/), [capacity/rate limits](https://developers.strava.com/docs/rate-limits/), [webhook guidance](https://developers.strava.com/docs/getting-started/).

“Like Strava” means credible route recording and useful performance summaries in this scope. Segments, leaderboards, public feed, clubs, route recommendations and social graph are separate later products. HealthKit/Health Connect/watch support should follow the same provenance, consent and duplicate-prevention rules.

## Field acceptance matrix

| Scenario | Required result |
|---|---|
| 30–60m screen-locked run | Route/clock continue under supported OS conditions; compare to known course/reference device |
| Network loss / unavailable tiles | Local capture continues; later upload is resumable and once-only |
| Switch apps / call / low-power mode | Captured work retained; any OS interruption represented honestly |
| Manual pause at stoplight | Pause interval correct; no distance from stationary drift; resume explicit |
| Tunnel / tall buildings | Gap/quality flag; no implausible straight-line jump or invented precision |
| Force quit / reboot | Captured route recoverable on reopening; limitation explained; no claim of guaranteed continuity |
| Permission revoked mid-run | Recording state accurate; no endless request loop; existing activity preserved |
| Retry finish / duplicate events | One activity, ordered deduplicated samples, no doubled distance |
| Route sharing / loop through home | Trimming covers sensitive sections; exported output matches preview |
| Delete / disconnect / sign out | Location service stops appropriately; route/token cleanup follows explicit lifecycle |

Proposed acceptance targets: outdoor distance error within roughly 3% on an open-sky known course across repeated runs; no silent unexplained route loss; battery impact measured across at least an older and a current phone per supported OS. These are engineering targets to validate, not a claim that phone GPS can meet them in all environments. Publish supported behavior and limitations from measured results.
