/**
 * Run storage.
 *
 * Kept entirely out of the training journal. Route samples are append-only and grow
 * with every second of every run, and the cloud journal row is capped at 5 MB — a few
 * long runs in there would eventually take someone's entire strength history down with
 * them. Runs live under their own keys, per owner.
 *
 * The in-progress activity is checkpointed separately from the finished list, so a crash
 * or a closed tab mid-run loses at most the last checkpoint rather than the whole run.
 */
import { get, set, del } from "idb-keyval";
import type { RunActivity } from "../domain/running";

const listKey = (owner: string) => `kinset:runs:v1:${owner}`;
const activeKey = (owner: string) => `kinset:run-active:v1:${owner}`;

export async function loadRuns(owner: string): Promise<RunActivity[]> {
  try {
    const runs = await get<RunActivity[]>(listKey(owner));
    return Array.isArray(runs) ? runs : [];
  } catch {
    return [];
  }
}

export async function saveRuns(owner: string, runs: RunActivity[]) {
  await set(listKey(owner), runs);
}

/** The activity currently being recorded, if any. Written on every checkpoint. */
export async function loadActiveRun(owner: string): Promise<RunActivity | null> {
  try {
    return (await get<RunActivity>(activeKey(owner))) ?? null;
  } catch {
    return null;
  }
}

export async function saveActiveRun(owner: string, run: RunActivity | null) {
  if (run) await set(activeKey(owner), run);
  else await del(activeKey(owner));
}

/**
 * Move a finished activity into the list and clear the checkpoint, once.
 *
 * Idempotent by ID: finishing twice, or a retry after a failed write, yields one record
 * rather than two.
 */
export async function commitRun(owner: string, run: RunActivity) {
  const runs = await loadRuns(owner);
  const existing = runs.findIndex((r) => r.id === run.id);
  const next =
    existing >= 0
      ? runs.map((r) => (r.id === run.id ? run : r))
      : [run, ...runs];
  await saveRuns(owner, next);
  await saveActiveRun(owner, null);
  return next;
}

/** Deleting an activity deletes its route with it; there is nothing else holding one. */
export async function deleteRun(owner: string, id: string) {
  const runs = await loadRuns(owner);
  const next = runs.filter((r) => r.id !== id);
  await saveRuns(owner, next);
  return next;
}

export async function clearRuns(owner: string) {
  await Promise.all([del(listKey(owner)), del(activeKey(owner))]);
}
