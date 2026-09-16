# Model, anatomy and interpretation

## Model and limitations

The model uses current-based LIF dynamics inspired by
https://github.com/philshiu/Drosophila_brain_model (Shiu et al., 2024).
All times are milliseconds, potentials and the synaptic drive variable are mV.

```
dv/dt = (-52 - v + g) / 20
dg/dt = -g / 5
spike when v > -45; reset v=-52, g=0
refractory=2.2 ms; synaptic delay=1.8 ms; dt=0.2 ms
g_post += transmitter_sign * synapse_count * 0.275 mV
```

Subthreshold state updates use the exact exponential solution over each step;
threshold detection is at step boundaries. During refractory periods both v and
g dynamics are frozen (events may accumulate into g). Poisson inputs add
68.75 mV, subject to the same refractory period as other cells. This differs
from the reference implementation's zero refractory period for input neurons.
Every retained neuron has allocated state; only exactly/quasi resting neurons
(deviation <1e-8 mV) are skipped as a numerical optimization. This does not
remove their connections. The random seed resets reproducibly.

Assumed fast effects: acetylcholine +1, GABA -1, glutamate -1. Other/unknown
transmitters have zero fast effect (11,564 neurons). These are not verified
receptor-specific signs. In particular R1–R6 stimulation currently causes direct
spikes only; it is not a complete visual transduction model. The labeled sensory
buttons directly stimulate annotated neuron types, without claiming natural
sensory encoding or a behavior output. No spontaneous background input is added.

Not implemented or provided by the connectome alone: cell-specific channel
densities/kinetics, calibrated membrane constants, compartments and dendritic
cable dynamics, synapse/receptor kinetics, electrical coupling, neuromodulatory
state, calibrated body feedback or experimental validation. Running every retained neuron
does not remove these limitations. A complete biophysical simulation requires those model specifications and calibration data. 

## Display and verification

- An independent Web Worker advances the numerical model. Main-thread
  `requestAnimationFrame` draws the latest snapshot; exactly one render loop runs.
- Point brightness is `exp(-(simulation_time-last_spike_time)/80 ms)`. This is a
  visual persistence effect on computed spikes, not a calcium measurement.
- The single-cell raster shows 12 reproducibly selected cells, with one neuron
  per labeled row and one tick per calculated spike. The first row is the current
  probe; clicking another row changes the probe and recovers its recent history.
- The alternative whole-network density view counts every calculated spike in
  10 ms bins, grouped by cell class. Color denotes population mean firing rate in
  Hz on a fixed logarithmic scale (0–100 Hz), not individual-neuron activity.
  Both views use the same 2 s, bin-aligned simulation-time window with no event
  count truncation. Uncomputed future time is shaded; pause freezes the axis and
  reset clears all history. The renderer receives sampled spikes and exact binned
  totals, avoiding the former capped raw-event preview stream.
- The trace samples membrane voltage at approximately 1 ms intervals. Spike ticks
  are plotted above threshold as event markers, not as reconstructed action
  potential waveforms.
- Graph load failure stops the application; there is no synthetic fallback data.

```sh
node scripts/test-lif.mjs
node scripts/benchmark-full.mjs
```

Tests cover quiet baseline, analytic membrane decay, synaptic delay, excitation,
inhibition, unknown signs, refractory behavior, reproducibility and reset. The
full-graph benchmark runs all four input sets and writes results under `work/`.

## Interactive flight experiment

The default route is a Three.js 3D room with direct manipulation, a movable indoor
lamp, an occluding sphere, flight trail, panorama sensors and follow/top cameras.
Click or drag to set a future starting point, with height and heading controls;
release uses that point. A moving lamp and blocker modify inputs during a trial.
Click the window to open/close it; a button flashes the lamp for 350 ms of model
time. Numeric and keyboard controls provide alternatives to pointer dragging.

Both routes show an independently rotatable, zoomable and pannable 3D soma point
cloud. XYZ coordinates all use 0.008 micrometers per voxel, with one common center
and a rigid rotation, preserving spatial distances. Missing positions are omitted.
Click a point to select its model neuron, focus the probe, filter active cells,
adjust background visibility or expand the viewer. Compact screens retain the
full interactive brain panel instead of a small noninteractive inset.

This is an **engineered hybrid controller**, not emergent biological flight:

- 72 virtual visual-field bins cast rays into room geometry (including occlusion).
  Source `rootSide` / `somaSide` labels assign 3,377 R1–R6 cells to the correct eye;
  assignment within the eye is artificial, **not measured retinotopy**.
