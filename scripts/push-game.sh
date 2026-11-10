#!/bin/sh
# Push committed game code, including when the checkout has a detached HEAD.
set -eu
cd "$(dirname "$0")/.."

branch=game-1024-mvp
remote=git@github.com:lee469960-sudo/game-1024.git
ssh_command='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10'
local_sha=$(git rev-parse --verify "refs/heads/$branch")

git -c core.sshCommand="$ssh_command" push "$remote" "$local_sha:refs/heads/$branch"
remote_refs=$(git -c core.sshCommand="$ssh_command" ls-remote --exit-code "$remote" "refs/heads/$branch")
remote_sha=$(printf '%s\n' "$remote_refs" | awk '{print $1}')
if [ "$local_sha" != "$remote_sha" ]; then
  printf 'Push verification failed: local=%s remote=%s\n' "$local_sha" "$remote_sha" >&2
  exit 1
fi
printf 'Verified: %s local=%s remote=%s\n' "$branch" "$local_sha" "$remote_sha"
printf 'No source diff required: pushing synchronizes existing commits; matching hashes confirm completion.\n'
