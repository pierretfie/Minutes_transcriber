# Meeting Audio Cleaning Pipeline

This process **replaces** the original plain 32kHz ffmpeg compression step. Instead of just resampling, recordings are now denoised and had silence stripped as part of the same pass.

## Final command (combined, single pass)

```bash
ffmpeg -i INPUT.m4a \
  -af "arnndn=m=/path_to/arnndn-models/std.rnnn,silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-35dB:stop_silence=0.2" \
  -ar 24000 -c:a libopus -b:a 32k \
  OUTPUT.opus
```

> **Why 24000, not 32000:** `libopus` only supports 8000/12000/16000/24000/48000 Hz as output sample rates — `32000` fails with `Specified sample rate 32000 is not supported by the libopus encoder`. 24kHz is still well above what's needed for clear speech, so no real quality loss.

**Alternative — keep exact 32000 Hz:** switch codec to AAC instead of opus (AAC has no such sample-rate restriction):
```bash
ffmpeg -i INPUT.m4a \
  -af "arnndn=m=/path_to/arnndn-models/std.rnnn,silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-35dB:stop_silence=0.2" \
  -ar 32000 -c:a aac -b:a 64k \
  OUTPUT.m4a
```

**Input format:** `-i INPUT.m4a` can be swapped for `.wav`, `.mp3`, `.flac`, etc. — ffmpeg detects the input format from the file itself, and the filters/output settings work the same regardless. Note: if the input is already lossy (mp3, m4a) and the output is also lossy (opus, aac), there's a small extra quality loss from lossy→lossy re-encoding — not usually audible for speech, but a `.wav` source gives the cleanest possible result if available.

## Separate (two-step) method

Useful for testing each stage individually before trusting the combined command, or if troubleshooting is needed.

**Step 1 — denoise only:**
```bash
ffmpeg -i INPUT.m4a -af "arnndn=m=/path_to/arnndn-models/std.rnnn" -ar 24000 -c:a libopus -b:a 32k denoised.opus
```

**Step 2 — silence removal on the denoised file:**
```bash
ffmpeg -i denoised.opus -af "silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-35dB:stop_silence=0.2" -c:a libopus -b:a 32k final.opus
```

> Denoise must run before silence removal — otherwise leftover background noise can sit above the `-35dB` threshold and prevent the silence detector from working correctly.

## What each part does

| Component | Purpose |
|---|---|
| `arnndn=m=std.rnnn` | RNNoise-based denoising (removes fan hum, hiss, background noise) — must run **before** silence removal |
| `-ar 32000` | Resample to 32kHz (replaces the old standalone compression step) |
| `silenceremove=stop_periods=-1` | Removes silence throughout the whole file, not just start/end |
| `stop_duration=1` | Only treats gaps ≥1 second as silence (protects natural mid-sentence pauses) |
| `stop_threshold=-35dB` | Amplitude threshold below which audio counts as silence |
| `stop_silence=0.2` | Leaves a small 0.2s buffer after each cut, avoiding jarring hard cuts into speech |
| `-c:a libopus -b:a 32k` | Compress to Opus at 32kbps (efficient for speech) |

## Model source

- Repo: [richardpl/arnndn-models](https://github.com/richardpl/arnndn-models)
- Model used: `std.rnnn` (standard RNNoise model, works well as a general starting point for meeting recordings)

## Notes / tuning

- Test settings on a short clip (`-t 180` or `-t 300`) before running on full 2hr+ files.
- If words get clipped at the start/end → increase `stop_threshold` to `-40dB` or `-45dB` (more negative = stricter, less gets removed).
- If long dead air still remains → decrease `stop_threshold` to `-30dB` or lower `stop_duration`.

## Status

✅ Denoise tested and confirmed working (`std.rnnn`)
✅ Silence removal tested and confirmed working (`-35dB`, `stop_silence=0.2`)
✅ Combined single-pass command confirmed as the standard going forward — this replaces the old plain 32kHz compression workflow.
