#!/bin/sh
# Claude Desktop launches this with a minimal PATH. Starts the service on demand.
# stdout carries the MCP protocol, so everything else goes to stderr.
set -eu
if [ "$#" -ne 0 ]; then
  printf '%s\n' 'This entry takes no arguments.' >&2
  exit 2
fi
PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.orbstack/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
export PATH
TASKS_REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker is not running. Start it, then restart Claude.' >&2
  exit 1
fi
if [ -z "$(docker ps -q --filter 'name=^/google-tasks-private-tasks-1$')" ]; then
  docker compose -f "$TASKS_REPO_DIR/containers/google-compose.yaml" up -d --wait --no-build --pull never >&2
fi
exec docker exec -i google-tasks-private-tasks-1 node dist/claude-desktop-stdio.js
