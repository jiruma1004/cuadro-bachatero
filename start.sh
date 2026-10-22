#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
BACHATA_PYTHON="$PWD/.venv/bin/python"
if [ ! -x "$BACHATA_PYTHON" ] && [ -x ../../work/venv/bin/python ]; then
  BACHATA_PYTHON="$PWD/../../work/venv/bin/python"
  export BACHATA_DATA="${BACHATA_DATA:-$PWD/../../work/local-sessions}"
fi
if [ ! -x "$BACHATA_PYTHON" ]; then
  echo 'Primera instalación: ejecuta ./install.sh'
  exit 1
fi
export BACHATA_DATA="${BACHATA_DATA:-$PWD/backend/data}"
echo 'Abre http://127.0.0.1:8000 · Ctrl+C para cerrar'
exec "$BACHATA_PYTHON" -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
