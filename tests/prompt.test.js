const test = require("node:test");
const assert = require("node:assert/strict");
const { buildClaudeRequest, parseClaudeResponse, AI_SCHEMA } = require("../src/prompt.js");

const config = {
  agencyName: "Apex Growth Agency",
  agencyOffer: "websites with online booking, Google review growth and local ads",
  city: "Dallas",
  searchTerm: "roofers",
  model: "claude-haiku-5-5",
};

const lead = {
  placeId: "mock_001",
  name: "Prairie Gate Roofing Pros",
  address: "1058 Laurel Crest Way, Dallas, TX 75235",
  phone: "(214) 555-0129",
  website: "https://prairie-gate-roofing-pros.example",
  mapsUrl: "https://maps.example/1",
  rating: 3.8,
  reviewCount: 41,
  category: "Roofing contractor",
  permanentlyClosed: false,
  socials: { facebook: null, instagram: null },
  email: "owner@prairie-gate.example",
  reviews: [
    { text: "Never got a call back after the estimate.", stars: 2, date: "2026-09-01T00:00:00.000Z" },
    { text: "x".repeat(500), stars: 4, date: "2026-08-01T00:00:00.000Z" },
    { text: "Good work.", stars: 5, date: "2026-07-01T00:00:00.000Z" },
    { text: "Roof leaked again a month later.", stars: 1, date: "2026-06-01T00:00:00.000Z" },
    { text: "Fine.", stars: 4, date: "2026-05-01T00:00:00.000Z" },
    { text: "Sixth review should be dropped.", stars: 5, date: "2026-04-01T00:00:00.000Z" },
  ],
  mock: null,
};

const signals = {
  hasWebsite: true,
  siteReachable: true,
  https: true,
  mobileViewport: true,
  onlineBooking: false,
  bookingTool: null,
  clickToCall: true,
  socialLinks: [],
  copyrightYear: 2021,
  pagespeedMobile: 31,
};

function factsOf(req) {
  const text = req.messages[0].content;
  return JSON.parse(text.slice(text.indexOf("{")));
}

function objectNodes(schema, path = "schema", out = []) {
  if (schema && typeof schema === "object") {
    if (schema.type === "object") out.push([path, schema]);
    for (const [key, value] of Object.entries(schema)) objectNodes(value, `${path}.${key}`, out);
  }
  return out;
}

test("builds a Messages API body with structured output and no unsupported params", () => {
  const req = buildClaudeRequest(lead, signals, config);
  assert.equal(req.model, "claude-haiku-5-5");
  assert.equal(req.max_tokens, 1500);
  assert.equal(typeof req.system, "string");
  assert.equal(req.messages.length, 1);
  assert.equal(req.messages[0].role, "user");
  for (const key of ["thinking", "temperature", "top_p", "top_k"]) assert.ok(!(key in req), `${key} must not be sent`);
  assert.deepEqual(req.output_config, { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } });
});

test("defaults the model when config has none", () => {
  const req = buildClaudeRequest(lead, signals, { ...config, model: undefined });
  assert.equal(req.model, "claude-haiku-5-5");
});

test("schema is closed at every object level and has no length limits", () => {
  const nodes = objectNodes(AI_SCHEMA);
  assert.ok(nodes.length >= 2, "top level and findings item");
  for (const [path, node] of nodes) {
    assert.equal(node.additionalProperties, false, path);
    assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), path);
  }
  assert.deepEqual(AI_SCHEMA.required.sort(), ["complaintCount", "findings", "firstLine", "pitch", "reviewThemes"]);
  assert.deepEqual(AI_SCHEMA.properties.findings.items.properties.severity.enum, ["high", "medium", "low"]);
  assert.doesNotMatch(JSON.stringify(AI_SCHEMA), /minItems|maxItems|maxLength|minLength/);
});

