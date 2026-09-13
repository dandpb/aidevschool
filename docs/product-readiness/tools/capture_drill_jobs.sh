#!/usr/bin/env bash
# AID-1741 — decisão C+E da triagem AID-1738 §5.1
# (docs/product-readiness/REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md §4):
# captura durável dos jobs da run de CI da branch de proposta ANTES do
# cleanup (close do PR + delete da branch). Pós-delete a API devolve
# `jobs: []` e check-runs evapora (triagem §3, reproduzido nas runs
# 34749428567/34749575654/34750690040); o PR — que sobrevive — passa a
# carregar o diagnóstico.
#
# Uso:   capture_drill_jobs.sh <PR-number>
# Saída: comentário no PR com nome+conclusão de cada job não-verde de CADA
#        run do head do PR (+ run id/URL/conclusão/SHA/branch/timestamp) e
#        a URL do comentário no stdout (para o recibo do drill). Runs
#        não-verdes SEM jobs (vermelho phantom de run-level, ex. run
#        34764665344) são registradas como tal — esse vermelho não é
#        reconstruível nem com a branch viva.
#
# O protocolo (REGRANT-RUNBOOK.md § "Protocolo de cleanup de drill/proposta")
# exige a ordem estrita: capturar (este script) → fechar o PR com motivo →
# deletar a branch. Rodar este script DEPOIS do delete perde o diagnóstico
# (jobs voltam vazios pós-delete) — ele detecta o caso (branch sumida + run
# concluída não-verde sem jobs) e sai não-zero.
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <PR-number>" >&2
  exit 2
fi
PR="$1"
REPO="${GH_REPO:-dandpb/aidevschool}"
MARKER_PREFIX="<!-- drill-jobs-receipt"

command -v gh >/dev/null 2>&1 || { echo "gh CLI required" >&2; exit 2; }

