# Upwork portfolio entry: AI Lead Generation System (Demo build)

**Label:** Demo build / concept project. Not client work.

## Project title (≤ 70 chars)

AI Lead Generation: Google Maps Scrape, Site Audit, Scoring and Email Drafts

## Description

Marketing agencies that sell to local businesses spend hours picking prospects by hand and still send generic cold emails. For this demo build I made a fictional agency, Apex Growth Agency, and built a system that does the research for it.

An n8n workflow pulls Dallas roofers from Google Maps (Apify), checks each website (loads, mobile-friendly, online booking) and its Google PageSpeed score, and has Claude Haiku 5.5 read the facts and the recent reviews. Each lead gets a transparent score with written reasons, a hot/warm/cold tier, a personalised first line and a short pitch. Results export to JSON and CSV and show in a static dashboard. Drafts are never sent automatically; a human reviews them.

Real test run (2026-10-08): 50 leads scored end to end in 308 seconds, at $0.0199 for Claude and $0.42 for Apify. A manual spot check of 5 live leads found 10 of 15 findings correct; the misses came from simple website-audit rules. A mock mode runs the whole pipeline with no API keys.

Tools: n8n, Apify, Google PageSpeed Insights, Anthropic API (Claude Haiku 5.5), JavaScript.

## My role

Designed and built everything: workflow, audit and scoring rules, prompts, tests and dashboard.

## Skills

n8n, Workflow Automation, Lead Generation, AI Agent, Claude, Anthropic API, Apify, Web Scraping, Google Maps, Prompt Engineering, JavaScript, Cold Email, Marketing Automation, Data Enrichment, Dashboard
