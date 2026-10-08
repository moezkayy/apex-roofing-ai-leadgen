// Turns one Apify Google Maps Scraper item into a Lead.
// Missing values become null, missing lists become [].

const MAX_REVIEWS = 5;

function cleanText(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstText(list) {
  return Array.isArray(list) ? cleanText(list.find((v) => cleanText(v) != null)) : null;
}

// Newest first; undated reviews go last. Empty texts are dropped.
function newestReviews(reviews) {
  if (!Array.isArray(reviews)) return [];
  return reviews
    .map((r) => ({
      text: cleanText(r && r.text),
      stars: numberOrNull(r && r.stars),
      date: cleanText(r && r.publishedAtDate),
    }))
    .filter((r) => typeof r.text === "string")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, MAX_REVIEWS);
}

function normalizePlace(item) {
  return {
    placeId: cleanText(item.placeId),
    name: cleanText(item.title),
    address: cleanText(item.address),
    phone: cleanText(item.phone),
    website: cleanText(item.website),
    mapsUrl: cleanText(item.url),
    rating: numberOrNull(item.totalScore),
    reviewCount: numberOrNull(item.reviewsCount),
    category: cleanText(item.categoryName),
    permanentlyClosed: typeof item.permanentlyClosed === "boolean" ? item.permanentlyClosed : null,
    socials: {
      facebook: firstText(item.facebooks),
      instagram: firstText(item.instagrams),
    },
    email: firstText(item.emails),
    reviews: newestReviews(item.reviews),
    mock: item.mock || null,
  };
}

// @n8n-strip-below
module.exports = { normalizePlace };
