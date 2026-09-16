"""Verify compressed assets and their exact decoded reference bytes (stdlib only)."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def digest(data):
    return hashlib.sha256(data).hexdigest()

def verify(directory):
    directory = Path(directory)
    reference = json.loads((ROOT / 'data/model-reference.json').read_text())
    manifest = json.loads((directory / 'manifest.json').read_text())
    for key, value in reference['counts'].items():
        if manifest[key] != value:
            raise ValueError(f'Model count mismatch: {key}')
    metadata = {k: v for k, v in manifest.items() if k not in ['generated', 'nodes', 'offsets', 'parts']}
    if digest(json.dumps(metadata, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()) != reference['metadata_sha256']:
        raise ValueError('Model metadata does not match the reference')
    specs = [manifest['nodes'], manifest['offsets']]
    cursor = 0
    for part in manifest['parts']:
        if part['start'] != cursor or part['count'] <= 0:
            raise ValueError('Non-contiguous connection chunks')
        cursor += part['count']
        specs.extend([part['targets'], part['weights']])
    if cursor != manifest['edges']:
        raise ValueError('Connection count does not match')
    if [s['file'] for s in specs] != list(reference['files']):
        raise ValueError('Missing, duplicated or reordered model arrays')
    total = 0
    for spec in specs:
        names = spec.get('files', [spec['file']])
        if any(Path(n).name != n or n in ('.', '..') for n in names):
            raise ValueError('Invalid asset path')
        compressed = b''.join((directory / name).read_bytes() for name in names)
        if len(compressed) != spec['bytes'] or digest(compressed) != spec['sha256']:
            raise ValueError('Compressed file verification failed: ' + spec['file'])
        decoded = gzip.decompress(compressed)
        ref = reference['files'][spec['file']]
        if len(decoded) != ref['decoded_bytes'] or digest(decoded) != ref['decoded_sha256']:
            raise ValueError('Decoded model differs from reference: ' + spec['file'])
        total += len(compressed)
    if digest((ROOT / 'web/room-inputs.json').read_bytes()) != reference['room_inputs_sha256']:
        raise ValueError('Sensory input mapping differs from reference')
    print(f'Verified {manifest["neurons"]:,} neurons, {manifest["edges"]:,} edges, {len(specs)} arrays, {total:,} compressed bytes.')
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', default=ROOT / 'work/full', type=Path)
    args = parser.parse_args()
    try:
        verify(args.directory)
    except (OSError, ValueError, KeyError) as error:
        raise SystemExit(f'Data verification failed: {error}')
