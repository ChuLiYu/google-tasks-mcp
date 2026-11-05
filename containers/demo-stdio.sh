#!/bin/sh
# Synthetic-only candidate for a separate private client approval test.
set -eu
if [ "$#" -ne 0 ]; then
  printf '%s\n' '此合成資料入口不接受參數。' >&2
  exit 2
fi
exec docker run --rm -i --pull never \
  --name google-tasks-mcp-demo-approval-stdio \
  --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --mount type=volume,source=google-tasks-mcp-demo-approval,target=/data \
  --env TASKS_DATA_DIR=/data \
  --entrypoint node google-tasks-mcp:p3-demo dist/demo-stdio.js
