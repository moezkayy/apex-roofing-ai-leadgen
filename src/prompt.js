// Builds the Claude Messages API request for one lead and parses the reply into Ai.
// n8n sends the body with an HTTP Request node; headers and the API key live there.

const prompt_DEFAULT_MODEL = "claude-haiku-5-5";
const prompt_MAX_REVIEWS = 5;
const prompt_MAX_REVIEW_CHARS = 300;
const prompt_SIGNAL_KEYS = [
  "hasWebsite", "siteReachable", "https", "mobileViewport", "onlineBooking",
  "bookingTool", "clickToCall", "socialLinks", "copyrightYear", "pagespeedMobile",
];
const prompt_SEVERITIES = ["high", "medium", "low"];

// Limits (2-4 findings, word counts) are in the prompt: structured outputs don't support min/max keywords.
const AI_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: prompt_SEVERITIES },
        },
        required: ["label", "detail", "severity"],
        additionalProperties: false,
      },
    },
    reviewThemes: { type: "array", items: { type: "string" } },
    complaintCount: { type: "integer" },
    firstLine: { type: "string" },
    pitch: { type: "string" },
  },
  required: ["findings", "reviewThemes", "complaintCount", "firstLine", "pitch"],
  additionalProperties: false,
};

function prompt_systemPrompt(config) {
  const agency = config.agencyName || "our agency";
  const offer = config.agencyOffer || "marketing services";
  const where = config.city ? ` in ${config.city}` : "";
  return `You are a senior local-marketing analyst at ${agency}, which offers ${offer}. You review one local business${where} at a time and write the notes a salesperson uses for a first cold email.

Use ONLY the facts in the user message. They come from the business's Google Maps listing, an automated check of its homepage, and its most recent reviews. A null value means we could not check, so never claim it either way. Never invent numbers, names, prices, awards, or outcomes.

Return:

findings: 2 to 4 items, the most commercially important first. Each one must point to a specific fact, for example "PageSpeed mobile 31/100", "no online booking", or "2 of the last 5 reviews mention slow callbacks". label is a short name (2 to 5 words). detail is one sentence stating the fact and why it costs the business jobs. severity is "high" if it likely loses customers today, "medium" if it weakens trust or search ranking, "low" if it is polish. If hasWebsite is false, "no website" is the first finding and is high.

reviewThemes: short themes (2 to 4 words each) that come up in the given reviews, good or bad. Empty list if there are no reviews.

complaintCount: how many of the given reviews complain about something. 0 if there are no reviews.

firstLine: one cold-email opening sentence, 25 words or fewer. It mentions ONE concrete fact from the findings, sounds like a real person wrote it, and talks to the owner directly. No flattery, no clichés such as "I came across" or "I hope this finds you well", no exclamation marks.

pitch: exactly 2 sentences, 60 words or fewer in total. The first connects the gap from firstLine to what ${agency} offers. The second is a soft, low-pressure call to action, such as asking if they are open to a short call. No guarantees, no statistics, no invented results.

Write in plain American English.`;
}

function prompt_facts(lead, signals) {
  const s = signals || {};
  const reviews = Array.isArray(lead.reviews) ? lead.reviews : [];
  const facts = {
    name: lead.name ?? null,
    rating: lead.rating ?? null,
    reviewCount: lead.reviewCount ?? null,
    website: lead.website ?? null,
    signals: Object.fromEntries(prompt_SIGNAL_KEYS.map((key) => [key, s[key] ?? null])),
    reviews: reviews.slice(0, prompt_MAX_REVIEWS).map((r) => ({
      text: typeof r.text === "string" ? r.text.slice(0, prompt_MAX_REVIEW_CHARS) : null,
      stars: r.stars ?? null,
      date: r.date ?? null,
    })),
  };
  return `Facts about this business (JSON):\n${JSON.stringify(facts)}`;
}

function buildClaudeRequest(lead, signals, config) {
  const cfg = config || {};
  return {
    model: cfg.model || prompt_DEFAULT_MODEL,
    max_tokens: 1500,
    system: prompt_systemPrompt(cfg),
    messages: [{ role: "user", content: prompt_facts(lead || {}, signals) }],
    output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
  };
}

// Returns an error message, or null if the object matches AI_SCHEMA.
function prompt_shapeError(ai) {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return "reply is not an object";
  if (!Array.isArray(ai.findings)) return "findings is not a list";
  for (const f of ai.findings) {
    if (!f || typeof f.label !== "string" || typeof f.detail !== "string") return "finding needs label and detail";
    if (!prompt_SEVERITIES.includes(f.severity)) return `bad severity: ${f.severity}`;
  }
  if (!Array.isArray(ai.reviewThemes) || !ai.reviewThemes.every((t) => typeof t === "string")) return "reviewThemes is not a list of strings";
  if (!Number.isInteger(ai.complaintCount) || ai.complaintCount < 0) return "complaintCount is not a whole number";
  if (typeof ai.firstLine !== "string" || !ai.firstLine.trim()) return "missing firstLine";
  if (typeof ai.pitch !== "string" || !ai.pitch.trim()) return "missing pitch";
  return null;
}

function parseClaudeResponse(resp) {
  const usage = {
    inputTokens: (resp && resp.usage && resp.usage.input_tokens) || 0,
    outputTokens: (resp && resp.usage && resp.usage.output_tokens) || 0,
  };
  const fail = (error) => ({ ai: null, usage, error });

  if (!resp || typeof resp !== "object") return fail("no response");
  if (resp.type === "error" || resp.error) return fail(`API error: ${(resp.error && resp.error.message) || "unknown"}`);
  if (resp.stop_reason === "refusal") return fail("Claude refused this request");
  if (resp.stop_reason === "max_tokens") return fail("reply cut off at max_tokens");

  const block = (resp.content || []).find((b) => b && b.type === "text");
  if (!block) return fail("no text block in reply");

  let parsed;
  try {
    parsed = JSON.parse(block.text);
  } catch (e) {
    return fail("reply is not valid JSON");
  }
  const shapeError = prompt_shapeError(parsed);
  if (shapeError) return fail(shapeError);

  const ai = {
    findings: parsed.findings.map((f) => ({ label: f.label, detail: f.detail, severity: f.severity })),
    reviewThemes: parsed.reviewThemes,
    complaintCount: parsed.complaintCount,
    firstLine: parsed.firstLine,
    pitch: parsed.pitch,
    aiSource: resp.model || "claude",
  };
  return { ai, usage, error: null };
}

// @n8n-strip-below
module.exports = { buildClaudeRequest, parseClaudeResponse, AI_SCHEMA };
