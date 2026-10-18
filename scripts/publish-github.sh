#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-realtime-fintech-dashboard}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin already exists:"
  git remote -v
  echo "Push with: git push -u origin main"
  exit 0
fi

gh repo create "$REPO_NAME" --public --source=. --remote=origin --push

echo ""
echo "Enable GitHub Pages: Settings → Pages → Source: GitHub Actions"
echo "After the deploy workflow succeeds, set README links:"
USER="$(gh api user -q .login)"
echo "  Repository: https://github.com/${USER}/${REPO_NAME}"
echo "  Live demo:  https://${USER}.github.io/${REPO_NAME}/"
