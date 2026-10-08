const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOutput } = require("../src/output.js");

const meta = {
  agency: "Apex Growth Agency",
  niche: "roofing contractor",
  city: "Dallas, TX",
  dataSource: "mock",
  ai: "mock",
  model: "claude-haiku-5-5",
  durationSeconds: 1.2345,
  generatedAt: "2026-10-08T12:00:00.000Z",
};

function row(extra) {
  return {
    placeId: "p1",
    name: "A Roofing",
    address: "1 Main St",
    phone: "(214) 555-0100",
    website: "https://a.example",
    mapsUrl: "https://maps.example/a",
    rating: 4.1,
    reviewCount: 10,
    socials: { facebook: null, instagram: null },
    email: null,
    reviews: [{ text: "raw", stars: 5, date: null }],
    mock: { ai: null },
    signals: { hasWebsite: true },
    findings: [{ label: "No online booking", detail: "d", severity: "high" }, { label: "Slow site", detail: "d", severity: "low" }],
    reviewThemes: ["on-time crews"],
    complaintCount: 0,
    score: 50,
    tier: "warm",
    scoreReasons: [],
    firstLine: "Hi.",
    pitch: "Pitch.",
    aiSource: "template (offline)",
    usage: { inputTokens: 0, outputTokens: 0 },
    ...extra,
  };
}

test("sorts by score then review count and adds rank", () => {
  const { json } = buildOutput([
    row({ placeId: "a", score: 40, reviewCount: 5 }),
    row({ placeId: "b", score: 80, reviewCount: 5, tier: "hot" }),
    row({ placeId: "c", score: 40, reviewCount: 99, tier: "cold" }),
  ], meta);
  assert.deepEqual(json.leads.map((l) => [l.rank, l.placeId]), [[1, "b"], [2, "c"], [3, "a"]]);
});

test("meta has counts, rounding and no model for mock ai", () => {
  const { json } = buildOutput([row({ tier: "hot" }), row({ tier: "cold" }), row({ tier: "cold" })], meta);
  assert.equal(json.meta.model, null);
  assert.equal(json.meta.durationSeconds, 1.2);
  assert.equal(json.meta.leadCount, 3);
  assert.deepEqual(json.meta.tierCounts, { hot: 1, warm: 0, cold: 2 });
  assert.equal(json.meta.claudeCostUsd, 0);
  assert.equal(json.meta.demoBuild, true);
  assert.equal(json.meta.agency, "Apex Growth Agency");
});

test("claude cost comes from token usage and the model's price", () => {
  const rows = [row({ usage: { inputTokens: 1000000, outputTokens: 200000 } }), row({ usage: { inputTokens: 500000, outputTokens: 0 } })];
  const { json } = buildOutput(rows, { ...meta, ai: "claude" });
  assert.equal(json.meta.model, "claude-haiku-5-5");
  assert.equal(json.meta.claudeInputTokens, 1500000);
  assert.equal(json.meta.claudeOutputTokens, 200000);
  // 1.5 MTok * $0.10 + 0.2 MTok * $0.50
  assert.equal(json.meta.claudeCostUsd, 0.25);
});

test("leads drop raw reviews, mock data and usage", () => {
  const { json } = buildOutput([row()], meta);
  const lead = json.leads[0];
  assert.equal("reviews" in lead, false);
  assert.equal("mock" in lead, false);
  assert.equal("usage" in lead, false);
  assert.deepEqual(lead.signals, { hasWebsite: true });
  assert.equal(lead.aiSource, "template (offline)");
});

test("csv has the header, quotes per RFC 4180 and uses \\n", () => {
  const { csv } = buildOutput([row({ name: 'Smith, "Best" Roofing', pitch: "Line one.\nLine two." })], meta);
  const lines = csv.split("\n");
  assert.equal(lines[0], "rank,tier,score,name,phone,website,rating,review_count,top_findings,first_line,pitch,maps_url");
  assert.ok(csv.includes('"Smith, ""Best"" Roofing"'));
  assert.ok(csv.includes('"Line one.\nLine two."'));
  assert.ok(csv.includes("No online booking; Slow site"));
  assert.equal(csv.includes("\r"), false);
  assert.ok(csv.endsWith("\n"));
});

test("csv leaves null values empty", () => {
  const { csv } = buildOutput([row({ phone: null, rating: null })], meta);
  assert.ok(csv.split("\n")[1].startsWith("1,warm,50,A Roofing,,https://a.example,,10,"));
});
