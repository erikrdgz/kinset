/**
 * Validates public/movements/manifest.json against the exercise catalog.
 *
 * Catches the failures that would otherwise surface as a broken image mid-workout:
 * an asset pointing at an ID that does not exist, a missing licence, or a stream-only
 * asset marked cacheable.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "public/movements/manifest.json");

if (!existsSync(manifestPath)) {
  console.log("No media manifest. Nothing to check.");
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const source = readFileSync(resolve(root, "src/domain/legacy.ts"), "utf8");
const expansion = readFileSync(resolve(root, "src/domain/expansion.ts"), "utf8");
const mobility = readFileSync(resolve(root, "src/domain/mobility.ts"), "utf8");
const extra = readFileSync(resolve(root, "src/extraExercises.ts"), "utf8");

const ids = new Set(
  [source, expansion, mobility, extra]
    .flatMap((text) => [...text.matchAll(/\bid:\s*"([a-z0-9]+)"/g)].map((m) => m[1]))
    .concat(
      [...extra.matchAll(/\[\s*"([a-z0-9]+)",\s*"/g)].map((m) => m[1]),
    ),
);

const problems = [];
const seen = new Set();

for (const entry of manifest.entries ?? []) {
  const id = entry.exerciseId;
  if (!ids.has(id)) problems.push(`${id}: no exercise with this ID`);
  if (seen.has(id)) problems.push(`${id}: duplicate entry`);
  seen.add(id);
  if (!entry.src) problems.push(`${id}: missing src`);
  if (!entry.licenseId) problems.push(`${id}: missing licenseId`);
  if (entry.deliveryMode === "streamOnly" && entry.offlineAllowed)
    problems.push(
      `${id}: stream-only assets cannot be offlineAllowed — that would cache media the licence forbids storing`,
    );
  if (entry.expiresAt && Number.isNaN(Date.parse(entry.expiresAt)))
    problems.push(`${id}: expiresAt is not a date`);
  if (entry.src && !/^https?:\/\//.test(entry.src)) {
    const file = resolve(root, "public/movements", entry.src);
    if (!existsSync(file)) problems.push(`${id}: ${entry.src} is not in public/movements`);
  }
}

if (problems.length) {
  console.error(`Media manifest has ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `Media manifest OK: ${manifest.entries?.length ?? 0} entries against ${ids.size} known movements.`,
);
