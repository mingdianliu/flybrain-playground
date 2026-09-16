# Third-party code, data and scientific attribution

## MaleCNS v1.0 data — CC BY 4.0

The neuron annotations, neurotransmitter predictions and connectivity tables
come from the MaleCNS project: FlyEM at HHMI Janelia, University of Cambridge,
MRC Laboratory of Molecular Biology and Google Research.

- [Official source, data downloads and license](https://male-cns.janelia.org/download/)
- [Berg et al., 2026](https://doi.org/10.1016/j.cell.2026.08.015)
- [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- The three source URLs, sizes and SHA-256 digests are in `data/source-checksums.json`.

This project filters annotated cells, sorts them by body ID, remaps connections
to array indices and compresses the resulting graph. The derived model assets
and `web/room-inputs.json` retain the data's CC BY 4.0 license, independently of
the code's MIT license. Preserve this attribution with redistributed data.
Coordinates are measured somas where present; missing coordinates are not filled
in. Synthetic sensory encoding and flight behavior are contributions of this
project, and are not endorsed or validated by the data providers.

## Three.js 0.180.0 — MIT

`web/vendor/three.core.min.js`, `three.module.min.js` and `OrbitControls.js` are
vendored from [Three.js r180](https://github.com/mrdoob/three.js/tree/r180).
Copyright 2010–2025 Three.js authors. The full license is preserved in
`web/vendor/THREE-LICENSE.txt`. No CDN is needed while running the application.

## Scientific model reference — MIT

The point-neuron LIF model is inspired by
[Shiu and Spiller's Drosophila brain model](https://github.com/philshiu/Drosophila_brain_model).
Copyright 2023 Philip Shiu and Nico Spiller. Its MIT notice is retained in
`licenses/DROSOPHILA-BRAIN-MODEL-MIT.txt` as attribution. This repository uses a
JavaScript implementation, a different connectome, exact subthreshold updates
and a nonzero input-neuron refractory period. It does not claim to reproduce
the reference paper's experiments; see `docs/MODEL.md`.

Olfactory and auditory motivation is cited in `docs/MODEL.md`. Those studies do
not validate this project's illustrative odor/acoustic fields or controller.
