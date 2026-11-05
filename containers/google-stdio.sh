#!/bin/sh
# Private single-owner stdio only. Never forward the unauthenticated demo HTTP port.
set -eu
if [ "$#" -ne 0 ]; then
  printf '%s\n' '此入口不接受參數。' >&2
  exit 2
fi
TASKS_REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
for required in google-client.json google.sqlite vault.key; do
  if [ ! -f "$TASKS_REPO_DIR/.data/$required" ]; then
    printf '%s\n' 'Google 本機設定不完整，請依 docs/USER_TESTING.md 完成連線。' >&2
    exit 1
  fi
done
exec docker run --rm -i --pull never \
  --name google-tasks-mcp-private-stdio \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --mount "type=bind,source=$TASKS_REPO_DIR/.data,target=/data" \
  --env TASKS_DATA_DIR=/data \
  --entrypoint node google-tasks-mcp:local dist/google-stdio.js
