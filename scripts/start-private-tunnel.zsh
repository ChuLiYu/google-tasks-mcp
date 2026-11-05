#!/bin/zsh
# Keep secrets out of command arguments, shell history, and trace output.
unsetopt XTRACE VERBOSE
set -eu

if (( $# != 1 )); then
  print -u2 'Usage: /bin/zsh scripts/start-private-tunnel.zsh synthetic|readonly|shared'
  exit 2
fi
case "$1" in
  synthetic) task_profile=tasks-synthetic-approval-test; task_image=p3-demo; task_health=synthetic-health-url ;;
  shared) task_profile=google-tasks-readonly-http; task_image=private-http; task_health=shared-health-url ;;
  readonly) task_profile=google-tasks-readonly; task_image=local; task_health=readonly-health-url ;;
  *) print -u2 'Only synthetic, readonly and shared profiles are supported.'; exit 2 ;;
esac
task_repo=${0:A:h:h}
cd "$task_repo"
# .data is mounted writable into the container; nothing the host executes or trusts may live there.
if [[ -e "$task_repo/.data/tools" || -e "$task_repo/.data/tunnel" ]]; then
  print -u2 'Move .data/tools and .data/tunnel to .host/. See docs/CHATGPT_CONNECTION.md.'
  exit 1
fi
task_client="$task_repo/.host/tools/tunnel-client-v0.0.18"
task_config="$task_repo/.host/tunnel/profiles/$task_profile.yaml"
if [[ ! -x "$task_client" || ! -f "$task_config" ]]; then
  print -u2 'Local tunnel setup is missing. See docs/CHATGPT_CONNECTION.md.'
  exit 1
fi
if [[ "$1" != synthetic ]]; then
  zmodload zsh/stat
  typeset -A task_directory_stat
  for task_directory in "$task_repo/.host" "$task_repo/.host/tools" "$task_repo/.host/tunnel" "$task_repo/.host/tunnel/profiles"; do
    if [[ -L "$task_directory" || ! -d "$task_directory" || ! -O "$task_directory" ]]; then
      print -u2 'Tunnel directories must be private, owned by you and not symlinks.'
      exit 1
    fi
    zstat -H task_directory_stat "$task_directory"
    if (( (task_directory_stat[mode] & 8#77) != 0 )); then
      print -u2 'Tunnel directories require mode 700.'
      exit 1
    fi
  done
fi
if ! command -v docker >/dev/null || ! docker image inspect "google-tasks-mcp:$task_image" >/dev/null 2>&1; then
  print -u2 "Start OrbStack and build google-tasks-mcp:$task_image first."
  exit 1
fi
# Ignore inherited credentials; only the readonly profile uses the local file.
unset CONTROL_PLANE_API_KEY
task_env="$task_repo/.env"
if [[ "$1" != synthetic && ( -e "$task_env" || -L "$task_env" ) ]]; then
  zmodload zsh/stat
  typeset -A task_stat
  if [[ -L "$task_env" || ! -f "$task_env" || ! -O "$task_env" ]]; then
    print -u2 'The local .env must be a regular file owned by you, not a symlink.'
    exit 1
  fi
  zstat -H task_stat "$task_env"
  if (( (task_stat[mode] & 8#77) != 0 )); then
    print -u2 'The local .env is accessible to others. Run: chmod 600 .env'
    exit 1
  fi
  task_seen=0
  while IFS= read -r task_line || [[ -n "$task_line" ]]; do
    [[ -z "$task_line" || "$task_line" == \#* ]] && continue
    if [[ "$task_line" != GOOGLE_TASKS_TUNNEL_API_KEY=* ]] || (( task_seen )); then
      print -u2 'Invalid .env format. Use the single assignment in .env.example.'
      exit 1
    fi
    task_seen=1
    task_value=${task_line#GOOGLE_TASKS_TUNNEL_API_KEY=}
    if [[ -n "$task_value" && "$task_value" == *[^a-zA-Z0-9_-]* ]]; then
      print -u2 'Invalid key format. Use an unquoted value without spaces.'
      exit 1
    fi
    CONTROL_PLANE_API_KEY=$task_value
  done < "$task_env"
fi
if [[ -z "${CONTROL_PLANE_API_KEY:-}" ]]; then
  if [[ ! -t 0 ]]; then
    print -u2 'No saved key. Run in an interactive terminal; never pipe a key into it.'
    exit 1
  fi
  read -rs 'CONTROL_PLANE_API_KEY?Tunnel runtime key (hidden; paste then Enter): '
  print
fi
if [[ -z "$CONTROL_PLANE_API_KEY" ]]; then
  print -u2 'No key entered. Nothing started.'
  exit 1
fi
export CONTROL_PLANE_API_KEY
print "Starting private $1 tunnel. Keep this terminal open; Ctrl-C stops it."
exec "$task_client" run --config "$task_config" --health-url-file "$task_repo/.host/tunnel/$task_health"
