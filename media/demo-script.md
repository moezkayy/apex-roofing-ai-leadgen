# Demo video script: AI Lead Generation System (demo build)

Target: 60–90 s, 1080p, under 100 MB, burned-in captions. Label on screen: "Demo build". All numbers are from `media/test-run-metrics.md`.

## 1. Hook, 0–8 s (motion graphic)
- Visual: map pin grid of Dallas fills with roofing pins, then collapses into a ranked list.
- On-screen text: **"50 Dallas roofers, audited and ranked in about 5 minutes."**
- Voiceover: "Your next 50 roofing clients, audited and ranked in about five minutes."
- Corner tag: "Demo build"

## 2. Architecture, 8–25 s (animated)
Animate each stage lighting up left to right:
Config → Apify Google Maps (or sample data) → homepage fetch + PageSpeed → audit signals → Claude Haiku 5.5 (structured JSON) or offline mock → score and rank → leads.json / CSV → dashboard.
- On-screen text: "Evidence in, judgment out" · "Drafts only, a human sends"
- Voiceover: "n8n pulls listings from Google Maps, checks every website and its speed, then Claude writes the pitch from facts that were actually measured."

## 3. Screen recording, 25–60 s
1. n8n canvas running, nodes turning green (25–35 s).
2. Dashboard list, sorted by score (35–42 s).
3. Open a hot lead: score reasons, audit findings (42–50 s).
4. Copy the email draft (50–56 s).
5. Export CSV (56–60 s).
- On-screen text: "Score reasons are shown" · "Copy draft" · "Export CSV"
- If the real run is shown, blur phone numbers. The public dashboard is fictional data.

## 4. Metrics, 60–75 s (real test run, 2026-10-08)
- 50 leads scored in 308 s
- Claude cost $0.0199 · Apify cost $0.42
- 49 of 50 opening lines 25 words or fewer
- Spot check: 10 of 15 findings correct on 5 live homepages
- Voiceover: "In a real test run: fifty leads, about five minutes, two cents of Claude. A spot check found ten of fifteen findings correct, and I say so."
- Footnote: "Demo build, not client results."

## 5. CTA, 75–90 s
- On-screen text: **"Want this for your niche? Message me on Upwork."**
- Voiceover: same line.

## Shot checklist
- [ ] n8n canvas at 1080p, zoomed so node names are readable
- [ ] Config node shown (mock vs real mode)
- [ ] Dashboard list and detail (`media/dashboard-list.png`, `media/dashboard-detail.png` as backups)
- [ ] Hot lead with score reasons visible
- [ ] Email draft copied
- [ ] CSV export opened
- [ ] Real phone numbers blurred
- [ ] "Demo build" tag visible throughout
- [ ] Captions burned in; file under 100 MB
