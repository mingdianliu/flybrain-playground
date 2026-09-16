# Data pipeline and file format

## Sources

`data/source-checksums.json` pins three public MaleCNS v1.0 Feather files: neuron
annotations, neurotransmitter predictions and connection weights. Every file is
checked by size and SHA-256 before parsing. Nothing queries the hosted demo or
requires a neuPrint token. Failed partial downloads are discarded and retried;
completed cached files can be reused with `--offline`.

The exporter retains annotation rows with a nonempty `superclass` excluding
`tbc`, sorts by `bodyId`, and keeps every positive connection between retained
cells. Duplicate directed pairs fail explicitly instead of being silently merged.
There is no synapse-weight threshold. The export includes isolated selected cells.

## Generated assets in work/full/

| Asset | Decoded content |
| --- | --- |
| `manifest.json` | Dataset counts, source provenance, type/class/transmitter dictionaries, coordinate units, chunk layout and compressed SHA-256 hashes |
| `neurons.json.gz` | JSON rows `[bodyId, typeIndex, classIndex, transmitterIndex, x, y, z]`; absent soma XYZ values are `null` |
| `offsets.bin.gz` | Little-endian uint32 CSR row offsets, length `neurons + 1` |
| `targets-NN.bin.gz` | Little-endian uint32 indices of postsynaptic cells, ordered first by presynaptic then postsynaptic index |
| `weights-NN.bin.gz` | Little-endian uint16 synaptic contact counts in this release; `manifest.weight_bytes` specifies width |

For presynaptic cell `i`, its outgoing connections occupy
`offsets[i] ... offsets[i+1] - 1` in the concatenated target/weight arrays.
Each manifest chunk specifies `start` and `count` into those concatenated arrays.
There are 13 target chunks and 13 weight chunks, plus nodes and offsets.
Coordinates are native 8 nm isotropic EM voxels, not atlas-transformed positions.

A spec's optional `files` list permits lossless transport splitting of the same
gzip stream. The browser joins pieces and verifies the SHA-256 of the complete
compressed stream before decoding. New local exports use unsplit files.

`web/room-inputs.json` contains source-side-labelled neuron IDs, not generated
neuron positions. It selects 3,377 R1–R6 visual cells, 311 LC4/LPLC2 looming cells,
148 ORN_DM1/ORN_VA2 olfactory cells and 101 numbered JO-A/JO-B auditory cells.
The sensory field assignment, odor/sound profiles and control decoder remain
explicitly artificial; see [MODEL.md](MODEL.md).

## Reproducibility boundaries

`data/model-reference.json` records exact **decoded** hashes for all 28 arrays,
the model metadata fingerprint and the sensory-map hash. This detects a changed
selection, row ordering, connectivity, weight or coordinate. Gzip bytes can vary
between Python/zlib versions; the decoded reference comparison remains valid.
Export timestamps are deliberately excluded from the metadata fingerprint.

The model is a derived representation under the source data's CC BY 4.0 license.
It does not include EM image volumes, neurite skeletons, compartment morphologies,
ion-channel measurements or calibrated receptor/biophysical parameters.
