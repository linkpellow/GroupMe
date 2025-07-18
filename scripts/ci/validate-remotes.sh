#!/usr/bin/env bash
set -e
ALLOWED_REGEX='^(origin|heroku-prod|heroku-staging)$'
FAIL=0
while read -r remote _; do
  name="${remote%%[ \t]*}"
  if ! [[ $name =~ $ALLOWED_REGEX ]]; then
    echo "❌  Unknown remote detected: $name" >&2
    FAIL=1
  fi
done < <(git remote -v | awk '{print $1}' | sort -u)

if [[ $FAIL -eq 1 ]]; then
  echo "Block: repo contains unapproved git remotes." >&2
  exit 1
else
  echo "✅  Git remotes validated."
fi 