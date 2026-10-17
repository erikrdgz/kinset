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

  it("resolves and deduplicates static positions for permitted offline use", () => {
    setManifest({ version: 1, basePath: "/app/movements/", entries: [{
      exerciseId: "plank", kind: "image", src: "one.png", poster: "one.png", frames: ["one.png", "two.png"],
      licenseId: "example-2026", deliveryMode: "owned", offlineAllowed: true,
    }] });
    expect(mediaFor("plank")!.resolvedFrames).toEqual(["/app/movements/one.png", "/app/movements/two.png"]);
    expect(cacheableAssets()).toEqual(["/app/movements/one.png", "/app/movements/two.png"]);
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

  it("requires visible attribution, source, licence and change notes for CC assets", () => {
    const entry = { ...base.entries[0], licenseId: "CC-BY-SA-4.0" };
    expect(validateManifest({ version: 1, entries: [entry] }, known).map((problem) => problem.problem)).toEqual([
      "missing attribution for Creative Commons media", "missing sourceUrl for Creative Commons media",
      "missing licenseUrl for Creative Commons media", "missing changes for Creative Commons media",
    ]);
    expect(validateManifest({ version: 1, entries: [{ ...entry,
      attribution: "Artist", sourceUrl: "https://example.com/source", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", changes: "Resized.",
    }] }, known)).toEqual([]);
  });

  it("requires a still frame so GIF playback can stop", () => {
    const { poster: _poster, ...gif } = base.entries[0];
    expect(validateManifest({ version: 1, entries: [gif] }, known).map((problem) => problem.problem)).toContain("GIF needs a static poster so motion can be paused");
  });
});
