# Flybrain Playground

Move a lamp, place food or a sound source, and watch a virtual fly's path alongside
computed neural activity in a rotatable 3D view.

[Live English demo](https://flybrain-theater.ming1001.chatgpt.site/en.html) ·
[中文说明](README.zh-CN.md) · [Model and limitations](docs/MODEL.md)

This is an interactive experiment using a **real connectome, simplified LIF
neurons, illustrative sensory encoders and engineered flight control**. It is
not a complete biophysical fly, an experimentally validated behavioral model,
or a brain that learned to fly.

## What runs

- The full **classified-neuron MaleCNS v1.0 graph**: 166,606 cells, 25,574,615
  directed connections and 124,144,950 synaptic contacts, without an edge cutoff.
- Native soma coordinates for 139,659 cells. The 26,947 cells without soma
  coordinates are simulated but not plotted at invented positions.
- Interactive starting position, lamp brightness/position, window, furniture,
  occluder, food odor, and sound amplitude/frequency/envelope.
- A 3D anatomy view, selected-neuron voltage, actual computed spike raster,
  population density view and sensory pathway probes.
- English and Chinese interfaces, generated from one shared implementation.

Neural computation runs in the visitor's browser. Rendering FPS and simulation
speed are separate; the full model may run slower than wall-clock time. Sound
sources stimulate the model and do not play computer audio. Odor guidance is
an optional engineered steering assist; sound has no hard-coded motor response.

## Run from a fresh clone

Requirements: **Node.js 22+**, **Python 3.12–3.14**, a desktop browser with WebGL 2,
and enough memory for the full graph. Allow about **4 GB free disk space** for
source tables, Python packages and generated assets. No API key, neuPrint login,
Codex installation, Sites account or access to the live demo is required.
The local source export used about 3.3 GB peak process memory; an 8 GB or larger
machine is a practical starting point. This is not a measured browser minimum.

Clone this repository, then run the commands from its root:

```sh
git clone https://github.com/mingdianliu/flybrain-playground.git
cd flybrain-playground
```

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
python scripts/prepare-data.py
npm start
```

On Windows PowerShell, use `py -3 -m venv .venv`, then
`.\.venv\Scripts\Activate.ps1` in place of the first two commands. The remaining
commands are identical. Alternatively invoke `.venv\Scripts\python.exe` directly
if shell activation is unavailable.

Open **http://127.0.0.1:4173/en.html** (English) or
**http://127.0.0.1:4173/** (Chinese). Wait for “Full connectome ready”, arrange the
room, then click **Release fly**. Do not open the HTML via `file://`: module
workers and cryptographic verification need a supported HTTP(S) origin.

The first data preparation downloads **1,109,008,094 bytes (~1.1 GB)** from the
official Janelia public bucket. It checks pinned SHA-256 hashes, exports the
selected graph into approximately 78 MB of compressed assets, regenerates the
sensory-cell mapping and verifies every decoded array against this release's
reference. Cached sources are reused without network requests.

### Optional: prepared model archive

Download `malecns-v1.0-model.zip` from the
[Releases page](https://github.com/mingdianliu/flybrain-playground/releases) and use this shorter route. Python's standard library is sufficient;
NumPy and PyArrow are needed only for rebuilding from the original tables.

```sh
npm ci
python scripts/install-data.py /path/to/malecns-v1.0-model.zip
npm start
```

The installer validates the extracted model against committed reference hashes.
The archive is a distribution convenience; rebuilding from official sources is
the independent reproduction path. Large data, recordings and build output are
deliberately excluded from Git.

## Reproduce the demo interaction

1. Close the window and disable **Visual input** to isolate the food experiment.
2. Select **Place food**, enable food odor and keep **Food guidance** enabled.
3. Set food to X −1.8 m, Y 1.5 m, Z 1.0 m; select **Top view**.
4. Release the fly. Select **Olfactory input** beside the raster.
5. During flight, change food X to +1.6 m. Observe the turn, trail and olfactory
   firing rate as the fly approaches the new source.

Both room movement and neural displays follow the same simulation clock.
Changing a stimulus preserves ongoing neural state; releasing again resets the
trial. The illustrative controller is documented in [MODEL.md](docs/MODEL.md).

## Verify and build

```sh
npm test                         # Fast checks; no full dataset required
python scripts/verify-data.py     # Full data integrity and reference check
npm run test:full                 # Actual full-network sensory and flight checks
npm run benchmark                # Four stimuli; writes work/full-benchmark.json
npm run build                    # Portable static site, including data, in dist/
npm run preview                  # Serve dist/ at http://127.0.0.1:4173/en.html
```

To rebuild using a cache in another directory, including offline:

```sh
python scripts/prepare-data.py --raw-dir /path/to/raw-tables --offline
```

`npm test` covers LIF behavior, timing, spike history, environment controls,
sensory encoders, language parity and local serving. GitHub Actions runs these
checks on pushes and pull requests. The manually triggered workflow has a
`full_model` option to download official data and test the entire model.
See [REPRODUCIBILITY.md](docs/REPRODUCIBILITY.md) for exact expectations and the
locally recorded verification result.

## Project layout

```text
web/                   UI, Three.js scenes, Web Worker and simulation
web/lif-core.mjs        Neuron dynamics and synaptic event queue
web/room-core.mjs       World geometry, sensory fields and flight control
web/room-neural.mjs     Sensory-to-neural interface and spike readout
web/room-stimuli.mjs    Illustrative food/sound encoding
data/                  Translation dictionary and pinned source/model hashes
scripts/               Preparation, verification, local serving and tests
docs/                  Model, data format and reproduction notes
work/                  Ignored raw tables, model assets and benchmark output
dist/                  Ignored portable website build
```

`web/vendor/` contains Three.js 0.180.0 and its license. There are no npm runtime
dependencies and no runtime CDN fetches. Edit the canonical Chinese HTML/modules
and `data/english.json`; `scripts/build-english.mjs` generates the matching English
files. Do not edit generated `.en.mjs` files independently.

## Deploy your own copy

After `npm run build`, publish the **contents of `dist/`** on a static HTTP(S)
host that accepts the dataset size. Asset and worker URLs are relative, including
when hosted below a path prefix. Preserve `full/*.gz` and `.part*` bytes exactly;
they are application payloads, so do not configure the host to automatically
decode them as `Content-Encoding: gzip`. No database or server-side simulation is
required. GitHub is used here for source distribution; no Pages workflow or
automatic website publishing is enabled.

## License and attribution

Original code: [MIT](LICENSE). MaleCNS source and derived data:
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with attribution to the
[MaleCNS project](https://male-cns.janelia.org/download/) and
[Berg et al. (2026)](https://doi.org/10.1016/j.cell.2026.08.015).
Three.js and the Shiu/Spiller model reference retain their MIT notices.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CITATION.cff](CITATION.cff).

The source in this repository is derived from the working Flybrain Playground
demo, with a portable local data/build workflow. Scientific limitations are part
of the model specification and should remain visible in derivative demos.

Maintainers: [upload this repository and optional data assets to GitHub](docs/PUBLISHING_TO_GITHUB.md).
