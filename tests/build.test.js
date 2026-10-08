const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "leadgen-build-"));
execFileSync("node", ["scripts/build_workflow.mjs"], { cwd: root, env: { ...process.env, LEADGEN_OUT_DIR: out }, stdio: "pipe" });

const full = JSON.parse(fs.readFileSync(path.join(out, "lead-gen-workflow.json"), "utf8"));
const publicText = fs.readFileSync(path.join(out, "lead-gen-workflow.public.json"), "utf8");
const codeNodes = (wf) => wf.nodes.filter((n) => n.type === "n8n-nodes-base.code");
const code = (name) => full.nodes.find((n) => n.name === name).parameters.jsCode;

test("no Code node has an @include left", () => {
  assert.ok(codeNodes(full).length >= 6);
  for (const n of codeNodes(full)) {
    assert.equal(n.parameters.jsCode.includes("@include"), false, n.name);
    assert.equal(n.parameters.jsCode.includes("module.exports"), false, n.name);
  }
});

test("each Code node carries the functions it calls", () => {
  assert.match(code("Score"), /function scoreLead/);
  assert.match(code("Build output"), /function buildOutput/);
  assert.match(code("Mock AI"), /function mockAi/);
  assert.match(code("Build Claude request"), /function buildClaudeRequest/);
  assert.match(code("Parse Claude"), /function parseClaudeResponse/);
  assert.match(code("Parse Claude"), /function mockAi/);
  assert.match(code("Audit"), /function auditSite/);
  assert.match(code("Normalize"), /function normalizePlace/);
  assert.match(code("Normalize + audit (mock)"), /function auditSite/);
});

test("the public copy keeps __REPO__ and the full copy has no placeholder", () => {
  assert.ok(publicText.includes("__REPO__"));
  assert.equal(publicText.includes("/Users/"), false);
  assert.equal(JSON.stringify(full).includes("__REPO__"), false);
});

test("no secrets in the workflow", () => {
  for (const text of [publicText, JSON.stringify(full)]) assert.doesNotMatch(text, /sk-an[t]|apify_ap[i]|AIz[a]/);
});

test("every code node's JS parses", () => {
  for (const n of codeNodes(full)) {
    assert.doesNotThrow(() => new Function(`return (async () => {${n.parameters.jsCode}\n})`), n.name);
  }
});
