"""Preserve source side labels; virtual receptive fields are assigned in JS."""
from pathlib import Path
import hashlib,json,sys
import re
import pyarrow.feather as feather
source=Path(sys.argv[1] if len(sys.argv)>1 else 'work/raw')/'body-annotations-male-cns-v1.0-minconf-0.5.feather'
pinned=json.loads(Path('data/source-checksums.json').read_text())
assert hashlib.file_digest(source.open('rb'),'sha256').hexdigest()==next(r['sha256'] for r in pinned if r['url'].endswith(source.name))
rows=feather.read_table(source).to_pylist()
groups={}
for r in rows:
    t=r['type'] or ''
    prefix=('retina' if t=='R1-R6' else 'loom' if t in ('LC4','LPLC2') else
            'odor' if t in ('ORN_DM1','ORN_VA2') else
            'soundA' if re.match(r'^JO-A\d',t) else 'soundB' if re.match(r'^JO-B\d',t) else None)
    if prefix is None: continue
    side=r['rootSide'] or r['somaSide']
    if side not in ('L','R'): continue
    key=prefix+side
    groups.setdefault(key,[]).append(r['bodyId'])
for v in groups.values():v.sort()
out={'source_sha256':hashlib.file_digest(source.open('rb'),'sha256').hexdigest(),
     'assignment':'Source rootSide or somaSide, L/R only. Virtual visual-field bins and odor/sound encoders are artificial. Odor: ORN_DM1/ORN_VA2. Sound: numbered JO-A/JO-B types; unclear types excluded. No synthetic soma coordinates.',
     'groups':groups}
Path('web/room-inputs.json').write_text(json.dumps(out,separators=(',',':')))
print({k:len(v) for k,v in groups.items()})
