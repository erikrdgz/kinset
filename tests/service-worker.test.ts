import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://kinset.example";

/** Run the shipped worker itself, without installing a worker or touching a cache. */
function worker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const put = vi.fn().mockResolvedValue(undefined);
  const cache = { put, addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(undefined),
  };
  const fetch = vi.fn().mockResolvedValue(new Response("complete asset"));
  runInNewContext(source, {
    URL,
    caches,
    fetch,
    self: {
      location: { origin },
      addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    },
  });
  const dispatch = (options: { mode?: string; range?: string; method?: string; url?: string } = {}) => {
    const request = {
      url: options.url ?? `${origin}/movements/press.mp4`,
      method: options.method ?? "GET",
      mode: options.mode ?? "cors",
      headers: new Headers(options.range ? { [options.range]: "bytes=1024-2047" } : undefined),
    };
    const event = {
      request,
      respondWith: vi.fn<(response: Promise<Response | undefined>) => void>(),
      waitUntil: vi.fn<(promise: Promise<unknown>) => void>(),
    };
    listeners.get("fetch")!(event);
    return event;
  };
  return { dispatch, fetch, caches, put };
}

describe("service worker streaming and cache integrity", () => {
  it.each(["range", "Range"])("leaves %s video requests entirely to the browser", (header) => {
    const sw = worker();
    const event = sw.dispatch({ range: header });

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(event.waitUntil).not.toHaveBeenCalled();
    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.caches.match).not.toHaveBeenCalled();
    expect(sw.caches.open).not.toHaveBeenCalled();
  });

  it.each([
    { method: "POST" },
    { url: "https://database.example/rest/v1/journal" },
  ])("leaves non-asset traffic alone: %j", (request) => {
    const sw = worker();
    const event = sw.dispatch(request);
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.caches.match).not.toHaveBeenCalled();
  });

  describe.each(["cors", "navigate"])("%s requests", (mode) => {
    it("stores a complete 200 response without consuming the returned body", async () => {
      const sw = worker();
      const response = new Response("complete asset", { status: 200 });
      sw.fetch.mockResolvedValue(response);
      const event = sw.dispatch({ mode });
      const delivered = await event.respondWith.mock.calls[0][0];

      expect(delivered).toBe(response);
      expect(sw.put).toHaveBeenCalledOnce();
      const [key, copy] = sw.put.mock.calls[0];
      expect(key).toBe(mode === "navigate" ? "./" : event.request);
      expect(copy).not.toBe(response);
      expect(await copy.text()).toBe("complete asset");
      expect(await delivered!.text()).toBe("complete asset");
    });

    it.each([206, 304, 404])("never caches HTTP %i", async (status) => {
      const sw = worker();
      const response = new Response(status === 304 ? null : "partial or failed", { status });
      sw.fetch.mockResolvedValue(response);
      const event = sw.dispatch({ mode });

      expect(await event.respondWith.mock.calls[0][0]).toBe(response);
      expect(sw.caches.open).not.toHaveBeenCalled();
      expect(sw.put).not.toHaveBeenCalled();
    });

    it.each(["open", "put"])("still returns network content when cache %s fails", async (operation) => {
      const sw = worker();
      const response = new Response("available despite full storage");
      sw.fetch.mockResolvedValue(response);
      (operation === "open" ? sw.caches.open : sw.put).mockRejectedValue(new Error("Storage quota exceeded"));
      const event = sw.dispatch({ mode });

      expect(await event.respondWith.mock.calls[0][0]).toBe(response);
      expect(await response.text()).toBe("available despite full storage");
      await Promise.all(event.waitUntil.mock.calls.map(([promise]) => promise));
    });
  });

  it("serves a cache hit immediately and keeps its refresh alive until the new asset is stored", async () => {
    const sw = worker();
    const cached = new Response("older complete asset");
    sw.caches.match.mockResolvedValue(cached);
    let finishNetwork!: (response: Response) => void;
    sw.fetch.mockReturnValue(new Promise<Response>((resolve) => { finishNetwork = resolve; }));
    const event = sw.dispatch();

    expect(await event.respondWith.mock.calls[0][0]).toBe(cached);
    expect(event.waitUntil).toHaveBeenCalledOnce();
    expect(sw.put).not.toHaveBeenCalled();

    finishNetwork(new Response("new complete asset"));
    await event.waitUntil.mock.calls[0][0];
    expect(sw.put).toHaveBeenCalledOnce();
    expect(await sw.put.mock.calls[0][1].text()).toBe("new complete asset");
  });

  it("uses the cached app shell when navigation has no network", async () => {
    const sw = worker();
    const cached = new Response("offline app shell");
    sw.fetch.mockRejectedValue(new Error("Offline"));
    sw.caches.match.mockResolvedValue(cached);
    const event = sw.dispatch({ mode: "navigate" });

    expect(await event.respondWith.mock.calls[0][0]).toBe(cached);
    expect(sw.caches.match).toHaveBeenCalledWith("./");
  });
});
