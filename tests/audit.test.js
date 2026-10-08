const test = require("node:test");
const assert = require("node:assert/strict");
const { auditSite } = require("../src/audit.js");

const URL = "https://roof.example";
const audit = (html, url = URL, pagespeed = null) => auditSite(html, url, pagespeed, 2026);

test("no html means every html signal is unknown", () => {
  for (const html of [null, undefined, ""]) {
    assert.deepEqual(audit(html, URL, 41), {
      hasWebsite: true,
      siteReachable: false,
      https: true,
      mobileViewport: null,
      onlineBooking: null,
      bookingTool: null,
      clickToCall: null,
      socialLinks: null,
      copyrightYear: null,
      pagespeedMobile: 41,
    });
  }
});

test("no website at all", () => {
  const s = audit(null, null);
  assert.equal(s.hasWebsite, false);
  assert.equal(s.siteReachable, false);
  assert.equal(s.https, null);
});

test("https comes from the url scheme", () => {
  assert.equal(audit("<p>hi</p>", "https://a.example").https, true);
  assert.equal(audit("<p>hi</p>", "HTTP://a.example").https, false);
});

test("plain page gives false/empty, not null", () => {
  const s = audit("<html><body><p>Roofing</p></body></html>");
  assert.equal(s.siteReachable, true);
  assert.equal(s.mobileViewport, false);
  assert.equal(s.onlineBooking, false);
  assert.equal(s.bookingTool, null);
  assert.equal(s.clickToCall, false);
  assert.deepEqual(s.socialLinks, []);
  assert.equal(s.copyrightYear, null);
});

test("detects the viewport meta", () => {
  assert.equal(audit('<meta name="viewport" content="width=device-width">').mobileViewport, true);
  assert.equal(audit("<meta name='Viewport' content='x'>").mobileViewport, true);
  assert.equal(audit('<meta name="description" content="viewport">').mobileViewport, false);
});

test("detects each booking tool", () => {
  const cases = {
    "https://calendly.com/roof/estimate": "Calendly",
    "https://embed.housecallpro.com/widget.js": "Housecall Pro",
    "https://cdn.getjobber.com/jobber.com/booking.js": "Jobber",
    "https://scheduler.servicetitan.com/embed.js": "ServiceTitan",
    "https://app.acuityscheduling.com/schedule.php": "Acuity Scheduling",
    "https://squareup.com/appointments/book/abc": "Square Appointments",
  };
  for (const [src, tool] of Object.entries(cases)) {
    const s = audit(`<script src="${src}"></script>`);
    assert.equal(s.onlineBooking, true, src);
    assert.equal(s.bookingTool, tool, src);
  }
});

test("detects generic booking links and buttons", () => {
  const texts = [
    "Book Online",
    "Schedule an Estimate",
    "schedule inspection",
    "Schedule an appointment",
    "Request a quote online",
    "request quote online",
  ];
  for (const t of texts) {
    const s = audit(`<a href="/x"><span>${t}</span></a>`);
    assert.equal(s.onlineBooking, true, t);
    assert.equal(s.bookingTool, "generic", t);
  }
  assert.equal(audit("<button>Book online</button>").bookingTool, "generic");
});

test("booking words outside links don't count", () => {
  const s = audit("<p>Call to schedule an estimate.</p><a href='/q'>Request a quote</a>");
  assert.equal(s.onlineBooking, false);
  assert.equal(s.bookingTool, null);
});

test("detects click-to-call", () => {
  assert.equal(audit('<a href="tel:+12145550100">Call</a>').clickToCall, true);
  assert.equal(audit("<p>(214) 555-0100</p>").clickToCall, false);
});

test("lists social hosts once each", () => {
  const html = `
    <a href="https://www.facebook.com/a">f</a><a href="https://facebook.com/b">f</a>
    <a href="https://instagram.com/a">i</a><a href="https://youtube.com/@a">y</a>
    <a href="https://www.tiktok.com/@a">t</a><a href="https://linkedin.com/company/a">l</a>
    <a href="https://x.com/a">x</a><a href="https://twitter.com/a">tw</a>
    <a href="https://notfacebook.com/a">no</a>`;
  assert.deepEqual(audit(html).socialLinks, [
    "facebook.com", "instagram.com", "youtube.com", "tiktok.com", "linkedin.com", "x.com", "twitter.com",
  ]);
});

test("copyright year: largest year next to the mark, within 2000..now", () => {
  assert.equal(audit("<footer>&copy; 2023 Roof Co</footer>").copyrightYear, 2023);
  assert.equal(audit("<footer>© 2019–2024 Roof Co</footer>").copyrightYear, 2024);
  assert.equal(audit("<footer>Copyright 2017 Roof Co</footer>").copyrightYear, 2017);
  assert.equal(audit("<footer>&#169; 2021</footer>").copyrightYear, 2021);
  assert.equal(audit("<footer>© 1998, 2031 Roof Co</footer>").copyrightYear, null);
  assert.equal(audit("<p>Since 2015</p><footer>© Roof Co</footer>").copyrightYear, null);
});

test("pagespeed passes through as an int or null", () => {
  assert.equal(audit("<p>x</p>", URL, 47).pagespeedMobile, 47);
  assert.equal(audit("<p>x</p>", URL, 47.6).pagespeedMobile, 48);
  assert.equal(audit("<p>x</p>", URL, null).pagespeedMobile, null);
  assert.equal(audit("<p>x</p>", URL, "fast").pagespeedMobile, null);
});
