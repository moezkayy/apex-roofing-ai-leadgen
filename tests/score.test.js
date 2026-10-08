const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreLead, scoreTier } = require("../src/score.js");
const { normalizePlace } = require("../src/normalize.js");
const { auditSite } = require("../src/audit.js");
const sample = require("../data/sample_roofers.json");

const NOW = 2026;

// A healthy, mid-sized business with a modern site: every rule is quiet.
function baseLead(extra) {
  return { rating: 4.8, reviewCount: 8, permanentlyClosed: false, ...extra };
}
function baseSignals(extra) {
  return {
    hasWebsite: true,
    siteReachable: true,
    https: true,
    mobileViewport: true,
    onlineBooking: true,
    bookingTool: "Jobber",
    clickToCall: true,
    socialLinks: ["facebook.com"],
    copyrightYear: NOW,
    pagespeedMobile: 90,
    ...extra,
  };
}
function score(lead, signals, ai = { complaintCount: 0 }) {
  return scoreLead(baseLead(lead), baseSignals(signals), ai, NOW);
}
function points(result) {
  return result.scoreReasons.map((r) => r.points);
}

test("a healthy business scores 0 with no reasons", () => {
  assert.deepEqual(score({}, {}), { score: 0, tier: "cold", scoreReasons: [] });
});

test("each rule adds its points with a reason", () => {
  const cases = [
    [{}, { hasWebsite: false, siteReachable: false, https: null, mobileViewport: null, onlineBooking: null,
      bookingTool: null, clickToCall: null, socialLinks: null, copyrightYear: null, pagespeedMobile: null }, [40, 15]],
    [{}, { siteReachable: false, mobileViewport: null, onlineBooking: null, socialLinks: null, copyrightYear: null }, [20]],
    [{}, { mobileViewport: false }, [15]],
    [{}, { onlineBooking: false, bookingTool: null }, [15]],
    [{}, { pagespeedMobile: 49 }, [10]],
    [{}, { pagespeedMobile: 29 }, [15]],
    [{}, { pagespeedMobile: 50 }, []],
    [{}, { pagespeedMobile: 30 }, [10]],
    [{}, { copyrightYear: NOW - 4 }, [8]],
    [{}, { copyrightYear: NOW - 3 }, []],
    [{}, { https: false }, [5]],
    [{}, { socialLinks: [] }, [5]],
    [{ rating: 3.9 }, {}, [10]],
    [{ rating: 4.0 }, {}, [5]],
    [{ rating: 4.3 }, {}, [5]],
    [{ rating: 4.4 }, {}, []],
    [{ reviewCount: 25 }, {}, [10]],
    [{ reviewCount: 24 }, {}, [5]],
    [{ reviewCount: 10 }, {}, [5]],
    [{ reviewCount: 9 }, {}, []],
  ];
  for (const [lead, signals, expected] of cases) {
    const result = score(lead, signals);
    const label = JSON.stringify({ lead, signals });
    assert.deepEqual(points(result), expected, label);
    assert.equal(result.score, expected.reduce((a, b) => a + b, 0), label);
    for (const r of result.scoreReasons) assert.ok(r.reason.length > 0, label);
  }
});

test("complaints in reviews add points", () => {
  assert.deepEqual(points(score({}, {}, { complaintCount: 1 })), [5]);
  assert.deepEqual(points(score({}, {}, { complaintCount: 2 })), [10]);
  assert.deepEqual(points(score({}, {}, { complaintCount: 7 })), [10]);
});

test("unknown values add nothing", () => {
  const unknown = { https: null, mobileViewport: null, onlineBooking: null, socialLinks: null,
    copyrightYear: null, pagespeedMobile: null };
  assert.deepEqual(score({ rating: null }, unknown, null), { score: 0, tier: "cold", scoreReasons: [] });
  assert.equal(score({}, {}, {}).score, 0);
});

test("reasons are sorted by points, biggest first", () => {
  const result = score({ rating: 4.1, reviewCount: 30 }, { mobileViewport: false, copyrightYear: 2015, https: false });
  assert.deepEqual(points(result), [15, 10, 8, 5, 5]);
  assert.equal(result.score, 43);
});

test("score is clamped to 100", () => {
  const result = score(
    { rating: 3.0, reviewCount: 300 },
    { siteReachable: false, https: false, mobileViewport: false, onlineBooking: false, socialLinks: [],
      copyrightYear: 2010, pagespeedMobile: 10 },
    { complaintCount: 5 },
  );
  assert.equal(result.score, 100);
  assert.equal(result.tier, "hot");
});

test("permanently closed is disqualified: cold, capped at 20", () => {
  const result = score({ permanentlyClosed: true, reviewCount: 300, rating: 3.0 }, { hasWebsite: false });
  assert.equal(result.score, 20);
  assert.equal(result.tier, "cold");
  assert.match(result.scoreReasons.at(-1).reason, /permanently closed/i);
});

test("fewer than 5 reviews is disqualified", () => {
  for (const reviewCount of [4, 0, null]) {
    const result = score({ reviewCount, rating: 3.0 }, { mobileViewport: false, onlineBooking: false });
    assert.equal(result.score, 20, String(reviewCount));
    assert.equal(result.tier, "cold");
    assert.match(result.scoreReasons.at(-1).reason, /reviews/i);
  }
  const low = score({ reviewCount: 2 }, { https: false });
  assert.equal(low.score, 5);
  assert.equal(low.tier, "cold");
  assert.match(low.scoreReasons.at(-1).reason, /disqualified/i);
});

test("tier boundaries", () => {
  assert.equal(scoreTier(0), "cold");
  assert.equal(scoreTier(44), "cold");
  assert.equal(scoreTier(45), "warm");
  assert.equal(scoreTier(69), "warm");
  assert.equal(scoreTier(70), "hot");
  assert.equal(scoreTier(100), "hot");
});

test("all 50 sample leads score cleanly with a spread of tiers", () => {
  const counts = { hot: 0, warm: 0, cold: 0 };
  for (const item of sample) {
    const lead = normalizePlace(item);
    const signals = auditSite(lead.mock.homepageHtml, lead.website, lead.mock.pagespeedMobile, NOW);
    const result = scoreLead(lead, signals, { complaintCount: 0 }, NOW);
    assert.ok(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100, lead.name);
    assert.equal(result.tier, scoreTier(result.score));
    counts[result.tier]++;
  }
  console.log("sample tiers:", JSON.stringify(counts));
  assert.ok(counts.hot >= 5 && counts.warm >= 5 && counts.cold >= 5, JSON.stringify(counts));
});
