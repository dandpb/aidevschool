#!/bin/bash
# AID-421 fase (a) — critério: npm run test:readiness 6x no head 8d10161b (fix aplicado)
export PATH=/paperclip/tmp/bin:$PATH npm_config_include=dev
cd /paperclip/tmp/aid412-qa/wt/engines/codexdojo-os-prototype || exit 9
OUT=/paperclip/tmp/aid421/postfix
for i in 1 2 3 4 5 6; do
  rm -rf test-results
  start=$(date +%s)
  npm run test:readiness > $OUT/run$i.log 2>&1
  rc=$?
  end=$(date +%s)
  echo "run$i rc=$rc dur=$((end-start))s" >> $OUT/summary.txt
  grep -E "[0-9]+ passed|[0-9]+ failed|READINESS" $OUT/run$i.log | tail -6 >> $OUT/summary.txt
  echo "---" >> $OUT/summary.txt
done
cat $OUT/summary.txt
