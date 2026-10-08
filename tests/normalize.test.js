const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePlace } = require("../src/normalize.js");
const sample = require("../data/sample_roofers.json");

test("maps the first sample item to a Lead", () => {
  const lead = normalizePlace(sample[0]);
  assert.equal(lead.placeId, "mock_001");
  assert.equal(lead.name, "Prairie Gate Roofing Pros");
  assert.equal(lead.address, "1058 Laurel Crest Way , Dallas, TX 75235");
  assert.equal(lead.phone, "(214) 555-0129");
  assert.equal(lead.website, "https://prairie-gate-roofing-pros.example");
  assert.equal(lead.mapsUrl, sample[0].url);
  assert.equal(lead.rating, 3.3);
  assert.equal(lead.reviewCount, 286);
  assert.equal(lead.category, "Roofing contractor");
  assert.equal(lead.permanentlyClosed, false);
  assert.deepEqual(lead.socials, {
    facebook: null,
    instagram: "https://instagram.com/prairie-gate-roofing-pros",
  });
  assert.equal(lead.email, null);
  assert.equal(lead.reviews.length, 5);
  assert.deepEqual(lead.reviews[0], {
    text: "Helped us with the adjuster visit and got the claim approved.",
    stars: 5,
    date: "2026-09-26T15:42:00.000Z",
  });
  assert.deepEqual(lead.mock, sample[0].mock);
});

test("reviews are sorted newest first", () => {
  const dates = normalizePlace(sample[0]).reviews.map((r) => r.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("a minimal item gets nulls and empty arrays", () => {
  const lead = normalizePlace({ title: "  Tiny Roofing  ", website: "", phone: "   " });
  assert.deepEqual(lead, {
    placeId: null,
    name: "Tiny Roofing",
    address: null,
    phone: null,
    website: null,
    mapsUrl: null,
    rating: null,
    reviewCount: null,
    category: null,
    permanentlyClosed: null,
    socials: { facebook: null, instagram: null },
    email: null,
    reviews: [],
    mock: null,
  });
});

test("keeps the 5 newest reviews and drops empty texts", () => {
  const reviews = [
    { text: "one", stars: 5, publishedAtDate: "2026-01-01T00:00:00.000Z" },
    { text: "  ", stars: 1, publishedAtDate: "2026-09-01T00:00:00.000Z" },
    { text: null, stars: 1, publishedAtDate: "2026-09-02T00:00:00.000Z" },
    { text: " two ", stars: 4, publishedAtDate: "2026-02-01T00:00:00.000Z" },
    { text: "three", stars: 3, publishedAtDate: "2026-03-01T00:00:00.000Z" },
    { text: "four", stars: 2, publishedAtDate: "2026-04-01T00:00:00.000Z" },
    { text: "five", stars: 1, publishedAtDate: "2026-05-01T00:00:00.000Z" },
    { text: "six", stars: 5, publishedAtDate: "2026-06-01T00:00:00.000Z" },
    { text: "undated" },
  ];
  const lead = normalizePlace({ reviews });
  assert.deepEqual(lead.reviews.map((r) => r.text), ["six", "five", "four", "three", "two"]);
});

test("undated reviews still count when there is room", () => {
  const lead = normalizePlace({ reviews: [{ text: "undated" }, { text: "dated", publishedAtDate: "2026-01-01" }] });
  assert.deepEqual(lead.reviews, [
    { text: "dated", stars: null, date: "2026-01-01" },
    { text: "undated", stars: null, date: null },
  ]);
});

test("takes the first social link and email", () => {
  const lead = normalizePlace({
    facebooks: [" https://facebook.com/a ", "https://facebook.com/b"],
    instagrams: [],
    emails: ["hi@a.example", "b@a.example"],
    permanentlyClosed: true,
    reviewsCount: 0,
  });
  assert.equal(lead.socials.facebook, "https://facebook.com/a");
  assert.equal(lead.socials.instagram, null);
  assert.equal(lead.email, "hi@a.example");
  assert.equal(lead.permanentlyClosed, true);
  assert.equal(lead.reviewCount, 0);
});
