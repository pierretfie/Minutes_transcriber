#!/bin/bash
set -e

echo "Starting all services..."

echo "[1/3] Starting Minutes Transcriber..."
cd /home/kali/bundle
./start.sh &
TRANSCRIBER_PID=$!
echo "  PID: $TRANSCRIBER_PID"

sleep 2

echo "[2/3] Starting n8n..."
cd /home/kali
/usr/local/bin/start-n8n-ngrok.sh &
N8N_PID=$!
echo "  PID: $N8N_PID"

echo "[3/3] All services started!"
echo ""
echo "  Minutes Transcriber: http://localhost:3000"
echo "  n8n: http://localhost:5678"
echo ""

cleanup() {
    echo "Shutting down..."
    kill $TRANSCRIBER_PID 2>/dev/null || true
    kill $N8N_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

wait -n $TRANSCRIBER_PID $N8N_PID
