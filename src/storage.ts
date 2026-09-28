import { get, set, del } from "idb-keyval";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./backend";
import { emptyState, type State } from "./domain";
type Stored = { data: State; revision: number; dirty: boolean };
export function useJournal(owner: string) {
  const [data, setData] = useState<State>(emptyState),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("Loading…"),
    [conflict, setConflict] = useState(false);
  const record = useRef<Stored>({
      data: emptyState,
      revision: 0,
      dirty: false,
    }),
    serial = useRef(Promise.resolve()),
    busy = useRef(false),
    alive = useRef(true);
  const key = `kinset:v1:${owner}`;
  const persist = useCallback(
    (r: Stored) => {
      serial.current = serial.current
        .then(() => set(key, r))
        .catch(() => {
          setStatus("Device storage unavailable. Keep this tab open.");
        });
      return serial.current;
    },
    [key],
  );
  const sync = useCallback(async () => {
    if (owner === "demo" || !supabase || busy.current || !alive.current) return;
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
          if (error.message.includes("conflict")) {
            setConflict(true);
            setStatus("Another device has newer changes.");
          } else setStatus("Saved on device · sync pending");
          return;
        }
        record.current = {
          data: record.current.data,
          revision: Number(revision),
          dirty: record.current.data !== snapshot,
        };
        await persist(record.current);
        setStatus(
          record.current.dirty ? "Saved on device · sync pending" : "Synced",
        );
      } else {
        const { data: row, error } = await supabase
          .from("journals")
          .select("payload,revision")
          .eq("user_id", owner)
          .maybeSingle();
        if (error) throw error;
        if (row && !record.current.dirty) {
          record.current = {
            data: row.payload as State,
            revision: row.revision,
            dirty: false,
          };
          setData(record.current.data);
          await persist(record.current);
        }
        setStatus("Synced");
      }
    } catch {
      setStatus("Saved on device · offline");
    } finally {
      busy.current = false;
    }
  }, [owner, persist]);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    get<Stored>(key)
      .then((r) => {
        if (cancelled) return;
        record.current = r || { data: emptyState, revision: 0, dirty: false };
        setData(record.current.data);
        setReady(true);
        setStatus(
          owner === "demo" ? "Demo · saved on this device" : "Saved on device",
        );
        void sync();
      })
      .catch(() => {
        setReady(true);
        setStatus("Device storage unavailable");
      });
    const timer = setInterval(() => void sync(), 5000);
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [key, owner, sync]);
  const update = (next: State) => {
    record.current = { ...record.current, data: next, dirty: owner !== "demo" };
    setData(next);
    setStatus(
      owner === "demo"
        ? "Demo · saved on this device"
        : "Saved on device · sync pending",
    );
    void persist(record.current);
  };
  const loadCloud = async () => {
    if (!supabase) return;
    const { data: row, error } = await supabase
      .from("journals")
      .select("payload,revision")
      .eq("user_id", owner)
      .maybeSingle();
    if (error || !row) {
      setStatus("Unable to load cloud copy. Try again.");
      return;
    }
    record.current = {
      data: row.payload,
      revision: row.revision,
      dirty: false,
    };
    setData(record.current.data);
    await persist(record.current);
    setConflict(false);
    setStatus("Synced");
  };
  return {
    data,
    ready,
    status,
    update,
    conflict,
    loadCloud,
    flush: () => serial.current,
    clear: () => del(key),
  };
}
