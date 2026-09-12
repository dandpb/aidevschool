#!/bin/bash
# AID-421 fase (a) — reprodução pré-fix: spec chapter-continuity (conteúdo 72130c6d) 6×
export PATH=/paperclip/tmp/bin:$PATH
cd /paperclip/tmp/aid412-qa/wt/engines/codexdojo-os-prototype || exit 9
OUT=/paperclip/tmp/aid421/prefix
for i in 1 2 3 4 5 6; do
  rm -rf test-results
  start=$(date +%s)
  npx playwright test --project=desktop-1280 tests/chapter-continuity.smoke.spec.ts > $OUT/run$i.log 2>&1
  rc=$?
  end=$(date +%s)
  echo "run$i rc=$rc dur=$((end-start))s $(grep -c 'passed' $OUT/run$i.log >/dev/null 2>&1 && grep -Eo '[0-9]+ passed|expected .briefing.|Received string: .[a-z]+' $OUT/run$i.log | tr '\n' ' ')" >> $OUT/summary.txt
  grep -E "Received string|Error: |passed|failed" $OUT/run$i.log | tail -4 >> $OUT/summary.txt
  echo "---" >> $OUT/summary.txt
done
cat $OUT/summary.txt
