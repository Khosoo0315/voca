#!/bin/bash
# Voca AI deploy script — run from the repo root on the production server.
# Idempotent: safe to re-run.
#
# Usage:
#   cd /opt/mlops/services/voca
#   git pull origin main
#   sudo bash deploy.sh                 # full deploy (backend + restart)
#   sudo bash deploy.sh --skip-frontend # skip npm install
#   sudo bash deploy.sh --frontend-only # only build frontend
#   sudo bash deploy.sh --no-restart    # don't touch systemd
set -euo pipefail

SKIP_FRONTEND=0
FRONTEND_ONLY=0
NO_RESTART=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --frontend-only) FRONTEND_ONLY=1 ;;
    --no-restart)    NO_RESTART=1 ;;
    -h|--help)
      sed -n '1,16p' "$0"; exit 0 ;;
    *)
      echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

SERVICE_NAME="${VOCA_SERVICE:-mlops-voca-api.service}"
VENV_DIR="${VOCA_VENV:-$REPO_DIR/voca-api/.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy] WARN:\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy] FAIL:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Sanity checks ────────────────────────────────────────────────────────────
[ -d voca-api ]   || fail "voca-api/ not found (run from repo root)"
[ -f voca-api/api.py ] || fail "voca-api/api.py missing"

if [ "$FRONTEND_ONLY" -ne 1 ]; then
  # ── Backend ──────────────────────────────────────────────────────────────
  log "Backend: ensuring virtualenv at $VENV_DIR"
  if [ ! -x "$VENV_DIR/bin/python" ]; then
    "$PYTHON_BIN" -m venv "$VENV_DIR"
  fi
  # shellcheck disable=SC1091
  . "$VENV_DIR/bin/activate"

  log "Backend: pip install -r voca-api/requirements.txt"
  python -m pip install --upgrade pip --quiet
  python -m pip install -r voca-api/requirements.txt --quiet

  log "Backend: .env presence check"
  if [ ! -f voca-api/.env ]; then
    warn "voca-api/.env is missing; copying from .env.example (fill in the secrets!)"
    cp voca-api/.env.example voca-api/.env
  fi

  log "Backend: python -m py_compile voca-api/api.py"
  python -m py_compile voca-api/api.py

  deactivate

  if [ "$NO_RESTART" -ne 1 ]; then
    if systemctl list-unit-files | grep -q "^${SERVICE_NAME}"; then
      log "Backend: systemctl restart $SERVICE_NAME"
      systemctl restart "$SERVICE_NAME"
      sleep 2
      systemctl --no-pager status "$SERVICE_NAME" | sed -n '1,10p' || true
    else
      warn "systemd unit $SERVICE_NAME not found; skipping restart"
    fi
  fi

  # ── Health check (non-fatal) ─────────────────────────────────────────────
  if command -v curl >/dev/null 2>&1; then
    HEALTH_URL="${VOCA_HEALTH_URL:-http://127.0.0.1:8000/ping}"
    log "Backend: GET $HEALTH_URL"
    if curl -sf -m 5 "$HEALTH_URL" >/dev/null; then
      log "Backend: /ping OK"
    else
      warn "/ping did not respond — check journalctl -u $SERVICE_NAME -n 50"
    fi
  fi
fi

if [ "$SKIP_FRONTEND" -ne 1 ] && [ -f vocafront/package.json ]; then
  log "Frontend: cd vocafront && npm install"
  (cd vocafront && npm install --no-audit --no-fund --loglevel=error)
  log "Frontend: lint"
  (cd vocafront && npm run lint --silent) || warn "frontend lint failed"
fi

log "Done."
