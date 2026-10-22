"""Copy the current frontend build to the GitHub Pages publish directory."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
source=root/'frontend'/'dist'
if not (source/'index.html').exists():raise SystemExit('Primero ejecuta npm run build en frontend/.')
dest=root/'docs'
if dest.exists():shutil.rmtree(dest)
shutil.copytree(source,dest)
(dest/'.nojekyll').touch()
print('GitHub Pages preparado en docs/.')
