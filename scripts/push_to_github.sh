#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/parts-inventory-app

repo="hiroki-kazu/vehicle-management-app"
remote_name="github"
commit_message="Initial commit: 車両管理システムUI改修版"

if ! env -u GH_TOKEN gh repo view "$repo" >/dev/null 2>&1; then
  env -u GH_TOKEN gh repo create "$repo" --private --description "部品在庫管理・車両管理システム" >/dev/null
fi

if ! git remote get-url "$remote_name" >/dev/null 2>&1; then
  git remote add "$remote_name" "https://github.com/$repo.git"
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "$commit_message"
  fi
fi

env -u GH_TOKEN git push -u "$remote_name" main

env -u GH_TOKEN gh repo view "$repo" --json nameWithOwner,isPrivate,url,defaultBranchRef
printf '\nLatest commit:\n'
git log -1 --pretty=format:'%H%n%s\n'
printf '\nRemote:\n'
git remote get-url "$remote_name"
