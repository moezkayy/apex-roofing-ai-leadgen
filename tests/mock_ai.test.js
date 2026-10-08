const test = require("node:test");
const assert = require("node:assert/strict");
const { mockAi } = require("../src/mock_ai.js");
const { auditSite } = require("../src/audit.js");
const sample = require("../data/sample_roofers.json");

const config = {
  agencyName: "Apex Growth Agency",
  agencyOffer: "websites with online booking, Google review growth and local ads",
  city: "Dallas",
  searchTerm: "roofers",
  model: "claude-haiku-5-5",
};

// Minimal Lead mapping, kept inline so this test doesn't depend on normalize.js.
// Drops the cached Claude reply (mock.ai) so these tests exercise the template.
function toLead(item) {
  return {
    placeId: item.placeId,
    name: item.title,
    website: item.website || null,
    rating: typeof item.totalScore === "number" ? item.totalScore : null,
    reviewCount: typeof item.reviewsCount === "number" ? item.reviewsCount : null,
    reviews: (item.reviews || []).slice(0, 5).map((r) => ({ text: r.text, stars: r.stars, date: r.publishedAtDate })),
    mock: item.mock && { ...item.mock, ai: null },
  };
}

function signalsFor(item) {
  const mock = item.mock || {};
  return auditSite(mock.homepageHtml, item.website, mock.pagespeedMobile, 2026);
}

const words = (s) => s.trim().split(/\s+/).length;

function assertValidAi(ai, label) {
  assert.ok(Array.isArray(ai.findings) && ai.findings.length >= 1 && ai.findings.length <= 4, `${label}: findings`);
  for (const f of ai.findings) {
    assert.equal(typeof f.label, "string", label);
    assert.equal(typeof f.detail, "string", label);
    assert.ok(["high", "medium", "low"].includes(f.severity), label);
  }
  assert.ok(Array.isArray(ai.reviewThemes) && ai.reviewThemes.every((t) => typeof t === "string"), label);
  assert.ok(Number.isInteger(ai.complaintCount) && ai.complaintCount >= 0, label);
  assert.equal(typeof ai.firstLine, "string", label);
  assert.equal(typeof ai.pitch, "string", label);
  assert.equal(typeof ai.aiSource, "string", label);
}

test("all 50 samples get a valid template Ai within word limits", () => {
  assert.equal(sample.length, 50);
  const patterns = new Set();
  for (const item of sample) {
    const lead = toLead(item);
    const ai = mockAi(lead, signalsFor(item), config);
    assertValidAi(ai, item.placeId);
    assert.equal(ai.aiSource, "template (offline)");
    assert.ok(words(ai.firstLine) <= 25, `${item.placeId} firstLine: ${ai.firstLine}`);
    assert.ok(words(ai.pitch) <= 60, `${item.placeId} pitch: ${ai.pitch}`);
    assert.equal(ai.pitch.split(/(?<=[.?])\s+/).length, 2, `${item.placeId} pitch sentences`);
    assert.doesNotMatch(ai.firstLine + ai.pitch, /!|I came across|hope this finds you/i, item.placeId);
    assert.ok(ai.complaintCount <= lead.reviews.length, item.placeId);
    if (lead.reviews.length === 0) assert.deepEqual(ai.reviewThemes, [], item.placeId);
    patterns.add(ai.firstLine.split(" ").slice(0, 2).join(" "));
  }
  assert.ok(patterns.size >= 3, "first lines use varied openings");
});

test("no website is the headline finding", () => {
  const item = sample.find((s) => !s.website);
  const ai = mockAi(toLead(item), signalsFor(item), config);
  assert.equal(ai.findings[0].severity, "high");
  assert.match(ai.findings[0].label, /website/i);
  assert.match(ai.firstLine, /website/i);
});

test("first line cites a real fact from the data", () => {
  const lead = { placeId: "t1", name: "Test Roofing", website: "https://t.example", rating: 4.6, reviewCount: 80, reviews: [] };
  const signals = { hasWebsite: true, siteReachable: true, https: true, mobileViewport: true, onlineBooking: true, bookingTool: "Jobber", clickToCall: true, socialLinks: ["facebook.com"], copyrightYear: 2026, pagespeedMobile: 31 };
  const ai = mockAi(lead, signals, config);
  assert.match(ai.firstLine, /31\/100/);
});

test("complaints are counted with keyword matching", () => {
  const lead = {
    placeId: "t2",
    name: "Test Roofing",
    website: null,
    rating: 3.9,
    reviewCount: 12,
    reviews: [
      { text: "Never got a call back.", stars: 2, date: "2026-09-01" },
      { text: "Still leaking after the repair.", stars: 1, date: "2026-08-01" },
      { text: "Great crew, very clean.", stars: 5, date: "2026-07-01" },
      { text: "Crew was rude and showed up late.", stars: 2, date: "2026-06-01" },
    ],
  };
  const ai = mockAi(lead, { hasWebsite: false }, config);
  assert.equal(ai.complaintCount, 3);
  assert.ok(ai.reviewThemes.length >= 2);
});

test("same input gives the same output", () => {
  const item = sample[3];
  assert.deepEqual(mockAi(toLead(item), signalsFor(item), config), mockAi(toLead(item), signalsFor(item), config));
});

test("cached mock.ai is passed through", () => {
  const cached = {
    findings: [{ label: "No online booking", detail: "No booking link on the homepage.", severity: "high" }],
    reviewThemes: [],
    complaintCount: 0,
    firstLine: "Your site has no way to book an estimate online.",
    pitch: "We add booking. Worth a chat?",
  };
  const lead = { placeId: "t3", name: "Cached", mock: { ai: cached } };
  assert.deepEqual(mockAi(lead, {}, config), { ...cached, aiSource: "claude (cached)" });

  const withSource = { ...cached, aiSource: "claude-haiku-5-5" };
  assert.deepEqual(mockAi({ ...lead, mock: { ai: withSource } }, {}, config), withSource);
});

test("sample cached replies are valid and within word limits", () => {
  for (const item of sample.filter((s) => s.mock && s.mock.ai)) {
    const ai = mockAi({ placeId: item.placeId, mock: item.mock }, {}, config);
    assertValidAi(ai, item.placeId);
    assert.match(ai.aiSource, /^claude.*\(cached\)$/, item.placeId);
    assert.ok(words(ai.firstLine) <= 25, `${item.placeId} firstLine: ${ai.firstLine}`);
  }
});
