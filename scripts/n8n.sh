#!/usr/bin/env bash
# Runs n8n locally with its data kept inside this repo.
# `npm run n8n` starts the editor; extra args run CLI commands, e.g.
# `npm run n8n -- import:workflow --input=n8n/lead-gen-workflow.json`
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export N8N_USER_FOLDER="$ROOT/.n8n-home"
export N8N_RESTRICT_FILE_ACCESS_TO="$ROOT/data;$ROOT/output"
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_PERSONALIZATION_ENABLED=false

if [ $# -eq 0 ]; then
  set -- start
fi

exec npx --yes n8n@2.42.5 "$@"
