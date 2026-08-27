#!/bin/bash
set -e

# Start Minutes Transcriber in the background
/home/kali/bundle/start.sh &
TRANSCRIBER_PID=$!

# Start n8n in the background
/home/kali/.config/nvm/versions/node/v22.23.1/bin/n8n start &
N8N_PID=$!

# Give n8n a few seconds to come up before ngrok tries to tunnel it
sleep 5

# Start ngrok in the foreground — systemd tracks this as the main process
/usr/local/bin/ngrok http 5678 --log=stdout &
NGROK_PID=$!

# If either process dies, kill the others and exit so systemd restarts all
wait -n "$TRANSCRIBER_PID" "$N8N_PID" "$NGROK_PID"
kill "$TRANSCRIBER_PID" "$N8N_PID" "$NGROK_PID" 2>/dev/null
