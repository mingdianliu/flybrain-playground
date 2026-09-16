# Demo recording

[Video file](media/flybrain-demo.mp4) ·
[Download MP4](https://github.com/mingdianliu/flybrain-playground/raw/refs/heads/main/docs/media/flybrain-demo.mp4) ·
[Reproduce this interaction](../README.md#reproduce-the-demo-interaction)

The 54.47-second clip shows the live English webpage's room, fly trajectory,
3D neural activity and spike raster, composed with synchronized setting values
and event annotations. It is not a desktop screen recording. The actual webpage
food-position control was changed during the run.

- **0:00–0:08:** food is at X −1.8 m, Y 1.5 m, Z 1.0 m.
- **At 0:08.102:** food X is changed to +1.6 m; Y and Z remain unchanged.
- **After the move:** olfactory activity briefly decreases as the source moves
  away, then rises as the fly approaches its new location with engineered odor
  guidance enabled.

Food odor and food guidance are enabled, visual input is disabled, the window is
closed, and the room camera is top-down. The full classified MaleCNS graph runs
simplified LIF dynamics with illustrative sensory encoding and engineered flight
control. This is not a calibrated biophysical fly. Measured neuronal coordinates
are used where available; missing soma positions are not invented.

The clip is a continuous interval from source time 225.0–279.5 seconds, with no
trajectory edits or playback speed changes. Model time may advance more slowly
than wall-clock time; the video's readout shows the current simulation speed.
The original recording used source commit
`b0d3b97be1ab3e19d02bf5645ba414dc2779c8df` from the earlier website repository.
The interaction is preserved in this reproducible project.

Format: H.264 MP4, 1440 × 900, 30 fps, silent, 6,367,295 bytes.
The README's looping GIF contains the same complete clip at the original speed,
reduced to 800 × 500 and 8 fps for inline preview. The MP4 is unchanged.
The video and poster were recorded from this project; MaleCNS attribution is
retained in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
