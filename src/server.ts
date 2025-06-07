import { WebSocketServer } from "ws";
import { handleMessage } from "./controllers/websocketController.js";

const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    handleMessage(ws, message.toString());
  });
});

console.log(`Serveur matchmaking lancé sur le port ${PORT}`);
