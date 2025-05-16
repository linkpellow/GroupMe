#!/bin/bash

# Kill ports
kill $(lsof -ti :5173) 2>/dev/null || true
kill $(lsof -ti :3001) 2>/dev/null || true

# Start real server
cd dialer-app/server
npm start &

# Start client
cd ../client
npm run dev &

echo "✅ Both servers started successfully"
echo "✅ Access your app at http://localhost:5173"
echo "Press Ctrl+C to stop all servers"

# Wait for user to press Ctrl+C
trap "echo 'Stopping all servers...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null" INT
wait 