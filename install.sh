#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo 'Instala FFmpeg: sudo apt install ffmpeg (Ubuntu), brew install ffmpeg (macOS)'; exit 1; }
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-lock.txt
if [ ! -f frontend/dist/index.html ] && [ -f docs/index.html ]; then
  cp -R docs frontend/dist
fi
if [ ! -f frontend/dist/index.html ]; then
  command -v npm >/dev/null || { echo 'Instala Node.js 22 LTS o superior'; exit 1; }
  (cd frontend && npm install && npm run build)
fi
echo 'Instalación completa. Ejecuta ./start.sh'
