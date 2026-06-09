#!/usr/bin/env bash
RES=/Users/danielbarreto/Development/aidevschool/projects/01_rate_limiter/benchmarks/results
echo "=== Files written so far ==="
for lang in go rust node; do
  echo "[$lang]"
  ls -1 $RES/$lang 2>/dev/null | sort
  echo
done
echo "=== Latest tail of runner log ==="
tail -8 /Users/danielbarreto/Development/aidevschool/projects/01_rate_limiter/benchmarks/matrix_runner.log
echo
echo "=== Running processes ==="
ps -ef | grep -E "k6 run" | grep -v grep | awk '{print $2, $NF}'
