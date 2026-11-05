#!/bin/zsh
unsetopt XTRACE VERBOSE
set -eu
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
task_repo=${0:A:h}
exec /usr/bin/python3 "$task_repo/scripts/private-stack.py" start
