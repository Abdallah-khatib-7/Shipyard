#!/bin/sh
set -eu

WORKDIR=/workspace/repo
mkdir -p "$WORKDIR"
cd "$WORKDIR"

: "${REPO_URL:?REPO_URL is required}"
: "${COMMIT_SHA:?COMMIT_SHA is required}"

echo "[shipyard] fetching $COMMIT_SHA"
git init -q
git remote add origin "$REPO_URL"

# GitHub supports fetching an arbitrary reachable commit SHA directly, which
# avoids a full-history clone. Fall back to a full fetch for servers that don't.
if git fetch --depth 1 origin "$COMMIT_SHA" 2>/tmp/fetch.log; then
  git checkout -q FETCH_HEAD
else
  echo "[shipyard] shallow fetch by SHA failed, falling back to full fetch"
  cat /tmp/fetch.log
  git fetch -q origin
  git checkout -q "$COMMIT_SHA"
fi

INSTALL_CMD="${INSTALL_COMMAND:-}"
BUILD_CMD="${BUILD_COMMAND:-}"
OUT_DIR="${OUTPUT_DIR:-dist}"

if [ -z "$INSTALL_CMD" ]; then
  if [ -f pnpm-lock.yaml ]; then
    INSTALL_CMD="corepack enable && pnpm install --frozen-lockfile"
  elif [ -f yarn.lock ]; then
    INSTALL_CMD="yarn install --frozen-lockfile"
  elif [ -f package-lock.json ]; then
    INSTALL_CMD="npm ci"
  else
    INSTALL_CMD="npm install"
  fi
fi

if [ -z "$BUILD_CMD" ]; then
  BUILD_CMD="npm run build"
fi

echo "[shipyard] installing dependencies: $INSTALL_CMD"
eval "$INSTALL_CMD"

echo "[shipyard] running build: $BUILD_CMD"
eval "$BUILD_CMD"

if [ ! -d "$OUT_DIR" ]; then
  echo "[shipyard] output directory '$OUT_DIR' not found after build" >&2
  exit 1
fi

mkdir -p /workspace/output
cp -r "$OUT_DIR"/. /workspace/output/
echo "[shipyard] build output staged at /workspace/output"
