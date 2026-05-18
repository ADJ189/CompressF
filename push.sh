#!/bin/bash
# One-command push to GitHub
# Usage: bash push.sh "your commit message"
# Or just: bash push.sh   (uses default message)

MSG="${1:-chore: sync all files}"

echo "→ Staging all changes..."
git add -A

echo "→ Committing: $MSG"
git commit -m "$MSG"

echo "→ Pushing to origin main..."
git push origin main

echo "✓ Done. Cloudflare Pages will auto-deploy in ~30 seconds."
