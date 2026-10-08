// Reads a homepage's HTML and returns Signals.
// No HTML means we couldn't look, so every HTML-based signal is null (unknown), not false.

const BOOKING_TOOLS = [
  [/calendly\.com/i, "Calendly"],
  [/housecallpro\.com/i, "Housecall Pro"],
  [/jobber\.com/i, "Jobber"],
  [/servicetitan\.com/i, "ServiceTitan"],
  [/acuityscheduling\.com/i, "Acuity Scheduling"],
  [/squareup\.com\/appointments/i, "Square Appointments"],
];
const BOOKING_TEXT = /book online|schedule (an )?(estimate|inspection|appointment)|request (a )?quote online/i;
const SOCIAL_URL = /https?:\/\/(?:www\.|m\.)?(facebook|instagram|youtube|tiktok|linkedin|x|twitter)\.com\b/gi;

function findBookingTool(html) {
  for (const [pattern, name] of BOOKING_TOOLS) {
    if (pattern.test(html)) return name;
  }
  // Only link or button text counts, so "call to schedule an estimate" in a paragraph doesn't.
  for (const match of html.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    if (BOOKING_TEXT.test(text)) return "generic";
  }
  return null;
}

function findSocialHosts(html) {
  const hosts = [];
  for (const match of html.matchAll(SOCIAL_URL)) {
    const host = match[1].toLowerCase() + ".com";
    if (!hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

// Largest plausible year within a few characters after © or "copyright".
function findCopyrightYear(html, nowYear) {
  const text = html.replace(/&copy;|&#169;|&#xa9;/gi, "©");
  let best = null;
  for (const match of text.matchAll(/(?:©|copyright)([^<]{0,30})/gi)) {
    for (const yearText of match[1].match(/\b\d{4}\b/g) || []) {
      const year = Number(yearText);
      if (year >= 2000 && year <= nowYear && (best === null || year > best)) best = year;
    }
  }
  return best;
}

function auditSite(html, websiteUrl, pagespeedMobile, nowYear) {
  const hasHtml = typeof html === "string" && html.length > 0;
  const bookingTool = hasHtml ? findBookingTool(html) : null;
  return {
    hasWebsite: !!websiteUrl,
    siteReachable: hasHtml,
    https: websiteUrl ? /^https:\/\//i.test(websiteUrl) : null,
    mobileViewport: hasHtml ? /<meta\b[^>]*name\s*=\s*["']?viewport/i.test(html) : null,
    onlineBooking: hasHtml ? bookingTool !== null : null,
    bookingTool,
    clickToCall: hasHtml ? /href\s*=\s*["']?tel:/i.test(html) : null,
    socialLinks: hasHtml ? findSocialHosts(html) : null,
    copyrightYear: hasHtml ? findCopyrightYear(html, nowYear) : null,
    pagespeedMobile:
      typeof pagespeedMobile === "number" && Number.isFinite(pagespeedMobile) ? Math.round(pagespeedMobile) : null,
  };
}

// @n8n-strip-below
module.exports = { auditSite };
