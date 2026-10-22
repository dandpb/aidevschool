#!/bin/bash
set -e

# check if we changed it properly
grep -A 20 -e 'form id="soc-config"' engines/dojoToday/src/main.ts
