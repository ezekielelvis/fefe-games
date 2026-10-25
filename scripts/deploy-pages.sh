#!/usr/bin/env bash
# Publishes the built games + landing page to the gh-pages branch (GitHub Pages).
# Run scripts/bundle.sh first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
cp -R "$ROOT/site/." "$STAGE/"
cp -R "$ROOT/dist/adinkra-match" "$ROOT/dist/ananse-hop" "$STAGE/"
mkdir -p "$STAGE/art" && cp "$ROOT"/store-art/*-banner.png "$STAGE/art/"
touch "$STAGE/.nojekyll"
REMOTE="$(git -C "$ROOT" remote get-url origin)"
cd "$STAGE"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy games to GitHub Pages"
git push -qf "$REMOTE" gh-pages
echo "Deployed to gh-pages"
