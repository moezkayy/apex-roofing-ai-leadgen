// Builds the importable n8n workflow from n8n/workflow.src.json.
// - Code nodes: each `// @include <path>` line becomes that file's content, cut at `// @n8n-strip-below`.
// - `__REPO__` becomes this repo's absolute path (the public copy keeps the placeholder).
// Optional env: LEADGEN_DATA_SOURCE (mock|apify), LEADGEN_AI (mock|claude), LEADGEN_OUT_DIR.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.LEADGEN_OUT_DIR ? resolve(process.env.LEADGEN_OUT_DIR) : join(root, "n8n");
const STRIP = "// @n8n-strip-below";

function readSource(path) {
  const text = readFileSync(join(root, path), "utf8");
  const cut = text.indexOf(STRIP);
  return (cut === -1 ? text : text.slice(0, cut)).trimEnd();
}

const workflow = JSON.parse(readFileSync(join(root, "n8n", "workflow.src.json"), "utf8"));

for (const node of workflow.nodes) {
  if (node.type !== "n8n-nodes-base.code") continue;
  const included = [];
  node.parameters.jsCode = node.parameters.jsCode.replace(/^\/\/ @include (\S+)[ \t]*$/gm, (_, path) => {
    included.push(path);
    return readSource(path);
  });
  console.log(`${node.name}: ${included.length ? included.join(", ") : "(no includes)"}`);
}

const overrides = { dataSource: process.env.LEADGEN_DATA_SOURCE, ai: process.env.LEADGEN_AI };
const config = workflow.nodes.find((n) => n.name === "Config");
for (const a of config.parameters.assignments.assignments) {
  if (overrides[a.name]) {
    a.value = overrides[a.name];
    console.log(`Config.${a.name} = ${a.value}`);
  }
}

mkdirSync(outDir, { recursive: true });
const publicJson = JSON.stringify(workflow, null, 2) + "\n";
writeFileSync(join(outDir, "lead-gen-workflow.public.json"), publicJson);
writeFileSync(join(outDir, "lead-gen-workflow.json"), publicJson.replaceAll("__REPO__", root));
console.log(`Wrote lead-gen-workflow.json and lead-gen-workflow.public.json to ${outDir}`);
