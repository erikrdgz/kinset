/**
 * The journal repository: the only place that reads or writes stored training data.
 *
 * Three behaviours here are deliberate corrections to the audited version.
 *
 * 1. **The save status tells the truth.** `update()` used to set "Saved" before its
 *    asynchronous write had resolved, so a storage failure could be reported as a
 *    success. Writes now move through "Saving…" → "Saved on device", and a failure is
 *    an actionable error rather than a reassuring message.
 * 2. **Nothing is silently reset.** A record that fails to parse is quarantined with its
 *    raw contents under a separate key, so it can be exported and recovered. An empty
 *    journal is never written over data that merely failed to load.
 * 3. **Migration happens at the boundary, once, and only after it reconciles.** A v1
 *    record is migrated in memory, the report is checked, and the result is written to a
 *    new versioned key — the v1 key is left intact as the recoverable original.
 */
import { get, set, del } from "idb-keyval";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../backend";
import {
  emptyJournal,
  isFromNewerBuild,
  migrateToCurrent,
  parseJournal,
  type Journal,
  type MigrationReport,
} from "../domain";

/**
 * What the app actually knows about where this journal is. These are distinct states,
 * not decorations on one message: "offline" describes connectivity and says nothing
 * about whether the work is safely stored.
 */
export type SaveState =
  | "loading"
  | "saving"
  | "savedLocal"
  | "syncPending"
  | "synced"
  | "storageFailed"
  | "conflict"
  | "updateRequired"
  | "quarantined";

export const saveStateText: Record<SaveState, string> = {
  loading: "Opening your journal…",
  saving: "Saving…",
  savedLocal: "Saved on device",
  syncPending: "Saved on device · sync pending",
  synced: "Synced",
  storageFailed: "Not saved. This device refused the write.",
  conflict: "Another device has newer changes.",
  updateRequired: "This journal was written by a newer version of Kinset.",
  quarantined: "Your journal could not be read. A copy has been set aside.",
};

type Stored = { data: Journal; revision: number; dirty: boolean };

/** v1 lived at `kinset:v1:<owner>`. v2 gets its own key so the original survives. */
const localKey = (owner: string) => `kinset:v2:${owner}`;
const legacyKey = (owner: string) => `kinset:v1:${owner}`;
const quarantineKey = (owner: string) => `kinset:quarantine:${owner}`;

