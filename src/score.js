// Scores a lead as an OPPORTUNITY for an agency that sells websites, online booking,
// review management and local ads. Higher = more to sell AND a real business that can pay.
//
// Rubric (additive; unknown/null signals add nothing):
//   Website
//     No website at all ......................... +40  the whole stack is a fit, biggest gap
//     No website, so no online booking either ... +15  booking is missing for certain, not just unknown
//     Website didn't load ....................... +20  broken site = lost calls, easy pitch
//     No mobile viewport ........................ +15  most local searches are on phones
//     No online booking ......................... +15  direct upsell
//     PageSpeed mobile < 30 / < 50 .............. +15 / +10
//     Copyright 4+ years old .................... +8   site likely unmaintained
//     No HTTPS .................................. +5   browser "not secure" warning
//     No social links on the site ............... +5
//   Reputation (review management / ads)
//     Rating < 4.0 / 4.0-4.3 .................... +10 / +5
//     2+ / 1 complaints in recent reviews ....... +10 / +5
//   Ability to pay
//     25+ / 10-24 reviews ....................... +10 / +5
//   Disqualified (permanently closed, or under 5 reviews, missing counts as 0):
//     cold, score capped at 20.
//
// Why no-website is 40 + 15 (the brief suggested 35): at 35 a no-website lead topped out
// in the 50s, below a site with a few small issues, and only 1 of 50 sample leads was hot.
// No website is the strongest case for this agency, so it now reaches hot with any
// reputation or size signal.
//
// Tiers: hot >= 70, warm 45-69, cold < 45. Reasons are sorted biggest first and, apart from
// the clamp at 100, add up to the score (the disqualify cap shows as negative points).

const DISQUALIFIED_CAP = 20;
const MIN_REVIEWS = 5;

function scoreTier(score) {
  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

function websiteReasons(signals, nowYear) {
  const reasons = [];
  const add = (points, reason) => reasons.push({ points, reason });
  if (signals.hasWebsite === false) {
    add(40, "No website at all");
    add(15, "No website, so no online booking either");
    return reasons;
  }
  if (signals.siteReachable === false) add(20, "Website didn't load");
  if (signals.mobileViewport === false) add(15, "Website isn't set up for phones");
  if (signals.onlineBooking === false) add(15, "No online booking on the website");
  const speed = signals.pagespeedMobile;
  if (speed != null && speed < 30) add(15, `Very slow on mobile (PageSpeed ${speed})`);
  else if (speed != null && speed < 50) add(10, `Slow on mobile (PageSpeed ${speed})`);
  if (signals.copyrightYear != null && nowYear - signals.copyrightYear >= 4) {
    add(8, `Website looks unmaintained (© ${signals.copyrightYear})`);
  }
  if (signals.https === false) add(5, "Website has no HTTPS");
  if (Array.isArray(signals.socialLinks) && signals.socialLinks.length === 0) {
    add(5, "Website doesn't link to any social profiles");
  }
  return reasons;
}

function businessReasons(lead, ai) {
  const reasons = [];
  const add = (points, reason) => reasons.push({ points, reason });
  const rating = lead.rating;
  if (rating != null && rating < 4.0) add(10, `Low Google rating (${rating}★)`);
  else if (rating != null && rating <= 4.3) add(5, `Google rating has room to grow (${rating}★)`);
  const complaints = ai && ai.complaintCount;
  if (complaints >= 2) add(10, `${complaints} complaints in recent reviews`);
  else if (complaints === 1) add(5, "1 complaint in recent reviews");
  const reviewCount = lead.reviewCount;
  if (reviewCount >= 25) add(10, `Established business (${reviewCount} reviews)`);
  else if (reviewCount >= 10) add(5, `Some track record (${reviewCount} reviews)`);
  return reasons;
}

function disqualifyReason(lead) {
  const problems = [];
  if (lead.permanentlyClosed) problems.push("permanently closed");
  const reviewCount = lead.reviewCount || 0;
  if (reviewCount < MIN_REVIEWS) problems.push(`only ${reviewCount} reviews`);
  return problems.length ? `Disqualified: ${problems.join(", ")}` : null;
}

function scoreLead(lead, signals, ai, nowYear = new Date().getFullYear()) {
  const scoreReasons = [...websiteReasons(signals, nowYear), ...businessReasons(lead, ai)];
  let total = scoreReasons.reduce((sum, r) => sum + r.points, 0);
  const disqualified = disqualifyReason(lead);
  if (disqualified) {
    const cut = Math.min(0, DISQUALIFIED_CAP - total);
    scoreReasons.push({ points: cut, reason: `${disqualified} (score capped at ${DISQUALIFIED_CAP})` });
    total += cut;
  }
  scoreReasons.sort((a, b) => b.points - a.points);
  const score = Math.round(Math.min(100, Math.max(0, total)));
  return { score, tier: disqualified ? "cold" : scoreTier(score), scoreReasons };
}

// @n8n-strip-below
module.exports = { scoreLead, scoreTier };
