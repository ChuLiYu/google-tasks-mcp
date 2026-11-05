#!/bin/sh
# Interactive owner-run OAuth only; never opens or controls a browser.
set -eu
if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$1" != '--write-test' ]; }; then
  printf '%s\n' 'Usage: google-connect.sh [--write-test]. Read-only by default; --write-test requests read and write.' >&2
  exit 2
fi
if [ ! -t 0 ] || [ ! -t 1 ]; then
  printf '%s\n' 'Run this in your own interactive terminal. You must choose the account and approve yourself.' >&2
  exit 1
fi
TASKS_REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ ! -f "$TASKS_REPO_DIR/.data/google-client.json" ]; then
  printf '%s\n' 'Missing .data/google-client.json. Run ./setup.sh.' >&2
  exit 1
fi
if ! docker image inspect google-tasks-mcp:private-http >/dev/null 2>&1; then
  printf '%s\n' 'Start Docker and run ./setup.sh to build the image.' >&2
  exit 1
fi
if [ -n "$(docker ps -q --filter 'name=^/google-tasks-private-tasks-1$')" ]; then
  printf '%s\n' 'Stop the running service first: docker compose -f containers/google-compose.yaml stop' >&2
  exit 1
fi
exec docker run --rm -it --pull never \
  --name google-tasks-mcp-private-connect \
  --network host \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --mount "type=bind,source=$TASKS_REPO_DIR/.data,target=/data" \
  --env TASKS_DATA_DIR=/data \
  --entrypoint node google-tasks-mcp:private-http dist/connect.js "$@"
