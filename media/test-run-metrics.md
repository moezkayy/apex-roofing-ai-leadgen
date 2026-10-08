# Test-run metrics: AI Lead Generation System (demo build)

Demo build for the Upwork portfolio. Not client work. All numbers below come from real test runs on 2026-10-08 (`output/leads.json` meta plus wall-clock timing).

## Main run: 50 live leads

| | |
|---|---|
| Date | 2026-10-08 |
| Data source | Google Maps via Apify (search: "roofing contractor", Dallas, TX) |
| AI | Claude Haiku (`claude-haiku-5-5`) |
| Leads scored | 50 |
| End-to-end time | 308 s (about 5 min; scrape, website checks, Claude, scoring, export) |
| Tiers (all 50) | 2 hot · 5 warm · 43 cold |
| Claude tokens | 78,855 input · 23,945 output |
| Claude cost | $0.0199 (about $0.0004 per lead) |
| Apify cost | $0.42 (from Apify Console) |
| PageSpeed | 18 of 50 requests returned a score; 28 were rate-limited (HTTP 429), 4 failed (2 invalid URL, 2 site would not load) |
| Kept for the demo | 24 leads with a complete audit (9 with no website, 15 with homepage + PageSpeed results); 26 with failed checks were dropped |
| Tiers (24 kept) | 2 hot · 2 warm · 20 cold |

## Smaller test runs

| Run | Leads | Time | Claude cost |
|---|---|---|---|
| Sample data + Claude | 5 | 7.7 s | $0.002 |
| Live Apify + Claude | 3 | 180.8 s | $0.0014 |

## Quality check

- All 50 opening lines were written by Claude. 49 of 50 were 25 words or fewer.
- Manual spot check of 5 live leads against their real homepages: 10 of 15 findings were correct. The 5 wrong or doubtful ones came from the website-audit rules (an http listing URL that redirects to https, a Facebook page used as the website, a booking button drawn by JavaScript), not from Claude making things up.

## Caveats

Demo build: scores are heuristic and the website checks are simple HTML rules, so some findings can be wrong. Every email draft is reviewed by a human before anything is sent; this build sends nothing.
