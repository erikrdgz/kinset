import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptSample,
  newRun,
  type RouteSample,
  type RunActivity,
} from "../../domain/running";
import {
  commitRun,
  loadActiveRun,
  saveActiveRun,
} from "../../data/runs";

/**
 * The web run recorder.
 *
 * This is a foreground recorder and it says so everywhere it surfaces. The Geolocation
 * specification lets a browser stop delivering positions when the page is not visible,
 * and no browser is a dependable screen-locked tracker — so this cannot honestly promise
 * "start it and pocket the phone". The brief gates that promise on a native recording
 * service, behind a field-test matrix on real hardware.
 *
 * What it does do properly: the state machine from the specification, with every
 * transition checkpointed to durable storage, idempotent start and finish, a single
 * watcher per session, and honest reporting of permission and accuracy failures.
 */
export type RecorderState =
  | "idle"
  | "acquiring"
  | "recording"
  | "paused"
  | "finishing"
  | "error";

export type RecorderError =
  | "permissionDenied"
  | "unavailable"
  | "unsupported"
  | "timeout";

export const recorderErrorText: Record<RecorderError, string> = {
  permissionDenied:
    "Location access was declined, so the route cannot be recorded. You can still record this as a timed session.",
  unavailable:
    "Your device could not get a position. You can still record this as a timed session.",
  unsupported:
    "This browser does not provide location access. You can still record a timed session or enter a run by hand.",
  timeout:
    "Waiting for a position took too long. Moving outdoors usually helps.",
};

/** Checkpoint at least this often, so a crash costs seconds rather than a whole run. */
const CHECKPOINT_SAMPLES = 5;

export function useRunRecorder(owner: string) {
  const [state, setState] = useState<RecorderState>("idle");
  const [activity, setActivity] = useState<RunActivity | null>(null);
  const [error, setError] = useState<RecorderError | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  /** True once the page has been hidden during a recording. */
  const [wasInterrupted, setWasInterrupted] = useState(false);

  const watchId = useRef<number | null>(null);
  const seq = useRef(0);
  const sinceCheckpoint = useRef(0);
  const current = useRef<RunActivity | null>(null);

  const write = useCallback(
    (next: RunActivity | null) => {
      current.current = next;
      setActivity(next);
      void saveActiveRun(owner, next);
    },
    [owner],
  );

  /** Recover an interrupted recording on mount rather than losing it. */
  useEffect(() => {
    let live = true;
    void loadActiveRun(owner).then((found) => {
      if (!live || !found) return;
      current.current = found;
      setActivity(found);
      seq.current = found.samples.reduce((n, s) => Math.max(n, s.seq), 0) + 1;
      // It comes back paused: the user decides whether to continue, because the app
      // cannot know what happened while it was not running.
      setState("paused");
      setWasInterrupted(true);
    });
    return () => {
      live = false;
    };
  }, [owner]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      setAccuracy(position.coords.accuracy);
      const run = current.current;
      if (!run || run.status !== "recording") return;

      const sample: RouteSample = {
        seq: seq.current++,
        t: position.timestamp,
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        verticalAccuracy: position.coords.altitudeAccuracy ?? undefined,
        speed: position.coords.speed ?? undefined,
        heading: position.coords.heading ?? undefined,
      };

      const previous = run.samples[run.samples.length - 1] ?? null;
      const { accept, reason } = acceptSample(sample, previous);
      const next: RunActivity = accept
        ? { ...run, samples: [...run.samples, sample] }
        : {
            ...run,
            // A rejected fix is counted so the summary can report poor reception
            // rather than presenting a confident wrong distance.
            rejected: reason
              ? { ...run.rejected, [reason]: (run.rejected[reason] ?? 0) + 1 }
              : run.rejected,
          };

      current.current = next;
      setActivity(next);
      setState("recording");

      sinceCheckpoint.current += 1;
      if (sinceCheckpoint.current >= CHECKPOINT_SAMPLES) {
        sinceCheckpoint.current = 0;
        void saveActiveRun(owner, next);
      }
    },
    [owner],
  );

  const onError = useCallback((e: GeolocationPositionError) => {
    setError(
      e.code === e.PERMISSION_DENIED
        ? "permissionDenied"
        : e.code === e.TIMEOUT
          ? "timeout"
          : "unavailable",
    );
    setState((s) => (s === "acquiring" ? "error" : s));
  }, []);

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("unsupported");
      setState("error");
      return false;
    }
    if (watchId.current !== null) return true; // One watcher, however often this is called.
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    });
    return true;
  }, [onPosition, onError]);

  /** Start, or attach to an existing recording. Safe to call twice. */
  const start = useCallback(
    (type: "run" | "walk") => {
      if (current.current && current.current.status === "recording") {
        setState("recording");
        return;
      }
      setError(null);
      setWasInterrupted(false);
      const run = newRun(type, "gps");
      seq.current = 0;
      sinceCheckpoint.current = 0;
      write(run);
      setState("acquiring");
      startWatch();
    },
    [startWatch, write],
  );

  const pause = useCallback(() => {
    const run = current.current;
    if (!run || run.status !== "recording") return;
    stopWatch();
    const intervals = run.intervals.slice();
    const last = intervals[intervals.length - 1];
    if (last && !last.endedAt)
      intervals[intervals.length - 1] = {
        ...last,
        endedAt: new Date().toISOString(),
      };
    write({ ...run, status: "paused", intervals });
    setState("paused");
  }, [stopWatch, write]);

  const resume = useCallback(() => {
    const run = current.current;
    if (!run || run.status === "finished") return;
    write({
      ...run,
      status: "recording",
      intervals: [...run.intervals, { startedAt: new Date().toISOString() }],
    });
    setState("acquiring");
    setWasInterrupted(false);
    startWatch();
  }, [startWatch, write]);

  /** Finish and commit. Idempotent: a retry or double tap yields one activity. */
  const finish = useCallback(
    async (title?: string, note?: string) => {
      const run = current.current;
      if (!run) return null;
      stopWatch();
      setState("finishing");

      const now = new Date().toISOString();
      const intervals = run.intervals.slice();
      const last = intervals[intervals.length - 1];
      if (last && !last.endedAt)
        intervals[intervals.length - 1] = { ...last, endedAt: now };

      const finished: RunActivity = {
        ...run,
        status: "finished",
        finishedAt: run.finishedAt ?? now,
        intervals,
        title: title?.trim() || run.title,
        note: note?.trim() || run.note,
      };
      await commitRun(owner, finished);
      current.current = null;
      setActivity(null);
      setState("idle");
      return finished;
    },
    [owner, stopWatch],
  );

  const discard = useCallback(async () => {
    stopWatch();
    current.current = null;
    setActivity(null);
    setState("idle");
    await saveActiveRun(owner, null);
  }, [owner, stopWatch]);

  /**
   * Note when the page is hidden mid-recording. The browser may stop delivering
   * positions, and the honest response is to tell the user there may be a gap — not to
   * draw a straight line through it.
   */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && current.current?.status === "recording")
        setWasInterrupted(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Location services stop as soon as the component goes away.
  useEffect(() => stopWatch, [stopWatch]);

  return {
    state,
    activity,
    error,
    accuracy,
    wasInterrupted,
    start,
    pause,
    resume,
    finish,
    discard,
  };
}
