// Copies Claude's output from a mock-data run (output/leads.json) into data/sample_roofers.json[i].mock.ai,
// matched by placeId, so offline mock runs show real Claude writing. aiSource gets a " (cached)" suffix.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = join(root, "data", "sample_roofers.json");
const { meta, leads } = JSON.parse(readFileSync(join(root, "output", "leads.json"), "utf8"));

if (meta.dataSource !== "mock" || meta.ai !== "claude") {
  throw new Error(`output/leads.json must come from a mock + claude run (got ${meta.dataSource} + ${meta.ai})`);
}

const byId = new Map(leads.map((l) => [l.placeId, l]));
const sample = JSON.parse(readFileSync(samplePath, "utf8"));
let copied = 0;
for (const place of sample) {
  const l = byId.get(place.placeId);
  if (!l || !String(l.aiSource).startsWith("claude")) continue;
  const { findings, reviewThemes, complaintCount, firstLine, pitch } = l;
  place.mock = { ...place.mock, ai: { findings, reviewThemes, complaintCount, firstLine, pitch, aiSource: `${l.aiSource} (cached)` } };
  copied += 1;
}
writeFileSync(samplePath, JSON.stringify(sample, null, 2) + "\n");
console.log(`cached Claude output for ${copied} of ${sample.length} sample places`);
