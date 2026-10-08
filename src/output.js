// Ranks the scored leads and builds the two export files: leads.json and leads.csv.
// Each row is a merged lead: Lead fields + signals + Ai fields + score fields (+ optional usage).

// USD per million tokens, from platform.claude.com pricing, Oct 2026.
const PRICES = {
  "claude-haiku-5-5": { in: 0.10, out: 0.50 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
};

const CSV_HEADER = ["rank", "tier", "score", "name", "phone", "website", "rating", "review_count", "top_findings", "first_line", "pitch", "maps_url"];

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toJsonLead(row, rank) {
  return {
    rank,
    placeId: row.placeId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    website: row.website,
    mapsUrl: row.mapsUrl,
    rating: row.rating,
    reviewCount: row.reviewCount,
    socials: row.socials,
    email: row.email,
    signals: row.signals,
    findings: row.findings,
    reviewThemes: row.reviewThemes,
    complaintCount: row.complaintCount,
    score: row.score,
    tier: row.tier,
    scoreReasons: row.scoreReasons,
    firstLine: row.firstLine,
    pitch: row.pitch,
    aiSource: row.aiSource,
  };
}

function toCsvLine(lead) {
  const topFindings = (lead.findings || []).map((f) => f.label).join("; ");
  return [
    lead.rank, lead.tier, lead.score, lead.name, lead.phone, lead.website, lead.rating,
    lead.reviewCount, topFindings, lead.firstLine, lead.pitch, lead.mapsUrl,
  ].map(csvCell).join(",");
}

function buildOutput(rows, meta) {
  const sorted = [...rows].sort((a, b) => b.score - a.score || (b.reviewCount || 0) - (a.reviewCount || 0));
  const leads = sorted.map((row, i) => toJsonLead(row, i + 1));

  const tierCounts = { hot: 0, warm: 0, cold: 0 };
  let inputTokens = 0;
  let outputTokens = 0;
  for (const row of rows) {
    tierCounts[row.tier] += 1;
    inputTokens += (row.usage && row.usage.inputTokens) || 0;
    outputTokens += (row.usage && row.usage.outputTokens) || 0;
  }

  const useClaude = meta.ai === "claude";
  const price = (useClaude && PRICES[meta.model]) || { in: 0, out: 0 };
  const cost = (inputTokens * price.in + outputTokens * price.out) / 1e6;

  const json = {
    meta: {
      agency: meta.agency,
      niche: meta.niche,
      city: meta.city,
      dataSource: meta.dataSource,
      ai: meta.ai,
      model: useClaude ? meta.model : null,
      generatedAt: meta.generatedAt,
      durationSeconds: Math.round(meta.durationSeconds * 10) / 10,
      leadCount: leads.length,
      tierCounts,
      claudeInputTokens: inputTokens,
      claudeOutputTokens: outputTokens,
      claudeCostUsd: Number(cost.toFixed(4)),
      demoBuild: true,
    },
    leads,
  };
  const csv = [CSV_HEADER.join(","), ...leads.map(toCsvLine)].join("\n") + "\n";
  return { json, csv };
}

// @n8n-strip-below
module.exports = { buildOutput, PRICES };
