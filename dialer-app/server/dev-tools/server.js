/**
 * MAIN APPLICATION SERVER
 *
 * Core server for the dialer application that handles API requests
 * and serves the client application in production.
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { WebSocketServer } from "ws";

// Router imports
import authRouter from "./routes/auth.js";
import leadsRouter from "./routes/leads.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server to attach WebSocket
const httpServer = http.createServer(app);

// WebSocket server setup
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log("Received WebSocket message:", msg);

      if (msg.type === "authenticate") {
        // In future, verify JWT here
        ws.send(
          JSON.stringify({
            type: "auth_success",
            message: "WebSocket authenticated",
          }),
        );
      }
    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected from WebSocket");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/leads", leadsRouter);
// Temporary fallback dispositions route until DB-powered route is implemented
app.get("/api/dispositions", (_req, res) => {
  res.status(200).json([
    { id: "d1", name: "No Answer", color: "#9e9e9e" },
    { id: "d2", name: "Interested", color: "#4caf50" },
    { id: "d3", name: "Not Interested", color: "#f44336" },
    { id: "d4", name: "Callback", color: "#2196f3" },
    { id: "d5", name: "Voicemail", color: "#ff9800" },
    { id: "d6", name: "Sale Made", color: "#8bc34a" },
    { id: "d7", name: "Do Not Call", color: "#e91e63" },
    { id: "d8", name: "Busy", color: "#03a9f4" },
  ]);
});

// Serve static files for production
app.use(express.static(path.join(__dirname, "../client/dist")));

// Catch all routes to serve the SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`Server and WebSocket running on port ${PORT}`);
});
