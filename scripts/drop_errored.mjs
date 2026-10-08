// Drops leads whose website checks errored, so the portfolio run shows only complete audits.
// Keeps: no website (a real finding), or homepage loaded AND PageSpeed returned a score.
// Drops: has a website but the homepage fetch or PageSpeed failed.
// Rewrites output/leads.json + leads.csv; the full run is kept in output/leads.all.json.
// Token counts and cost stay as measured for the whole run.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "output");
// leads.json that already has scoredCount was filtered before; re-filter from the saved full run.
const allPath = join(out, "leads.all.json");
let data = JSON.parse(readFileSync(join(out, "leads.json"), "utf8"));
if (data.meta.scoredCount != null && existsSync(allPath)) data = JSON.parse(readFileSync(allPath, "utf8"));
else writeFileSync(allPath, JSON.stringify(data, null, 2) + "\n");

const complete = (s = {}) => !s.hasWebsite || (s.siteReachable === true && s.pagespeedMobile != null);
const leads = data.leads.filter((l) => complete(l.signals)).map((l, i) => ({ ...l, rank: i + 1 }));

const tierCounts = { hot: 0, warm: 0, cold: 0 };
for (const l of leads) tierCounts[l.tier] += 1;

const meta = {
  ...data.meta,
  leadCount: leads.length,
  tierCounts,
  scoredCount: data.leads.length,
  droppedIncompleteChecks: data.leads.length - leads.length,
};
writeFileSync(join(out, "leads.json"), JSON.stringify({ meta, leads }, null, 2) + "\n");

const header = ["rank", "tier", "score", "name", "phone", "website", "rating", "review_count", "top_findings", "first_line", "pitch", "maps_url"];
const cell = (v) => (v == null ? "" : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const rows = leads.map((l) => [l.rank, l.tier, l.score, l.name, l.phone, l.website, l.rating, l.reviewCount,
  (l.findings || []).map((f) => f.label).join("; "), l.firstLine, l.pitch, l.mapsUrl].map(cell).join(","));
writeFileSync(join(out, "leads.csv"), [header.join(","), ...rows].join("\n") + "\n");

console.log(`kept ${leads.length} of ${data.leads.length} (dropped ${meta.droppedIncompleteChecks}); tiers`, tierCounts);