test("facts carry name, rating, signals and 5 truncated reviews, but no phone or email", () => {
  const req = buildClaudeRequest(lead, signals, config);
  const sent = JSON.stringify(req);
  assert.ok(!sent.includes("555-0129"), "phone leaked");
  assert.ok(!sent.includes("owner@prairie-gate.example"), "email leaked");
  assert.doesNotMatch(req.messages[0].content, /"(phone|email)"/);

  const facts = factsOf(req);
  assert.equal(facts.name, "Prairie Gate Roofing Pros");
  assert.equal(facts.rating, 3.8);
  assert.equal(facts.reviewCount, 41);
  assert.equal(facts.website, "https://prairie-gate-roofing-pros.example");
  assert.deepEqual(facts.signals, signals);
  assert.equal(facts.reviews.length, 5);
  assert.ok(facts.reviews[1].text.length <= 300);
  assert.deepEqual(Object.keys(facts.reviews[0]).sort(), ["date", "stars", "text"]);
});

test("missing signals are sent as null, not dropped", () => {
  const req = buildClaudeRequest({ name: "X", rating: 4.1, reviewCount: 30, website: null, reviews: [] }, { hasWebsite: false }, config);
  const facts = factsOf(req);
  assert.equal(facts.signals.hasWebsite, false);
  assert.equal(facts.signals.pagespeedMobile, null);
  assert.equal(Object.keys(facts.signals).length, 10);
  assert.deepEqual(facts.reviews, []);
});

test("system prompt names the agency and its offer", () => {
  const req = buildClaudeRequest(lead, signals, config);
  assert.match(req.system, /Apex Growth Agency/);
  assert.match(req.system, /websites with online booking, Google review growth and local ads/);
});

const goodAi = {
  findings: [
    { label: "No online booking", detail: "Site has no way to book an estimate online.", severity: "high" },
    { label: "Slow mobile site", detail: "PageSpeed mobile 31/100.", severity: "medium" },
  ],
  reviewThemes: ["slow callbacks", "repeat leaks"],
  complaintCount: 2,
  firstLine: "Your homepage scores 31/100 on Google's mobile speed test.",
  pitch: "A faster site with online booking would help. Worth a quick call?",
};

function fakeResponse(overrides = {}) {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text: JSON.stringify(goodAi) },
    ],
    stop_reason: "end_turn",
    usage: { input_tokens: 812, output_tokens: 240 },
    ...overrides,
  };
}

test("parses the text block after a thinking block", () => {
  const out = parseClaudeResponse(fakeResponse());
  assert.equal(out.error, null);
  assert.deepEqual(out.ai, { ...goodAi, aiSource: "claude-haiku-5-5" });
  assert.deepEqual(out.usage, { inputTokens: 812, outputTokens: 240 });
});

test("aiSource falls back to 'claude' and usage to 0", () => {
  const out = parseClaudeResponse(fakeResponse({ model: undefined, usage: undefined }));
  assert.equal(out.ai.aiSource, "claude");
  assert.deepEqual(out.usage, { inputTokens: 0, outputTokens: 0 });
});

function assertFails(resp, pattern) {
  const out = parseClaudeResponse(resp);
  assert.equal(out.ai, null);
  assert.match(out.error, pattern);
  return out;
}

test("refusal fails with a reason and keeps usage", () => {
  const out = assertFails(fakeResponse({ stop_reason: "refusal" }), /refus/i);
  assert.equal(out.usage.outputTokens, 240);
});

test("max_tokens fails", () => {
  assertFails(fakeResponse({ stop_reason: "max_tokens" }), /max_tokens/);
});

test("bad JSON fails", () => {
  assertFails(fakeResponse({ content: [{ type: "text", text: "{not json" }] }), /json/i);
});

test("missing text block fails", () => {
  assertFails(fakeResponse({ content: [{ type: "thinking", thinking: "" }] }), /text/i);
});

test("missing or wrong-typed fields fail", () => {
  const { pitch, ...noPitch } = goodAi;
  assertFails(fakeResponse({ content: [{ type: "text", text: JSON.stringify(noPitch) }] }), /pitch/);
  const badSeverity = { ...goodAi, findings: [{ label: "a", detail: "b", severity: "urgent" }] };
  assertFails(fakeResponse({ content: [{ type: "text", text: JSON.stringify(badSeverity) }] }), /severity/);
  const badCount = { ...goodAi, complaintCount: 1.5 };
  assertFails(fakeResponse({ content: [{ type: "text", text: JSON.stringify(badCount) }] }), /complaintCount/);
});

test("API error bodies and empty input fail without throwing", () => {
  assertFails({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, /Overloaded/);
  assertFails(null, /response/i);
});
