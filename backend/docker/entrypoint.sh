#!/bin/sh
set -eu
set -o pipefail

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

if [ -f package.json ]; then
  : # build from the repo root (existing behavior)
elif [ -f frontend/package.json ]; then
  echo "[shipyard] no package.json at repo root, building from frontend/"
  cd frontend
else
  echo "SHIPYARD_FATAL: No package.json found at the repo root or in frontend/. Shipyard only builds static frontend projects - if your project lives in a different folder, that's not supported yet." >&2
  exit 1
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
INSTALL_LOG="$(mktemp)"
if eval "$INSTALL_CMD" 2>&1 | tee "$INSTALL_LOG"; then
  :
else
  INSTALL_EXIT=$?
  # npm ci refuses to run when package-lock.json doesn't fully match package.json
  # for this platform - most commonly because optional, platform-specific deps
  # (e.g. Linux-only native binaries) were never recorded in a lockfile generated
  # on Windows/Mac. That's a legitimate cross-platform gap, not a broken repo, so
  # fall back to npm install rather than failing the build outright. Any other
  # install failure (including npm install itself, below) is real and propagates.
  if grep -q "npm error code EUSAGE" "$INSTALL_LOG" && grep -q "in sync" "$INSTALL_LOG"; then
    echo "[shipyard] package-lock.json didn't match for this platform - reinstalling with npm install instead of npm ci"
    eval "npm install"
  else
    exit "$INSTALL_EXIT"
  fi
fi
rm -f "$INSTALL_LOG"

echo "[shipyard] running build: $BUILD_CMD"
eval "$BUILD_CMD"

if [ ! -d "$OUT_DIR" ]; then
  echo "[shipyard] output directory '$OUT_DIR' not found after build" >&2
  exit 1
fi

mkdir -p /workspace/output
cp -r "$OUT_DIR"/. /workspace/output/
echo "[shipyard] build output staged at /workspace/output"
