# Contributing

Run `npm test` before submitting changes. Changes to neuron dynamics, the graph
loader or sensory/flight coupling should also run `npm run test:full` after data
preparation. Keep baseline results and scientific limitations explicit.

- Edit canonical `web/` sources and `data/english.json`; generated English files
  are rebuilt automatically and should not be committed.
- Do not commit raw tables, model binaries, recordings, secrets or hosting IDs.
- Preserve original neuron IDs and measured coordinates. Never invent missing
  anatomy or label an animation as experimental neural data.
- Separate validated biological findings from illustrative encoders/controller
  assumptions. Explain changes in both the UI and `docs/MODEL.md` where relevant.
- A change to data selection or ordering requires an intentional update to the
  reference hashes, data counts and attribution after validating official inputs.

Issues are most useful with the browser/OS, model time and speed, stimulus
settings, error text, and whether data verification passed. Avoid posting secrets
or private system paths. No user analytics or server-side simulation is required.