- Environment luminance sets Poisson input rates (2 + 110 × luminance Hz). Turning
  reads their actual LIF spike rates, smoothed over 110 ms. The decoder receives no
  target coordinate or saved route. All 166,606 model cells remain in the graph.
- The indoor emitter uses an angular Gaussian acceptance profile and distance
  falloff, with furniture and sphere occlusion. This is an artificial encoding,
  not a measured fly receptive field or a calibrated photometric simulation.
  The sphere also changes local ranges and the same collision checks as the room.
- 311 LC4 / LPLC2 cells receive an artificial range/proximity encoding (1–76 Hz),
  driving actual graph propagation shown in the anatomy view. These responses are
  not experimentally calibrated natural looming responses.
- R1–R6 have unresolved fast transmitter signs in this model, so phototaxis is
  decoded directly from sensory spikes. The downstream network is observed, but
  **is not a validated motor controller**. No descending-neuron-to-muscle map,
  aerodynamic wing forces or reinforcement learning is claimed.
- Local range avoidance, collision response, speed and altitude stabilization
  are engineering assists. Sensor rays, closed glass, the ceiling and furniture
  bounds are physical constraints; the dollhouse rendering hides two walls and
  the ceiling for visibility. The desk uses a conservative solid bounding box.
  The fly is enlarged for legibility.
- The environment advances every 20 ms of computed neural time. Flight cannot
  advance while the numerical model is paused or stalled. The visual spike halo
  remains 80 ms. On exit both views pause. Changing a future starting location
  preserves the active flight; releasing again resets neural and environment state
  together. Moving the lamp, changing its intensity or moving the blocker never
  resets neural state. No prerecorded flight or spiking movie.
- Closing the window preserves luminance while blocking exit. Light level,
  aperture location, obstacles and visual input can be changed during a trial.
  Removing visual input removes receptor drive but retains proximity and scanning.

`python3 scripts/prepare-room-inputs.py` regenerates the small input-ID mapping
from the same pinned annotation table. Three.js 0.180.0 is vendored with its MIT
license under `web/vendor/`; no CDN request is needed at runtime.

Validation:

```sh
node scripts/test-room.mjs
node scripts/test-interaction.mjs
node scripts/test-room-full.mjs
```

The first checks ray optics/occlusion, containment behind closed glass, reset and
12 window/start scenarios with expected sensory rates. The full-network test uses the
actual LIF graph and computed spikes, including a left/right lamp movement that
reverses the direction of the evoked receptor spike response without resetting
the clock. The interaction tests also check coordinate distance preservation,
start placement, light attenuation, occlusion and flash expiry. Baseline trial
with the indoor lamp disabled: exit at 7.44 simulated s,
5.425 m, zero obstacle contacts, 746,197 computed spikes (deterministic seed).
These are synthetic task results, not a prediction of real-fly behavior.

### Movable food and sound sources

The room toolbar adds draggable food and a simulated speaker, plus position/height,
source toggles, odor intensity, sound amplitude, 40–800 Hz tuning, and continuous
or 350 ms per second envelopes. These are interactive source markers, not physical
collision bodies. They do not play computer audio. Controls preserve ongoing LIF
state and history. Both the source rings and input envelopes use model time.

`prepare-room-inputs.py` selects source-annotated L/R neurons: 148 ORN_DM1/ORN_VA2
cells and 101 numbered JO-A/JO-B cells. Unknown-side ORNs and unclear JO types are
excluded. All these input somas are missing in the source; they remain in computation
and the raster, without invented 3D coordinates. Input and positioned downstream
probes are available beside the raster. Downstream probes are the positioned direct
target with greatest summed synapse weight from the selected sensory population.

`room-stimuli.mjs` contains explicitly illustrative distance fields and response
curves, not calibrated odor concentrations or physical acoustics. A/B tuning centers
(220/70 Hz) and bandwidths are engineering choices. Only amplitude envelopes are
encoded as Poisson inputs, not acoustic carrier phase. Food steering is an optional
local-gradient assist gated by actual ORN spikes; disabling it preserves odor neural
input. Sound has no assumed motor response. Neither food consumption, hunger,
olfactory fluid dynamics nor courtship behavior is simulated. Weighted sensory
population rates use actual spikes with 110 ms exponential smoothing.

Biological motivation: Semmelhack & Wang (2009), doi:10.1038/nature07983;
Yorozu et al. (2009), doi:10.1038/nature07843. These do not validate the encoders or
flight controller used here.

Validation: `node scripts/test-senses.mjs` covers source toggles, distance/intensity,
frequency response, timed envelopes and spike-gated steering. With the local full
data, `node scripts/test-senses-full.mjs` verifies actual sensory and positioned
downstream spikes, frequency reversal, distance response and live-state preservation.
