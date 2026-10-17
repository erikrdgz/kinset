/** Coordinates an explicit sign-in request with Supabase's earlier auth event. */
export function createAuthEntryGate<Session>() {
  let sequence = 0;
  let pending: { id: number; deferred?: Session | null } | undefined;
  return {
    begin() {
      pending = { id: ++sequence };
      return sequence;
    },
    defer(event: string, session: Session | null) {
      if (event !== "SIGNED_IN" || !pending) return false;
      pending.deferred = session;
      return true;
    },
    settle(id: number, confirmed?: Session) {
      if (!pending || pending.id !== id) return null;
      const deferred = pending.deferred;
      pending = undefined;
      return { session: confirmed ?? deferred, reveal: confirmed !== undefined };
    },
    cancel() { pending = undefined; },
  };
}
