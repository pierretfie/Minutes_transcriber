# Minutes Transcriber

A tool for turning recorded meeting audio into polished, ready-to-share minutes — with almost no manual typing required.

It handles the full pipeline: **compress → transcribe → write minutes**, using an [n8n](https://n8n.io/) workflow powered by AI models. What used to take hours of listening and typing now takes minutes, leaving only light proofreading (mainly fixing names) as the human step.

> **The success of this requires a well recorded session and good transcriber models of choice.**

## Table of Contents
- [Setup](#setup)
  - [1. n8n Setup](#1-n8n-setup)
  - [2. Configure Webhook URL](#2-configure-webhook-url)
- [How It Works](#how-it-works)
  - [3. Upload & Compress Your Audio](#3-upload--compress-your-audio)
  - [4. Transcription](#4-transcription)
  - [5. Minutes Generation](#5-minutes-generation)
- [Full Workflow Overview](#full-workflow-overview)
- [Deployment](#deployment)

---

## Setup

### 1. n8n Setup

Before using the UI, you need to set up the n8n workflow:

1. Install and run [n8n](https://n8n.io/)
2. Import the workflow from `n8n workflow/Minutes Transcriber.json`
3. Add your Google Gemini API credentials to the workflow nodes
4. Add your sample minutes to the workflow (replace the placeholders in the "sample" nodes)
5. Activate the workflow
6. Copy the webhook URL from the Webhook node

### 2. Configure Webhook URL

Once n8n is running and the workflow is active:
<img width="500" height="579" alt="image" src="https://github.com/user-attachments/assets/020c6e7a-1f71-459e-a7ab-2341cf9ce921" />

1. Open the Minutes Transcriber UI
2. Click the **Settings** button in the top right
3. Paste your n8n webhook URL
4. Click **Save**

> **Important:** You must configure the webhook URL before you can use the app. The UI will show a warning if no webhook is configured.

<img width="947" height="804" alt="image" src="https://github.com/user-attachments/assets/eb914285-ec93-4c8a-9048-0adce1c43a42" />

---

## How It Works

The process has three stages:

1. **Compress** the raw audio file to reduce size and improve transcription accuracy.
2. **Transcribe** the compressed audio into text using an AI model via n8n.
3. **Generate minutes** from the confirmed transcript, styled to match your own writing conventions.

### 3. Upload & Compress Your Audio

Upload your audio file and choose a compression setting. **32kHz is recommended**, as it has shown the most accurate transcription results.

The system compresses large audio files using `ffmpeg` before sending them for transcription. If you prefer, you can also compress manually:

```bash
ffmpeg -i input_file.m4a -ac 1 -ar 16000 -b:a 32k output_file.m4a
```

<img width="917" height="349" alt="Upload and compression settings" src="https://github.com/user-attachments/assets/b3ff32f7-1807-47fb-8236-57c461b9ecc6" />

#### Downloadable Compressed File

Once compressed, you can download the resulting file. This means you don't have to re-compress the same audio if you need to re-run a transcription later.

<img width="917" height="349" alt="Download compressed audio file" src="https://github.com/user-attachments/assets/055dec51-1c0d-41f8-b183-ffa186298a95" />

### 4. Transcription

The compressed audio is sent through an n8n workflow, where an AI model transcribes it into written text — ready to review before minutes are generated.

<img width="1245" height="246" alt="Transcription workflow trigger" src="https://github.com/user-attachments/assets/da776b2c-e90d-43e6-b021-998872618823" />
<img width="979" height="819" alt="Transcription output" src="https://github.com/user-attachments/assets/8952a6ca-5b91-4829-8cc2-02e215c511b9" />

### 5. Minutes Generation

Once you've reviewed and confirmed the transcript, resend it for complete minutes writing.

This step also uses an n8n workflow — one that has been trained on samples of your own past minutes, so the AI writes new minutes in your style and format.

You can include custom fields with the resend, such as the list of attendees:

<img width="1136" height="574" alt="Resend transcript for minutes writing" src="https://github.com/user-attachments/assets/5b0f3cea-4525-470c-8a17-ff338b737a0c" />
<img width="872" height="927" alt="Custom fields including attendance" src="https://github.com/user-attachments/assets/6f7ad7d6-db82-43ad-a37c-aed94a7852bd" />
<img width="933" height="331" alt="Additional custom fields" src="https://github.com/user-attachments/assets/b6783d13-8b31-49c5-b21d-580da8f98aa7" />

The result is a clean, finished set of minutes generated directly from the meeting transcript:

<img width="947" height="804" alt="Final generated minutes" src="https://github.com/user-attachments/assets/adb6ce07-0d65-40c7-a0ee-8e195b768a6f" />

---

## Full Workflow Overview

The diagram below shows the complete n8n pipeline, from audio upload to finished minutes. An hours-long manual process is reduced to minutes — the only remaining human work is proofreading and correcting the occasional name or identity error.

<img width="1398" height="733" alt="Full n8n workflow diagram" src="https://github.com/user-attachments/assets/14540b44-9860-408d-b89c-cb9d19ccc315" />

---

## Deployment

### Build & Bundle

```bash
npm run bundle
```

This creates a `bundle/` folder (9.1MB) with everything needed to run the app.

### Run Locally

```bash
cd bundle
./start.sh        # Linux/Mac
start.bat         # Windows
```

### Network Access

Open your browser and go to:
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000

Find your IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Systemd Service (Linux)

To run as a service:

```bash
sudo cp deploy/minutes-transcriber.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable minutes-transcriber
sudo systemctl start minutes-transcriber
```

### Requirements

- Node.js v18+ installed on the target machine
- Port 3000 open for network access
- n8n running with the workflow activated


# Meeting Audio Cleaning Pipeline

This process **replaces** the original plain 32kHz ffmpeg compression step. Instead of just resampling, recordings are now denoised and had silence stripped as part of the same pass.
You can upload your output opus file to the system for transcribing with no compression selected. 
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
