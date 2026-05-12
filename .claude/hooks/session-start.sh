#!/bin/bash
# SessionStart hook: install backend + frontend deps for Claude Code on the web.
set -euo pipefail

# Only run inside the Claude Code on the web sandbox.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "[voca] SessionStart: installing dependencies..."

# Backend (FastAPI / Python).
if [ -f voca-api/requirements.txt ]; then
  echo "[voca] pip install voca-api/requirements.txt"
  python3 -m pip install --quiet --disable-pip-version-check \
    -r voca-api/requirements.txt || {
      echo "[voca] pip install failed, retrying with --user"
      python3 -m pip install --quiet --disable-pip-version-check --user \
        -r voca-api/requirements.txt
    }
fi

# Frontend (Expo / React Native).
if [ -f vocafront/package.json ]; then
  echo "[voca] npm install vocafront/"
  (cd vocafront && npm install --no-audit --no-fund --loglevel=error)
fi

# ffmpeg is required by /api/stt at runtime.
if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    echo "[voca] installing ffmpeg via apt-get"
    DEBIAN_FRONTEND=noninteractive apt-get update -qq || true
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ffmpeg >/dev/null 2>&1 || echo "[voca] ffmpeg install skipped"
  fi
fi

echo "[voca] SessionStart hook complete."
