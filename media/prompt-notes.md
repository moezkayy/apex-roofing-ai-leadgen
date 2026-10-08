# Prompt design notes (demo build)

- **Facts in, judgment out.** Claude gets one compact JSON block: name, rating, review count, website, the 10 site signals and up to 5 recent reviews (each cut to 300 characters). It's told to use only those facts, so every finding has to point at one of them ("PageSpeed mobile 31/100", "2 of the last 5 reviews mention slow callbacks").
- **Null means unknown.** If a check couldn't run, the field is null and the prompt says not to claim it either way. That keeps the AI from writing "your site isn't mobile friendly" about a site we never loaded.
- **No invented numbers.** No statistics, guarantees or made-up results in the pitch. The only numbers it can use are the ones we measured.
- **Phone and email are never sent.** Claude doesn't need them to write the copy, so they stay out of the request.
- **Word limits go in the prompt, the shape goes in the schema.** Structured outputs (`output_config.format`) guarantee valid JSON with the exact fields. Limits like 2–4 findings, a first line of 25 words or fewer and a pitch of 60 words or fewer are prompt rules, because the schema format doesn't support min/max keywords.
- **Cold-email rules are written out.** One concrete fact in the opener, no flattery clichés, no exclamation marks, and a soft call to action, so the lines read like a person checked the business.
- **Low effort on Haiku 5.5, for cost.** This is short, well-specified writing, not deep reasoning. `effort: "low"` and `max_tokens: 1500` keep the cost per lead low. Real per-lead token counts come from `usage` once live runs happen.
- **Offline fallback.** `mock_ai.js` returns the same shape from rules (keyword-matched complaints and one of 4 opener patterns picked by place ID), so the whole pipeline runs on camera without an API key.
