import { describe, expect, it } from "vitest";
import { createAuthEntryGate } from "./authEntry";

describe("explicit auth entry", () => {
  it("leaves restores, token refreshes and unrelated sign-ins uninterrupted", () => {
    const gate = createAuthEntryGate<string>();
    expect(gate.defer("INITIAL_SESSION", "restored")).toBe(false);
    expect(gate.defer("TOKEN_REFRESHED", "refreshed")).toBe(false);
    expect(gate.defer("SIGNED_IN", "another-tab")).toBe(false);
  });
  it("waits for the explicit successful response before revealing the journal", () => {
    const gate = createAuthEntryGate<string>();
    const id = gate.begin();
    expect(gate.defer("SIGNED_IN", "event-session")).toBe(true);
    expect(gate.settle(id, "confirmed-session")).toEqual({ session: "confirmed-session", reveal: true });
    expect(gate.settle(id)).toBeNull();
  });
  it("never animates failure while preserving a concurrent valid session", () => {
    const gate = createAuthEntryGate<string>();
    const failed = gate.begin();
    expect(gate.settle(failed)).toEqual({ session: undefined, reveal: false });
    const concurrent = gate.begin();
    gate.defer("SIGNED_IN", "external-session");
    expect(gate.settle(concurrent)).toEqual({ session: "external-session", reveal: false });
  });
  it("does not replay late responses after recovery or a newer request", () => {
    const gate = createAuthEntryGate<string>();
    const old = gate.begin();
    gate.cancel();
    expect(gate.settle(old, "old-session")).toBeNull();
    const superseded = gate.begin();
    const current = gate.begin();
    expect(gate.settle(superseded, "old-session")).toBeNull();
    expect(gate.settle(current, "new-session")?.reveal).toBe(true);
  });
});