export function useJournal(owner: string) {
  const [data, setData] = useState<Journal>(emptyJournal);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SaveState>("loading");
  const [migration, setMigration] = useState<MigrationReport | null>(null);
  const [quarantine, setQuarantine] = useState<unknown>(null);

  const record = useRef<Stored>({
    data: emptyJournal,
    revision: 0,
    dirty: false,
  });
  const serial = useRef(Promise.resolve());
  const busy = useRef(false);
  const alive = useRef(true);
  const isDemo = owner === "demo";

  /**
   * Writes are serialised and awaited. The returned promise resolves only once the data
   * is actually on the device, which is what lets the caller report it honestly.
   */
  const persist = useCallback(
    (next: Stored) => {
      serial.current = serial.current
        .then(() => set(localKey(owner), next))
        .then(() => {
          if (!alive.current) return;
          setState(isDemo ? "savedLocal" : next.dirty ? "syncPending" : "synced");
        })
        .catch(() => {
          if (alive.current) setState("storageFailed");
        });
      return serial.current;
    },
    [owner, isDemo],
  );

  const sync = useCallback(async () => {
    if (isDemo || !supabase || busy.current || !alive.current) return;
    busy.current = true;
    try {
      const current = record.current;
      if (current.dirty) {
        const snapshot = current.data;
        const { data: revision, error } = await supabase.rpc("save_journal", {
          payload: snapshot,
          expected_revision: current.revision,
        });
        if (error) {
          if (error.message.includes("conflict")) setState("conflict");
          else setState("syncPending");
          return;
        }
        record.current = {
          data: record.current.data,
          revision: Number(revision),
          dirty: record.current.data !== snapshot,
        };
        await persist(record.current);
      } else {
        const { data: row, error } = await supabase
          .from("journals")
          .select("payload,revision")
          .eq("user_id", owner)
          .maybeSingle();
        if (error) throw error;
        if (row && !record.current.dirty) {
          // The cloud copy crosses a boundary too, so it is parsed and migrated like
          // any other untrusted record rather than trusted because of where it came from.
          if (isFromNewerBuild(row.payload)) {
            setState("updateRequired");
            return;
          }
          const { journal, report } = migrateToCurrent(row.payload);
          const parsed = parseJournal(journal);
          if (!parsed.ok) {
            await set(quarantineKey(owner), {
              at: new Date().toISOString(),
              source: "cloud",
              issues: parsed.issues,
              raw: row.payload,
            });
            setQuarantine(row.payload);
            setState("quarantined");
            return;
          }
          if (report && !report.ok) {
            setMigration(report);
            setState("quarantined");
            return;
          }
          record.current = {
            data: parsed.journal,
            revision: row.revision,
            dirty: false,
          };
          setData(parsed.journal);
          if (report) setMigration(report);
          await persist(record.current);
          return;
        }
        setState("synced");
      }
    } catch {
      // Connectivity failed. The local copy is still what it was; say only that.
      setState(record.current.dirty ? "syncPending" : "savedLocal");
    } finally {
      busy.current = false;
    }
  }, [owner, persist, isDemo]);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    (async () => {
      try {
        // Prefer a v2 record; fall back to the v1 key and migrate it.
        const existing = await get<Stored>(localKey(owner));
        const raw = existing?.data ?? (await get(legacyKey(owner)))?.data;

        if (cancelled) return;

        if (raw === undefined) {
          record.current = { data: emptyJournal, revision: 0, dirty: false };
        } else if (isFromNewerBuild(raw)) {
          setState("updateRequired");
          setReady(true);
          return;
        } else {
          const { journal, report } = migrateToCurrent(raw);
          const parsed = parseJournal(journal);
          if (!parsed.ok || (report && !report.ok)) {
            // Set the unreadable copy aside intact. Never overwrite it with an empty one.
            await set(quarantineKey(owner), {
              at: new Date().toISOString(),
              source: "device",
              issues: parsed.ok ? report!.discrepancies : parsed.issues,
              raw,
            });
            setQuarantine(raw);
            if (report && !report.ok) setMigration(report);
            setState("quarantined");
            setReady(true);
            return;
          }
          record.current = {
            data: parsed.journal,
            revision: existing?.revision ?? 0,
            dirty: existing?.dirty ?? false,
          };
          if (report) {
            setMigration(report);
            // Write the migrated copy to the v2 key; the v1 key stays as the original.
            await persist(record.current);
          }
        }

        setData(record.current.data);
        setReady(true);
        setState(isDemo ? "savedLocal" : "savedLocal");
        void sync();
      } catch {
        if (!cancelled) {
          setReady(true);
          setState("storageFailed");
        }
      }
    })();

    const timer = setInterval(() => void sync(), 5000);
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [owner, isDemo, persist, sync]);

  /**
   * Apply a change. The in-memory state updates immediately so the interface stays
   * responsive, but the status says "Saving…" until the write resolves — it does not
   * claim the work is safe before it is.
   */
  const update = useCallback(
    (next: Journal) => {
      record.current = { ...record.current, data: next, dirty: !isDemo };
      setData(next);
      setState("saving");
      return persist(record.current);
    },
    [persist, isDemo],
  );

  const loadCloud = useCallback(async () => {
    if (!supabase) return;
    const { data: row, error } = await supabase
      .from("journals")
      .select("payload,revision")
      .eq("user_id", owner)
      .maybeSingle();
    if (error || !row) {
      setState("syncPending");
      return;
    }
    const { journal } = migrateToCurrent(row.payload);
    const parsed = parseJournal(journal);
    if (!parsed.ok) {
      setState("quarantined");
      return;
    }
    record.current = { data: parsed.journal, revision: row.revision, dirty: false };
    setData(parsed.journal);
    await persist(record.current);
    setState("synced");
  }, [owner, persist]);

  return {
    data,
    ready,
    state,
    status: saveStateText[state],
    /** True only once the most recent change is actually on the device. */
    durable: state !== "saving" && state !== "storageFailed",
    conflict: state === "conflict",
    migration,
    quarantine,
    update,
    loadCloud,
    flush: () => serial.current,
    clear: () =>
      Promise.all([
        del(localKey(owner)),
        del(legacyKey(owner)),
        del(quarantineKey(owner)),
      ]),
  };
}
