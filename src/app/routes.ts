/**
 * Routing.
 *
 * The audited app navigated with `useState("Today")`, so the browser back button could
 * not return to the previous screen, nothing could be linked to, and a reload always
 * landed on Today. These are real history entries: back works, a guide returns to the
 * screen that opened it, and the active session has an address of its own.
 *
 * Hash routing, because the app is served from a configurable base path and must work
 * from a static host with no server rewrite rules.
 */
import { useCallback, useEffect, useState } from "react";

export type Route =
  | { name: "today" }
  | { name: "train" }
  | { name: "preview" }
  | { name: "session" }
  | { name: "summary"; sessionId: string }
  | { name: "library"; query?: string; group?: string; exerciseId?: string }
  | { name: "progress"; exerciseId?: string }
  | { name: "plans" }
  | { name: "run" }
  | { name: "settings" };

export type TabName = "today" | "train" | "library" | "progress";

/** Which tab a route belongs under, so the bar highlights correctly on a deep link. */
export function tabFor(route: Route): TabName | null {
  switch (route.name) {
    case "today":
      return "today";
    case "train":
    case "preview":
    case "plans":
    case "run":
      return "train";
    case "library":
      return "library";
    case "progress":
    case "summary":
      return "progress";
    default:
      return null;
  }
}

export function toHash(route: Route): string {
  const params = new URLSearchParams();
  switch (route.name) {
    case "library":
      if (route.query) params.set("q", route.query);
      if (route.group) params.set("group", route.group);
      if (route.exerciseId) params.set("id", route.exerciseId);
      break;
    case "progress":
      if (route.exerciseId) params.set("id", route.exerciseId);
      break;
    case "summary":
      return `#/summary/${encodeURIComponent(route.sessionId)}`;
  }
  const query = params.toString();
  return `#/${route.name}${query ? `?${query}` : ""}`;
}

export function fromHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [path, search] = raw.split("?");
  const params = new URLSearchParams(search);
  const [head, tail] = path.split("/");

  switch (head) {
    case "train":
      return { name: "train" };
    case "preview":
      return { name: "preview" };
    case "session":
      return { name: "session" };
    case "summary":
      return tail
        ? { name: "summary", sessionId: decodeURIComponent(tail) }
        : { name: "progress" };
    case "library":
      return {
        name: "library",
        query: params.get("q") || undefined,
        group: params.get("group") || undefined,
        exerciseId: params.get("id") || undefined,
      };
    case "progress":
      return { name: "progress", exerciseId: params.get("id") || undefined };
    case "plans":
      return { name: "plans" };
    case "run":
      return { name: "run" };
    case "settings":
      return { name: "settings" };
    default:
      return { name: "today" };
  }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => fromHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(fromHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  /** Push a new history entry: back returns to where the user was. */
  const go = useCallback((next: Route) => {
    window.location.hash = toHash(next);
  }, []);

  /**
   * Replace the current entry. For state that should not accumulate history — typing in
   * a search box, switching a filter — so back leaves the Library rather than undoing
   * twelve keystrokes.
   */
  const replace = useCallback((next: Route) => {
    const url = `${window.location.pathname}${window.location.search}${toHash(next)}`;
    window.history.replaceState(null, "", url);
    setRoute(next);
  }, []);

  const back = useCallback(() => window.history.back(), []);

  return { route, go, replace, back };
}
