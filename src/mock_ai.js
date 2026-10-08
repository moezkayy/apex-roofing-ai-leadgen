// Offline stand-in for the Claude step. Returns the same Ai shape, built from rules.
// A cached Claude reply in lead.mock.ai wins; otherwise findings come from Signals and reviews.

const mockAi_COMPLAINT = /call back|callback|never showed|no-show|leak(ed)? again|still leak|didn't return|rude|\blate\b/i;
const mockAi_THEMES = [
  [/call back|callback|didn't return|never heard back/i, "slow callbacks"],
  [/never showed|no-show/i, "missed appointments"],
  [/leak(ed)? again|still leak/i, "repeat leaks"],
  [/rude/i, "rude staff"],
  [/\blate\b/i, "late crews"],
  [/on time|one day|quick|fast/i, "on-time crews"],
  [/clean/i, "clean job sites"],
  [/claim|adjuster|insurance/i, "help with insurance claims"],
  [/honest|fair price|price was fair|saved us/i, "honest pricing"],
];
const mockAi_SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

function mockAi_hash(text) {
  let h = 5381;
  for (const ch of String(text || "")) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h;
}

function mockAi_themes(reviews) {
  const counts = mockAi_THEMES
    .map(([pattern, theme]) => [theme, reviews.filter((r) => pattern.test(r.text || "")).length])
    .filter(([, n]) => n > 0);
  return counts.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([theme]) => theme);
}

// Each finding carries a `hook` (a clause for the first line) and a `gap` (a noun phrase for the pitch).
function mockAi_findings(lead, s, reviews, complaints) {
  const out = [];
  const add = (severity, label, detail, hook, gap) => out.push({ severity, label, detail, hook, gap });
  const n = reviews.length;

  if (s.hasWebsite === false) {
    add("high", "No website", "The Google listing has no website, so searchers can't check work or get in touch online.",
      "your Google listing doesn't link to a website", "Not having a website");
  } else if (s.siteReachable === false) {
    add("high", "Website didn't load", "The listed website didn't load when we checked it.",
      "your website didn't load when I tried it", "A website that doesn't load");
  }
  if (s.onlineBooking === false) {
    add("high", "No online booking", "The homepage has no way to book an estimate or inspection online.",
      "your site doesn't offer a way to book an estimate online", "Missing online booking");
  }
  if (complaints.length >= 2) {
    const theme = mockAi_themes(complaints)[0] || "problems";
    add("high", "Repeated review complaints", `${complaints.length} of the last ${n} reviews complain, mostly about ${theme}.`,
      `${complaints.length} of your ${n} most recent Google reviews mention ${theme}`, "A run of negative reviews");
  }
  if (typeof s.pagespeedMobile === "number" && s.pagespeedMobile < 50) {
    add(s.pagespeedMobile < 35 ? "high" : "medium", "Slow mobile site", `PageSpeed mobile ${s.pagespeedMobile}/100.`,
      `your homepage scores ${s.pagespeedMobile}/100 on Google's mobile speed test`, "A slow mobile site");
  }
  if (typeof lead.rating === "number" && lead.rating < 4) {
    add("medium", "Rating below 4 stars", `Google rating is ${lead.rating}★ from ${lead.reviewCount ?? "a few"} reviews.`,
      `your Google rating sits at ${lead.rating} stars`, "A rating under 4 stars");
  }
  if (complaints.length === 1) {
    const theme = mockAi_themes(complaints)[0] || "a problem";
    add("medium", "Recent review complaint", `1 of the last ${n} reviews complains about ${theme}.`,
      `one of your ${n} most recent Google reviews mentions ${theme}`, "An unanswered review complaint");
  }
  if (s.mobileViewport === false) {
    add("medium", "Not mobile friendly", "The homepage has no mobile viewport tag, so it renders poorly on phones.",
      "your site isn't set up for phone screens", "A site that doesn't fit phone screens");
  }
  if (s.https === false) {
    add("medium", "No HTTPS", "The website loads over plain HTTP, which browsers flag as not secure.",
      "your website still loads without HTTPS", "A site browsers mark as not secure");
  }
  if (s.clickToCall === false) {
    add("low", "No tap-to-call", "The phone number on the site isn't a tappable link.",
      "your phone number isn't tappable on the site", "A phone number visitors can't tap");
  }
  if (typeof s.copyrightYear === "number" && s.copyrightYear <= 2023) {
    add("low", "Dated website", `The footer copyright says ${s.copyrightYear}.`,
      `your site footer still says ${s.copyrightYear}`, "A site that looks out of date");
  }
  if (Array.isArray(s.socialLinks) && s.socialLinks.length === 0) {
    add("low", "No social links", "The homepage doesn't link to any social profiles.",
      "your site doesn't link to any social profiles", "A site with no social links");
  }
  if (out.length < 2 && typeof lead.rating === "number" && lead.rating >= 4) {
    add("low", "Strong rating to build on", `Google rating is ${lead.rating}★ from ${lead.reviewCount ?? "a few"} reviews.`,
      `you have a ${lead.rating}-star Google rating`, "A strong rating that few searchers see");
  }
  if (out.length < 2 && typeof lead.reviewCount === "number" && lead.reviewCount < 20) {
    add("low", "Few reviews", `Only ${lead.reviewCount} Google reviews.`,
      `you have ${lead.reviewCount} Google reviews so far`, "A thin review count");
  }

  // Stable sort keeps the order above (commercial importance) within each severity.
  return out
    .map((f, i) => [f, i])
    .sort((a, b) => mockAi_SEVERITY_RANK[a[0].severity] - mockAi_SEVERITY_RANK[b[0].severity] || a[1] - b[1])
    .map(([f]) => f)
    .slice(0, 4);
}

function mockAi_capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mockAi_firstLine(lead, top, cfg) {
  const where = cfg.city ? `roofers in ${cfg.city}` : "local roofers";
  const name = lead.name || "your business";
  const patterns = [
    (hook) => `Quick note: ${hook}.`,
    (hook) => `I was looking at ${where} and noticed ${hook}.`,
    (hook) => `Not sure if anyone has mentioned it, but ${hook}.`,
    (hook) => `While checking ${name} online, I saw that ${hook}.`,
  ];
  return patterns[mockAi_hash(lead.placeId) % patterns.length](top.hook);
}

function mockAi_pitch(top, cfg) {
  const agency = cfg.agencyName || "our agency";
  const offer = cfg.agencyOffer || "websites and local marketing";
  return `${top.gap} is the kind of gap ${agency} closes with ${offer}. Would you be open to a short call next week to see what that could look like?`;
}

function mockAi(lead, signals, config) {
  const l = lead || {};
  if (l.mock && l.mock.ai) return { ...l.mock.ai, aiSource: l.mock.ai.aiSource || "claude (cached)" };

  const cfg = config || {};
  const reviews = Array.isArray(l.reviews) ? l.reviews.slice(0, 5) : [];
  const complaints = reviews.filter((r) => mockAi_COMPLAINT.test(r.text || ""));
  const found = mockAi_findings(l, signals || {}, reviews, complaints);
  const top = found[0] || {
    hook: "your Google listing has room to bring in more calls",
    gap: "Room to grow on Google",
  };

  return {
    findings: found.map((f) => ({ label: f.label, detail: f.detail, severity: f.severity })),
    reviewThemes: mockAi_themes(reviews),
    complaintCount: complaints.length,
    firstLine: mockAi_firstLine(l, top, cfg),
    pitch: mockAi_pitch(top, cfg),
    aiSource: "template (offline)",
  };
}

// @n8n-strip-below
module.exports = { mockAi };
