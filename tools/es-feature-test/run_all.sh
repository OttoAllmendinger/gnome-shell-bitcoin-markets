#!/bin/bash
set -euo pipefail
for f in tools/es-feature-test/*.js;
do
  echo "$f"
  gjs $f || echo "ERROR"
done
