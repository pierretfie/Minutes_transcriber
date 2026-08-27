# Minutes Transcriber

A tool for turning recorded meeting audio into polished, ready-to-share minutes — with almost no manual typing required.

It handles the full pipeline: **compress → transcribe → write minutes**, using an [n8n](https://n8n.io/) workflow powered by AI models. What used to take hours of listening and typing now takes minutes, leaving only light proofreading (mainly fixing names) as the human step.

## Table of Contents
- [How It Works](#how-it-works)
- [1. Upload & Compress Your Audio](#1-upload--compress-your-audio)
- [2. Transcription](#2-transcription)
- [3. Minutes Generation](#3-minutes-generation)
- [Full Workflow Overview](#full-workflow-overview)

  <img width="947" height="804" alt="image" src="https://github.com/user-attachments/assets/eb914285-ec93-4c8a-9048-0adce1c43a42" />


## How It Works

The process has three stages:

1. **Compress** the raw audio file to reduce size and improve transcription accuracy.
2. **Transcribe** the compressed audio into text using an AI model via n8n.
3. **Generate minutes** from the confirmed transcript, styled to match your own writing conventions.

---

## 1. Upload & Compress Your Audio

Upload your audio file and choose a compression setting. **32kHz is recommended**, as it has shown the most accurate transcription results.

The system compresses large audio files using `ffmpeg` before sending them for transcription. If you prefer, you can also compress manually:

```bash
ffmpeg -i input_file.m4a -ac 1 -ar 16000 -b:a 32k output_file.m4a
```

<img width="917" height="349" alt="Upload and compression settings" src="https://github.com/user-attachments/assets/b3ff32f7-1807-47fb-8236-57c461b9ecc6" />

### Downloadable Compressed File

Once compressed, you can download the resulting file. This means you don't have to re-compress the same audio if you need to re-run a transcription later.

<img width="917" height="349" alt="Download compressed audio file" src="https://github.com/user-attachments/assets/055dec51-1c0d-41f8-b183-ffa186298a95" />

---

## 2. Transcription

The compressed audio is sent through an n8n workflow, where an AI model transcribes it into written text — ready to review before minutes are generated.

<img width="1245" height="246" alt="Transcription workflow trigger" src="https://github.com/user-attachments/assets/da776b2c-e90d-43e6-b021-998872618823" />
<img width="979" height="819" alt="Transcription output" src="https://github.com/user-attachments/assets/8952a6ca-5b91-4829-8cc2-02e215c511b9" />

---

## 3. Minutes Generation

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

### Configuration

Edit `server/config/settings.json` to configure:
- Webhook URL
- Request timeout

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
