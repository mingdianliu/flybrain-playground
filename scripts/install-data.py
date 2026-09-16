"""Install a prepared model ZIP; validate every model array before accepting it."""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
args = parser.parse_args()
(ROOT / 'work').mkdir(exist_ok=True)
reference = json.loads((ROOT / 'data/model-reference.json').read_text())
allowed = {'manifest.json', 'ATTRIBUTION.md', *reference['files']}
with tempfile.TemporaryDirectory(prefix='model-install-', dir=ROOT / 'work') as temporary:
    staged = Path(temporary)
    with zipfile.ZipFile(args.archive) as archive:
        infos = archive.infolist()
        if len(infos) != len(allowed) or {i.filename for i in infos} != allowed:
            raise SystemExit('Archive must contain exactly the unsplit model arrays, manifest and ATTRIBUTION.md at its root.')
        if sum(i.file_size for i in infos) > 120_000_000:
            raise SystemExit('Unexpectedly large model archive.')
        for info in infos:
            if info.file_size > 15_000_000:
                raise SystemExit('Unexpectedly large model member.')
            with archive.open(info) as source, (staged / info.filename).open('wb') as target:
                shutil.copyfileobj(source, target)
    subprocess.run([sys.executable, 'scripts/verify-data.py', str(staged)], cwd=ROOT, check=True)
    destination = ROOT / 'work/full'
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(staged, destination)
print('Model installed and verified. Run npm start.')
