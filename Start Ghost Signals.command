#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "Starting Ghost Signals..."
echo "Open http://localhost:8087 if the browser does not open automatically."
python3 server.py &
SERVER_PID=$!
sleep 0.6
open "http://localhost:8087"
wait "$SERVER_PID"
