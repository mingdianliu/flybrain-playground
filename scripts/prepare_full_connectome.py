"""Reproducible full classified MaleCNS v1 graph export; no edge-weight cutoff.

Usage: python scripts/prepare_full_connectome.py work/raw work/full [--offline]
Dependencies: numpy, pyarrow. Input tables are the official Janelia Feather files.
"""
import base64
import gzip
import hashlib
import json
import sys
import urllib.request
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.feather as feather

raw, out = map(Path, sys.argv[1:3])
raw.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
base = 'https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/'
names = ['body-annotations-male-cns-v1.0-minconf-0.5.feather',
         'body-neurotransmitters-male-cns-v1.0.feather',
         'connectome-weights-male-cns-v1.0-minconf-0.5.feather']
sources = []
pinned_sources = {p['url']: p for p in json.loads((Path(__file__).resolve().parent.parent / 'data/source-checksums.json').read_text())}
def check_source(path, pin):
    if path.stat().st_size != pin['bytes']:
        raise ValueError('Source size mismatch: ' + str(path))
    with path.open('rb') as f:
        sha256 = hashlib.file_digest(f, 'sha256').hexdigest()
    if sha256 != pin['sha256']:
        raise ValueError('Source SHA-256 mismatch; remove this cached file and retry: ' + str(path))
    return sha256

for name in names:
    path = raw / name
    pin = pinned_sources[base + name]
    if not path.exists():
        if '--offline' in sys.argv:
            raise FileNotFoundError('Offline source is missing: ' + str(path))
        temporary = path.with_suffix('.part')
        for attempt in range(3):
            try:
                print('Downloading', base + name, flush=True)
                with urllib.request.urlopen(base + name, timeout=120) as response, temporary.open('wb') as f:
                    while block := response.read(2**20):
                        f.write(block)
                check_source(temporary, pin)
                temporary.replace(path)
                break
            except (OSError, ValueError):
                temporary.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
    sha256 = check_source(path, pin)
    # Pinned SHA-256 is authoritative. Cached sources can be rebuilt offline;
    # no network HEAD request is required to trust already verified bytes.
    sources.append(dict(url=base + name, sha256=sha256, bytes=path.stat().st_size, gcs_md5=pin['gcs_md5']))

allrows = feather.read_table(raw / names[0]).to_pylist()
rows = sorted((r for r in allrows if r['superclass'] and 'tbc' not in r['superclass']), key=lambda r: r['bodyId'])
ids = np.array([r['bodyId'] for r in rows], dtype=np.int64)
assert len(np.unique(ids)) == len(ids)
nt = feather.read_table(raw / names[1], columns=['body', 'consensus_nt'])
nts = dict(zip(nt['body'].to_pylist(), nt['consensus_nt'].to_pylist()))
types = sorted(set(r['type'] or 'untyped' for r in rows))
classes = sorted(set(r['superclass'] for r in rows))
ntnames = sorted(set(nts.get(int(i)) or 'unknown' for i in ids))
tidx, cidx, nidx = [{s: i for i, s in enumerate(x)} for x in [types, classes, ntnames]]
nodes = [[int(r['bodyId']), tidx[r['type'] or 'untyped'], cidx[r['superclass']], nidx[nts.get(r['bodyId']) or 'unknown'], *(r['somaLocation'] or [None, None, None])] for r in rows]

def write_gzip(name, content):
    encoded = gzip.compress(content, compresslevel=6, mtime=0)
    (out / name).write_bytes(encoded)
    return dict(file=name, bytes=len(encoded), sha256=hashlib.sha256(encoded).hexdigest())

nodefile = write_gzip('neurons.json.gz', json.dumps(nodes, separators=(',', ':')).encode())
print('Neurons', len(ids), 'soma', sum(n[4] is not None for n in nodes), flush=True)
pre, post, weights = [], [], []
reader = pa.ipc.open_file(pa.memory_map(str(raw / names[2])))
idset = pa.array(ids)
for b in range(reader.num_record_batches):
    tab = pa.Table.from_batches([reader.get_batch(b)])
    tab = tab.filter(pc.and_(pc.is_in(tab['body_pre'], idset), pc.is_in(tab['body_post'], idset)))
    pre.append(np.searchsorted(ids, tab['body_pre'].to_numpy()).astype(np.uint32))
    post.append(np.searchsorted(ids, tab['body_post'].to_numpy()).astype(np.uint32))
    weights.append(tab['weight'].to_numpy().astype(np.uint32))
pre, post, weights = map(np.concatenate, [pre, post, weights])
order = np.lexsort((post, pre))
pre, post, weights = pre[order], post[order], weights[order]
assert np.all(weights > 0)
assert not np.any((pre[1:] == pre[:-1]) & (post[1:] == post[:-1])), 'Duplicate pairs require aggregation'
offsets = np.concatenate(([0], np.bincount(pre, minlength=len(ids)).cumsum())).astype('<u4')
assert int(offsets[-1]) == len(weights)
offsetfile = write_gzip('offsets.bin.gz', offsets.tobytes())
weight_dtype = '<u2' if weights.max() < 65536 else '<u4'
parts = []
chunk = 2_000_000
for start in range(0, len(weights), chunk):
    end = min(start + chunk, len(weights))
    p = len(parts)
    parts.append(dict(start=start, count=end-start,
        targets=write_gzip(f'targets-{p:02d}.bin.gz', post[start:end].astype('<u4').tobytes()),
        weights=write_gzip(f'weights-{p:02d}.bin.gz', weights[start:end].astype(weight_dtype).tobytes())))
    print('Exported', end, '/', len(weights), flush=True)

manifest = dict(dataset='male-cns:v1.0', generated=datetime.now(timezone.utc).isoformat(), license='CC BY 4.0',
    citation='Berg et al. 2026, https://doi.org/10.1016/j.cell.2026.08.015', sources=sources,
    selection='All annotation rows with a nonempty superclass excluding tbc; includes isolated neurons. No connection-weight cutoff between retained neurons. Unclassified segments are not presumed neurons.',
    annotation_rows=len(allrows), excluded_unclassified=len(allrows)-len(rows), neurons=len(ids), edges=len(weights),
    synapses=int(weights.sum(dtype=np.uint64)), soma_positions=sum(n[4] is not None for n in nodes),
    coordinate_system='Native MaleCNS EM, 8 nm isotropic voxels; no atlas warp or invented coordinates.',
    nodes=nodefile, offsets=offsetfile, parts=parts, weight_bytes=np.dtype(weight_dtype).itemsize,
    types=types, classes=classes, neurotransmitters=ntnames,
    nt_counts=dict(Counter(nts.get(int(i)) or 'unknown' for i in ids)),
    fast_sign_assumption={'acetylcholine': 1, 'gaba': -1, 'glutamate': -1},
    unresolved_fast_sign_neurons=sum(nts.get(int(i)) not in ['acetylcholine','gaba','glutamate'] for i in ids))
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print({k: manifest[k] for k in ['neurons', 'edges', 'synapses', 'soma_positions', 'unresolved_fast_sign_neurons']}, flush=True)
print('Compressed bytes', sum(f.stat().st_size for f in out.iterdir()), flush=True)
