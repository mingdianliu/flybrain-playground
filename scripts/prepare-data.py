"""Download pinned official tables, export the complete model and verify it."""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--raw-dir', type=Path, default=ROOT / 'work/raw', help='Cache for the three official Feather files')
parser.add_argument('--offline', action='store_true', help='Require cached, hash-verified source files; never download')
args = parser.parse_args()
(ROOT / 'work').mkdir(exist_ok=True)
try:
    with tempfile.TemporaryDirectory(prefix='model-build-', dir=ROOT / 'work') as temporary:
        staged = Path(temporary)
        command = [sys.executable, str(ROOT / 'scripts/prepare_full_connectome.py'), str(args.raw_dir.resolve()), str(staged)]
        if args.offline:
            command.append('--offline')
        subprocess.run(command, cwd=ROOT, check=True)
        subprocess.run([sys.executable, 'scripts/prepare-room-inputs.py', str(args.raw_dir.resolve())], cwd=ROOT, check=True)
        subprocess.run([sys.executable, 'scripts/verify-data.py', str(staged)], cwd=ROOT, check=True)
        destination = ROOT / 'work/full'
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(staged, destination)
    print('Model ready. Run npm start, then open http://127.0.0.1:4173/en.html')
except subprocess.CalledProcessError as error:
    raise SystemExit(error.returncode)
