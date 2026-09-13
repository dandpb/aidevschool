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
# Saída: comentário no PR com nome+conclusão de cada job não-verde
#        (+ run id/URL/SHA/branch/timestamp da captura) e a URL do
#        comentário no stdout (para o recibo do drill).
#
# O protocolo (REGRANT-RUNBOOK.md § "Protocolo de cleanup de drill/proposta")
# exige a ordem estrita: capturar (este script) → fechar o PR com motivo →
# deletar a branch. Rodar este script DEPOIS do delete é inútil: a resposta
# volta vazia — ele se recusa e sai não-zero nesse caso.
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

# 1. Resolver a run de CI do head do PR (event pull_request na branch da
#    proposta; head_sha casado). Sem sha casado, usa a mais recente da branch
#    e sinaliza no comentário.
run_json="$(gh api "repos/${REPO}/actions/workflows/ci.yml/runs?branch=${BRANCH}&event=pull_request&per_page=20")"
RID="$(printf '%s' "$run_json" | jq -r "[.workflow_runs[] | select(.head_sha == \"${SHA}\")] | if length > 0 then (max_by(.run_number) | .id | tostring) else empty end")"
SHA_MATCHED="yes"
if [ -z "$RID" ]; then
  RID="$(printf '%s' "$run_json" | jq -r 'if (.workflow_runs | length) > 0 then (.workflow_runs | max_by(.run_number) | .id | tostring) else empty end')"
  SHA_MATCHED="no"
fi

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

if [ -z "$RID" ]; then
  # B1a (runbook): PR nascido de GITHUB_TOKEN pode não ter run de CI na
  # branch (ninguém fez close+reopen). O próprio comentário registra o fato —
  # evidência durável do vácuo em vez de silêncio.
  {
    echo "${MARKER_PREFIX} none run=${BRANCH} -->"
    echo "## Drill jobs receipt (AID-1741 C+E)"
    echo
    echo "- branch: \`${BRANCH}\` · head: \`${SHA8}\` · capturado: ${CAPTURED_AT}"
    echo "- **nenhuma run de CI \`pull_request\` encontrada na branch no momento do cleanup**"
    echo "  (B1a — PR de GITHUB_TOKEN não emite eventos; close+reopen dispara CI)."
    echo "- Convenção E: vermelho em \`head_branch ~ ^regrant/auto-\` = proposal-red, não regressão."
  } > "$body_file"
else
  run_meta="$(gh api "repos/${REPO}/actions/runs/${RID}")"
  RUN_URL="$(printf '%s' "$run_meta" | jq -r '.html_url')"
  RUN_STATUS="$(printf '%s' "$run_meta" | jq -r '.status')"
  RUN_CONCLUSION="$(printf '%s' "$run_meta" | jq -r '.conclusion // "—"')"
  MARKER="${MARKER_PREFIX} run=${RID} sha=${SHA8} -->"

  # Idempotência: comentário com o mesmo marcador já existe → não duplica.
  existing="$(gh api "repos/${REPO}/issues/${PR}/comments?per_page=100" \
    --jq ".[] | select(.body | startswith(\"${MARKER_PREFIX} run=${RID} \")) | .html_url" || true)"
  if [ -n "$existing" ]; then
    echo "receipt already posted for run ${RID}: ${existing}"
    exit 0
  fi

  # Nota: sem --paginate (gh concatena arrays de páginas e quebra o jq);
  # per_page=100 cobre o deck atual de checks do repo.
  jobs_json="$(gh api "repos/${REPO}/actions/runs/${RID}/jobs?per_page=100")"
  total="$(printf '%s' "$jobs_json" | jq '[.jobs[]] | length')"
  nongreen="$(printf '%s' "$jobs_json" | jq -r '[.jobs[] | select((.conclusion // "") != "success" and (.conclusion // "") != "skipped")] | length')"

  lost_jobs="no"
  if [ "$total" -eq 0 ] && [ "$RUN_STATUS" = "completed" ] && [ "$RUN_CONCLUSION" != "success" ] && [ "$RUN_CONCLUSION" != "skipped" ]; then
    # Run concluída não-verde sem jobs = captura pós-delete da branch (a API
    # devolve [] depois que a ref some) — a ordem do protocolo foi violada.
    lost_jobs="yes"
  fi

  {
    echo "${MARKER}"
    echo "## Drill jobs receipt (AID-1741 C+E)"
    echo
    echo "- run CI: [#${RID}](${RUN_URL}) (status: \`${RUN_STATUS}\`, conclusão: \`${RUN_CONCLUSION}\`)"
    echo "- branch: \`${BRANCH}\` · head: \`${SHA8}\` (sha casado: ${SHA_MATCHED}) · capturado: ${CAPTURED_AT}"
    echo "- jobs: ${total} total, ${nongreen} não-verde(s)"
    echo
    if [ "$lost_jobs" = "yes" ]; then
      echo "**⚠ jobs vazios para run concluída não-verde — captura após o delete da branch (ordem do protocolo violada) ou nunca reportados.**"
    elif [ "$RUN_STATUS" != "completed" ]; then
      echo "Run ainda não concluída no momento da captura — conclusões parciais acima."
    elif [ "$nongreen" -gt 0 ]; then
      echo "| job | status | conclusão |"
      echo "|---|---|---|"
      printf '%s' "$jobs_json" | jq -r '.jobs[] | select((.conclusion // "") != "success" and (.conclusion // "") != "skipped") | "| \(.name) | \(.status) | \(.conclusion // "—") |"'
    else
      echo "**Nenhum job não-verde** (todos success/skipped)."
    fi
    echo
    echo "Capturado **antes** do close/delete da branch (protocolo AID-1741; pós-delete a API devolve \`jobs: []\`)."
    echo "Convenção E: vermelho em \`head_branch ~ ^regrant/auto-\` = proposal-red (producer snapshot sem countersign), não regressão — verificador é a lane \`main\`."
  } > "$body_file"
fi

url="$(gh pr comment "$PR" --repo "$REPO" --body-file "$body_file")"
echo "drill jobs receipt posted on PR #${PR}: ${url}"
if [ "${lost_jobs:-no}" = "yes" ]; then
  echo "ERROR: run ${RID} completed non-green with zero jobs — captured after branch delete (protocol order violated)" >&2
  exit 1
fi

