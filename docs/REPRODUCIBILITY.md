# Reproduction and checks

## Independent path

1. Clone this repository into an empty directory.
2. Create a Python virtual environment and install the exact requirements.
3. Run `python scripts/prepare-data.py`. For an existing source cache, supply
   `--raw-dir /path/to/cache --offline`; the same pinned hashes are required.
4. Run `npm ci`, `npm test`, `python scripts/verify-data.py`, `npm run build` and
   `npm run test:full`.
5. Run `npm run preview` and open the English or Chinese page. Release the fly
   and change a stimulus during flight.

The repository's `work/`, generated English files and `dist/` start absent and
are recreated by these steps. No files from the author's local environment,
original Sites project or source-history credentials are needed.

## Expected graph and behavior

| Quantity | Expected value |
| --- | ---: |
| Retained cells | 166,606 |
| Directed connections | 25,574,615 |
| Synaptic contacts | 124,144,950 |
| Real soma positions | 139,659 |
| Missing soma positions | 26,947 |
| Cells with unresolved fast transmitter sign | 11,564 |

The full-network test uses actual LIF spikes, not synthetic rate fixtures. Its
seeded baseline with the indoor lamp disabled exits the open window at about
7.44 seconds of model time with zero contacts. A closed window blocks escape.
Moving a lamp changes left/right sensory responses without resetting the clock.
Food and sound tests verify input and positioned downstream spikes, odor-distance
responses and a frequency-dependent reversal between the two auditory groups.

Fixed seeds and ordered graph arrays make repeated runs reproducible within the
same implementation. Floating-point transcendental functions and scheduling may
differ between JS engines; do not infer bitwise-identical cross-browser spike
traces or equal wall-clock performance. Data bytes are checked exactly; model
assertions use scientific/behavioral invariants and tolerances where appropriate.
These outcomes test the implemented controller, not real fly behavior.

## Continuous integration

The fast GitHub Actions job requires no dataset or secrets. The full-model job
is manual because it downloads about 1.1 GB of official tables and uses more
memory/CPU. Both run with read-only repository permissions; neither deploys a
website nor uploads anything to the author's hosted site.

## Local verification for this release

See `docs/VALIDATION.md` for the actual environment, commands and results recorded
while preparing this repository. The GitHub-hosted CI runs will be available only
after the repository is uploaded; a local pass is not a claim that CI has run.
