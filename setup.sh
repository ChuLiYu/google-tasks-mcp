#!/bin/sh
# Guided install: Docker image, your own Google OAuth client, consent, then Claude Desktop.
# Nothing here reads your tasks, and no secret is printed or sent anywhere except Google.
set -eu
umask 077
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE="$ROOT/containers/google-compose.yaml"
IMAGE=google-tasks-mcp:private-http
DATA="$ROOT/.data"
HOST="$ROOT/.host"

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s ==\n' "$*"; }
fail() { printf 'Setup stopped: %s\n' "$*" >&2; exit 1; }
ask() { # ask "question" default -> sets REPLY
  printf '%s ' "$1"
  IFS= read -r REPLY || REPLY=''
  [ -n "$REPLY" ] || REPLY=$2
}
yes_to() { case "$1" in [Yy]*) return 0 ;; *) return 1 ;; esac; }
helper() { # helper mode [value] < input
  docker run --rm -i --pull never --network none --read-only --cap-drop ALL \
    --mount "type=bind,source=$ROOT/scripts/setup-helper.mjs,target=/tmp/setup-helper.mjs,readonly" \
    --entrypoint node "$IMAGE" /tmp/setup-helper.mjs "$@"
}

if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$1" != disconnect ]; }; then
  say 'Usage: ./setup.sh [disconnect]'
  exit 2
fi
if [ "$#" -eq 1 ]; then
  say 'This revokes Google access and removes the local credentials. Your tasks in Google are not touched.'
  ask 'Type DISCONNECT to continue:' ''
  [ "$REPLY" = DISCONNECT ] || { say 'Nothing changed.'; exit 0; }
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 || fail 'Docker is not running. Start it, then run this again.'
  docker compose -f "$COMPOSE" stop >/dev/null 2>&1 || true
  code=0
  docker run --rm --pull never --read-only --cap-drop ALL --security-opt no-new-privileges \
    --mount "type=bind,source=$DATA,target=/data" --env TASKS_DATA_DIR=/data \
    --entrypoint node "$IMAGE" dist/disconnect.js || code=$?
  [ "$code" != 3 ] || fail 'local credentials were removed, but remove Google access yourself: https://myaccount.google.com/permissions'
  [ "$code" = 0 ] || fail 'nothing was removed. If you updated this folder, run ./setup.sh first to rebuild, then try again.'
  say 'Disconnected. Run ./setup.sh to connect again.'
  exit 0
fi

say 'Google Tasks MCP setup. It takes about 10 minutes, most of it in the Google Cloud console.'
say 'Run it from your own terminal app, because it may need to quit and reopen Claude.'

step '1 of 5: Docker'
command -v docker >/dev/null 2>&1 || fail 'Docker is not installed. Install OrbStack (https://orbstack.dev) or Docker Desktop, then run this again.'
docker info >/dev/null 2>&1 || fail 'Docker is not running. Start it, then run this again.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose is missing. Update Docker, then run this again.'
case "$(docker info --format '{{.OperatingSystem}}' 2>/dev/null)" in
  *'Docker Desktop'*) say 'Docker Desktop: turn on Settings > Resources > Network > Enable host networking (version 4.34 or later). This setup is tested on OrbStack only.' ;;
esac
say 'Building the image. The first build runs the test suite and can take a few minutes.'
docker compose -f "$COMPOSE" build tasks >"$ROOT/.setup-build.log" 2>&1 || fail "the build failed. See .setup-build.log."
rm -f "$ROOT/.setup-build.log"
say 'Image ready.'

mkdir -p "$DATA" "$HOST"
chmod 700 "$DATA" "$HOST"

step '2 of 5: Your own Google OAuth client'
if [ -f "$DATA/google-client.json" ]; then
  say 'Found an existing client. Keeping it.'
else
  say 'Tasks access goes through a Google client that you own, so no third party is involved:'
  say '  a. Create a project: https://console.cloud.google.com/projectcreate'
  say '  b. Enable the Tasks API: https://console.cloud.google.com/apis/library/tasks.googleapis.com'
  say '  c. Set up consent, choose External, and add your Gmail as a test user:'
  say '     https://console.cloud.google.com/auth/overview'
  say '  d. Create a client of type Desktop app, and download its JSON right away. Google may not offer the secret again:'
  say '     https://console.cloud.google.com/auth/clients/create'
  say ''
  guess=$(ls -t "$HOME"/Downloads/client_secret_*.json 2>/dev/null | head -n 1 || true)
  [ -z "$guess" ] || say "Found: $guess"
  ask "Drag the JSON here, or press Enter to use the newest client_secret file in Downloads:" ''
  # Look again on Enter: the file is usually downloaded while this prompt waits.
  [ -n "$REPLY" ] || REPLY=$(ls -t "$HOME"/Downloads/client_secret_*.json 2>/dev/null | head -n 1 || true)
  [ -n "$REPLY" ] || fail 'no client_secret file found in Downloads. Download it, then run ./setup.sh again.'
  source_file=$(printf '%s' "$REPLY" | sed -e "s/^[\"' ]*//" -e "s/[\"' ]*$//" -e 's/\\\(.\)/\1/g')
  [ -f "$source_file" ] || fail 'that file does not exist. Run ./setup.sh again.'
  helper client <"$source_file" || fail 'that file is not a Google OAuth client JSON. Download it again from step d.'
  cp "$source_file" "$DATA/google-client.json"
  chmod 600 "$DATA/google-client.json"
  say 'Saved to .data/google-client.json, which Git ignores. You can delete the downloaded copy.'
