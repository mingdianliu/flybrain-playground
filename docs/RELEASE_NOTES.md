# Flybrain Playground v0.1.0

Interactive English/Chinese playground with movable light, food and sound
sources, a virtual fly, and a rotatable 3D neural activity display.

- Full classified MaleCNS v1.0 graph: 166,606 cells and 25,574,615 connections.
- 139,659 measured soma positions; missing positions are not invented.
- Simplified LIF spiking dynamics, illustrative sensory encoders and engineered
  flight control. This is not a complete or validated biophysical fly.
- Reproducible official-source pipeline with pinned SHA-256 and decoded-array
  reference checks; portable static build; fast and full-network tests.

Original code is MIT licensed. MaleCNS source/derived data remains CC BY 4.0;
please retain the repository's THIRD_PARTY_NOTICES.md with redistributed data.

The optional `malecns-v1.0-model.zip` can be installed with:

```sh
python scripts/install-data.py /path/to/malecns-v1.0-model.zip
npm start
```

Rebuild independently using `python scripts/prepare-data.py`. See README.md for
environment setup, limitations and complete reproduction steps.
