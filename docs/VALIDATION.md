# Local release verification

Recorded on 2026-09-15 while preparing v0.1.0.

Environment: macOS arm64, Node.js 25.9.0, npm 11.12.1, Python 3.14.6.
A newly created virtual environment installed NumPy 2.5.1 and PyArrow 24.0.0
from the committed requirements. Node 22/24 CI configuration is included, but
GitHub Actions has not run before repository upload. Other OS/browser combinations
are not represented by this local result.

## Clean-clone procedure

A new clone began with **no generated English files, model assets or build
output**. It ran `npm ci` and `npm test`, then:

```sh
python scripts/prepare-data.py --raw-dir /path/to/official-source-cache --offline
npm run build
npm run test:full
npm run benchmark
```

The three official source tables were already cached and were re-read and checked
against all committed SHA-256 pins. The 1.1 GB download was not repeated during
this clean-clone test. Export and verification ran from scratch; no previous
model arrays were copied into the clone. Python dependencies installed into a
fresh virtual environment, with package wheels available from the local cache.

## Results

| Check | Result |
| --- | --- |
| Fast tests | Passed: dynamics, delay/refractory behavior, spike history, room/senses, language parity, HTTP routes |
| Official source export | 166,606 cells, 25,574,615 edges, 124,144,950 contacts |
| Reference comparison | All 28 decoded arrays and sensory input mapping matched |
| Measured soma positions | 139,659; no replacement coordinates |
| Export time / peak RSS | About 47.1 s / 3.32 GB on this machine |
| Static build | 29 model files, including manifest; about 78.4 MB model data |
| Static HTTP delivery | Both languages, module workers, vendored Three.js and every model array served; all compressed hashes matched |
| Seeded open-window trial | Exit at 7.44 model seconds, path 5.425226 m, zero contacts, 746,197 spikes |
| Closed window | No escape across 10 model seconds |
| Live lamp movement | Left/right sensory response reversed; clock and neural state preserved |
| Food and sound | Input and positioned downstream spikes; odor-distance response; auditory frequency reversal; inputs stopped after disabling |
| Prepared model installer | Accepted the valid archive; rejected modified connection bytes before replacing existing data |
| Source review | No hosting project IDs, source credentials, private keys, personal machine paths, raw tables or model binaries in tracked files |

## Four-input benchmark

Each benchmark simulates 200 ms after a 100 ms stimulus; the full graph is loaded.
These numbers describe this implementation, not measured biology.

| Input | Input cells | Total spikes | Firing cells | Downstream firing cells |
| --- | ---: | ---: | ---: | ---: |
| Looming | 311 | 34,346 | 5,570 | 5,259 |
| Sweet pathway | 42 | 15,870 | 3,002 | 2,960 |
| Johnston's organ | 672 | 42,086 | 5,698 | 5,026 |
| R1–R6 light | 3,377 | 38,410 | 3,377 | 0 |

R1–R6 have unresolved fast transmitter signs here, so direct visual stimulation
does not produce downstream spikes in this benchmark. Flight reads their sensory
spikes through an engineered decoder. This limitation remains explicit in the
interface and model documentation.

Simulation time is reproducible under the tested implementation; CPU timings are
hardware/load dependent. The live website was not redeployed for this source
packaging task. These local results were collected before GitHub publication.
