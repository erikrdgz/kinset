import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheableAssets,
  emptyManifest,
  mediaFor,
  setManifest,
  validateManifest,
  type MediaManifest,
} from "./manifest";

const known = (id: string) => ["goblet", "rdl", "plank"].includes(id);

const base: MediaManifest = {
  version: 1,
  basePath: "/movements/",
  entries: [
    {
      exerciseId: "goblet",
      kind: "gif",
      src: "goblet.gif",
      poster: "goblet.jpg",
      licenseId: "example-2026",
      deliveryMode: "owned",
      offlineAllowed: true,
    },
    {
      exerciseId: "rdl",
      kind: "video",
      src: "https://cdn.example.com/rdl.mp4",
      licenseId: "supplier-2026",
      deliveryMode: "streamOnly",
      offlineAllowed: false,
    },
  ],
};

beforeEach(() => setManifest(base));

describe("media manifest", () => {
  it("resolves local and absolute sources", () => {
    expect(mediaFor("goblet")!.resolvedSrc).toBe("/movements/goblet.gif");
    expect(mediaFor("goblet")!.resolvedPoster).toBe("/movements/goblet.jpg");
    // An absolute supplier URL is left exactly as given.
    expect(mediaFor("rdl")!.resolvedSrc).toBe("https://cdn.example.com/rdl.mp4");
  });

  it("returns nothing for a movement with no asset, which is the normal case", () => {
    setManifest(emptyManifest);
    expect(mediaFor("goblet")).toBeNull();
  });

  it("marks a time-limited asset expired instead of serving a dead URL", () => {
    setManifest({
      version: 1,
      entries: [
        {
          exerciseId: "goblet",
          kind: "gif",
          src: "g.gif",
          licenseId: "x",
          deliveryMode: "owned",
          offlineAllowed: true,
          expiresAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(mediaFor("goblet", new Date("2026-10-16"))!.expired).toBe(true);
    expect(mediaFor("goblet", new Date("2025-10-16"))!.expired).toBe(false);
  });

  it("never offers a stream-only asset for caching", () => {
    const cacheable = cacheableAssets();
    expect(cacheable).toContain("/movements/goblet.gif");
    // The supplier's terms permit playback buffers only.
    expect(cacheable).not.toContain("https://cdn.example.com/rdl.mp4");
  });
});

describe("manifest validation", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateManifest(base, known)).toEqual([]);
  });

  it("rejects an asset for a movement that does not exist", () => {
    const problems = validateManifest(
      {
        version: 1,
        entries: [
          {
            exerciseId: "not-a-movement",
            kind: "gif",
            src: "x.gif",
            licenseId: "x",
            deliveryMode: "owned",
            offlineAllowed: true,
          },
        ],
      },
      known,
    );
    expect(problems.map((p) => p.problem).join(" ")).toContain("no exercise");
  });

  it("refuses an asset with no recorded licence", () => {
    const problems = validateManifest(
      {
        version: 1,
        entries: [
          {
            exerciseId: "goblet",
            kind: "gif",
            src: "x.gif",
            deliveryMode: "owned",
            offlineAllowed: true,
          },
        ],
      },
      known,
    );
    expect(problems.map((p) => p.problem).join(" ")).toContain("licenseId");
  });

  it("refuses to cache media a licence forbids storing", () => {
    const problems = validateManifest(
      {
        version: 1,
        entries: [
          {
            exerciseId: "goblet",
            kind: "video",
            src: "x.mp4",
            licenseId: "x",
            deliveryMode: "streamOnly",
            offlineAllowed: true,
          },
        ],
      },
      known,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toContain("stream-only");
  });

  it("catches duplicate entries for one movement", () => {
    const problems = validateManifest(
      { version: 1, entries: [base.entries[0], base.entries[0]] },
      known,
    );
    expect(problems.map((p) => p.problem)).toContain("duplicate entry");
  });
});