meta="$(gh pr view "$PR" --repo "$REPO" --json headRefName,headRefOid,state,title)"
BRANCH="$(printf '%s' "$meta" | jq -r '.headRefName')"
SHA="$(printf '%s' "$meta" | jq -r '.headRefOid')"
SHA8="${SHA:0:8}"
CAPTURED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 1. Resolver as runs de CI do head do PR (event pull_request na branch da
#    proposta; head_sha casado). Sem sha casado, usa as runs mais recentes
#    da branch e sinaliza no comentário.
run_json="$(gh api "repos/${REPO}/actions/workflows/ci.yml/runs?branch=${BRANCH}&event=pull_request&per_page=20")"
runs_matched="$(printf '%s' "$run_json" | jq -r "[.workflow_runs[] | select(.head_sha == \"${SHA}\")] | sort_by(.run_number) | reverse | .[0:5]")"
SHA_MATCHED="yes"
if [ "$(printf '%s' "$runs_matched" | jq 'length')" -eq 0 ]; then
  runs_matched="$(printf '%s' "$run_json" | jq -r 'sort_by(.run_number) | reverse | .[0:5]')"
  SHA_MATCHED="no"
fi

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

branch_exists="yes"
gh api "repos/${REPO}/git/ref/heads/${BRANCH}" >/dev/null 2>&1 || branch_exists="no"

if [ "$(printf '%s' "$runs_matched" | jq 'length')" -eq 0 ]; then
  # B1a (runbook): PR nascido de GITHUB_TOKEN pode não ter run de CI na
  # branch (ninguém fez close+reopen). O próprio comentário registra o fato —
  # evidência durável do vácuo em vez de silêncio.
  {
    echo "${MARKER_PREFIX} none branch=${BRANCH} -->"
    echo "## Drill jobs receipt (AID-1741 C+E)"
    echo
    echo "- branch: \`${BRANCH}\` (existe: ${branch_exists}) · head: \`${SHA8}\` · capturado: ${CAPTURED_AT}"
    echo "- **nenhuma run de CI \`pull_request\` encontrada na branch no momento do cleanup**"
    echo "  (B1a — PR de GITHUB_TOKEN não emite eventos; close+reopen dispara CI)."
    echo "- Convenção E: vermelho em \`head_branch ~ ^regrant/auto-\` = proposal-red, não regressão."
  } > "$body_file"
else
  RID="$(printf '%s' "$runs_matched" | jq -r '.[0].id')"
  MARKER="${MARKER_PREFIX} run=${RID} sha=${SHA8} -->"

  # Idempotência: comentário com o mesmo marcador já existe → não duplica.
  existing="$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" \
    --jq ".[] | select(.body | startswith(\"${MARKER_PREFIX} run=${RID} \")) | .html_url" 2>/dev/null | grep -m1 '^https://' || true)"
  if [ -n "$existing" ]; then
    echo "receipt already posted for run ${RID}: ${existing}"
    exit 0
  fi

  {
    echo "${MARKER}"
    echo "## Drill jobs receipt (AID-1741 C+E)"
    echo
    echo "- branch: \`${BRANCH}\` (existe: ${branch_exists}) · head: \`${SHA8}\` (sha casado: ${SHA_MATCHED}) · capturado: ${CAPTURED_AT}"
    echo "- runs do head (mais recente primeiro):"
    echo
    echo "| run | status | conclusão | jobs | não-verdes |"
    echo "|---|---|---|---|---|"
    printf '%s' "$runs_matched" | while IFS=$'\t' read -r id status conclusion url; do
      # Nota: sem --paginate no fetch de jobs (gh concatena arrays de páginas
      # e quebra o jq); per_page=100 cobre o deck atual de checks do repo.
      jobs_json="$(gh api "repos/${REPO}/actions/runs/${id}/jobs?per_page=100")"
      total="$(printf '%s' "$jobs_json" | jq '[.jobs[]] | length')"
      nongreen="$(printf '%s' "$jobs_json" | jq -r '[.jobs[] | select((.conclusion // "") != "success" and (.conclusion // "") != "skipped")] | length')"
      echo "| [#${id}](${url}) | ${status} | ${conclusion} | ${total} | ${nongreen} |"
    done <<<"$(printf '%s' "$runs_matched" | jq -r '.[] | [.id, .status, (.conclusion // "—"), .html_url] | @tsv')"
    echo
    # Detalhe: nome+conclusão de cada job não-verde de cada run não-verde.
    printf '%s' "$runs_matched" | while IFS=$'\t' read -r id status conclusion url; do
      if [ "$conclusion" != "success" ] && [ "$conclusion" != "skipped" ]; then
        jobs_json="$(gh api "repos/${REPO}/actions/runs/${id}/jobs?per_page=100")"
        nongreen="$(printf '%s' "$jobs_json" | jq -r '[.jobs[] | select((.conclusion // "") != "success" and (.conclusion // "") != "skipped")] | length')"
        echo "### Run [#${id}](${url}) — \`${conclusion}\`"
        echo
        if [ "$nongreen" -gt 0 ]; then
          echo "| job | status | conclusão |"
          echo "|---|---|---|"
          printf '%s' "$jobs_json" | jq -r '.jobs[] | select((.conclusion // "") != "success" and (.conclusion // "") != "skipped") | "| \(.name) | \(.status) | \(.conclusion // "—") |"'
        elif [ "$status" != "completed" ]; then
          echo "Run ainda não concluída no momento da captura — sem conclusões de job."
        else
          echo "**⚠ run concluída não-verde com jobs vazios** — vermelho de run-level sem causa registrada (phantom); não é reconstruível nem com a branch viva. Se a branch já não existe, é captura pós-delete (ordem do protocolo violada)."
        fi
        echo
      fi
    done <<<"$(printf '%s' "$runs_matched" | jq -r '.[] | [.id, .status, (.conclusion // "—"), .html_url] | @tsv')"
    echo "Capturado **antes** do close/delete da branch (protocolo AID-1741; pós-delete a API devolve \`jobs: []\`)."
    echo "Convenção E: vermelho em \`head_branch ~ ^regrant/auto-\` = proposal-red (producer snapshot sem countersign), não regressão — verificador é a lane \`main\`."
  } > "$body_file"
fi

url="$(gh pr comment "$PR" --repo "$REPO" --body-file "$body_file")"
echo "drill jobs receipt posted on PR #${PR}: ${url}"

# Ordem do protocolo violada: branch já deletada com run concluída não-verde
# sem jobs — o micro-diagnóstico foi perdido.
if [ "$branch_exists" = "no" ]; then
  bad="$(printf '%s' "$runs_matched" | jq -r '[.[] | select(.status == "completed" and (.conclusion // "") != "success" and (.conclusion // "") != "skipped")] | length')"
  if [ "${bad:-0}" -gt 0 ]; then
    echo "ERROR: branch já deletada com run concluída não-verde — capturada após o delete (ordem do protocolo violada)" >&2
    exit 1
  fi
fi