fi

step '3 of 5: What Claude may do'
say 'Yes: Claude can create, update and complete tasks directly, without asking per write.'
say '     A model misled by a task note or web page could change tasks, and overwritten text cannot be recovered.'
say 'No:  Claude can only read. You can run this setup again to change it.'
ask 'Allow Claude to write to Google Tasks? [y/N]:' n
# Keep a chosen strict mode, because this setup is run again whenever access expires.
approval=direct
if grep -Eq '^[[:space:]]*(export[[:space:]]+)?TASKS_WRITE_APPROVAL=["'"'"']?local' "$HOST/runtime.env" 2>/dev/null; then
  approval=local
  say 'Strict mode stays on: each write still needs your approval on this computer.'
fi
if yes_to "$REPLY"; then writes=1; else writes=0; fi
printf 'TASKS_REAL_WRITES=%s\nTASKS_WRITE_APPROVAL=%s\n' "$writes" "$approval" >"$HOST/runtime.env"
chmod 600 "$HOST/runtime.env"

step '4 of 5: Connect your Google account'
docker compose -f "$COMPOSE" stop >/dev/null 2>&1 || true
if [ ! -f "$DATA/private-http.token" ]; then
  LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | dd bs=64 count=1 2>/dev/null >"$DATA/private-http.token"
  chmod 600 "$DATA/private-http.token"
fi
connect=y
if [ -f "$DATA/vault.key" ] && [ -f "$DATA/google.sqlite" ]; then
  ask 'Already connected. Connect again (needed after changing the write choice)? [y/N]:' n
  connect=$REPLY
fi
if yes_to "$connect"; then
  say 'Google will warn that the app is unverified. It is your own client, so choose Advanced, then continue.'
  if [ "$writes" = 1 ]; then
    /bin/sh "$ROOT/containers/google-connect.sh" --write-test || fail 'the Google connection did not finish. Run ./setup.sh again.'
  else
    /bin/sh "$ROOT/containers/google-connect.sh" || fail 'the Google connection did not finish. Run ./setup.sh again.'
  fi
fi
docker compose -f "$COMPOSE" up -d --wait --no-build --pull never >/dev/null 2>&1 || fail 'the service did not start. If a crash left .data/google-http.lock behind, confirm nothing is running and delete it, then run this again.'
say 'Service running.'

step '5 of 5: Claude Desktop'
entry="$ROOT/containers/claude-desktop-stdio.sh"
config="${TASKS_DESKTOP_CONFIG:-$HOME/Library/Application Support/Claude/claude_desktop_config.json}"
if [ "$(uname)" = Darwin ] || [ -n "${TASKS_DESKTOP_CONFIG:-}" ]; then
  ask 'Add this to Claude Desktop now? It may quit and reopen Claude. [Y/n]:' y
  if yes_to "$REPLY"; then
    reopen=0
    if pgrep -x Claude >/dev/null 2>&1; then
      # A running app overwrites its config, so the edit must happen while it is closed.
      osascript -e 'quit app "Claude"' >/dev/null 2>&1 || true
      sleep 5
      ! pgrep -x Claude >/dev/null 2>&1 || fail 'Claude is still running. Quit it fully, then run this again.'
      reopen=1
    fi
    mkdir -p "$(dirname "$config")"
    [ ! -f "$config" ] || cp "$config" "$config.bak"
    current=''
    [ ! -f "$config" ] || current=$config
    tmp="$config.tmp.$$"
    if [ -n "$current" ]; then helper desktop "$entry" <"$current" >"$tmp" || { rm -f "$tmp"; fail 'the Claude config is not valid JSON. It was left unchanged.'; }
    else helper desktop "$entry" </dev/null >"$tmp" || { rm -f "$tmp"; fail 'could not create the Claude config.'; }
    fi
    mv "$tmp" "$config"
    say 'Claude Desktop configured.'
    [ "$reopen" = 0 ] || open -a Claude >/dev/null 2>&1 || true
  fi
else
  say 'Add this to your MCP client:'
  say "  {\"mcpServers\":{\"google-tasks\":{\"command\":\"/bin/sh\",\"args\":[\"$entry\"]}}}"
fi

mkdir -p "$ROOT/dist"
skill=''
if command -v zip >/dev/null 2>&1; then
  (cd "$ROOT/skills" && rm -f ../dist/tasks-calendar-planner.zip && zip -qr ../dist/tasks-calendar-planner.zip tasks-calendar-planner)
  skill="$ROOT/dist/tasks-calendar-planner.zip"
fi

step 'Done'
say 'Try this in Claude: "List my Google Tasks lists."'
say 'Claude Code: claude mcp add google-tasks -- /bin/sh "'"$entry"'"'
[ -z "$skill" ] || say "Optional planning skill: upload $skill in Claude under Customize > Skills."
say 'If your Google consent screen stays in Testing, Google ends access after 7 days. Run ./setup.sh again, or choose Publish app in the console.'
