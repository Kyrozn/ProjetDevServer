const WebSocketServer = require("ws").WebSocketServer;

const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", function connection(ws) {
  console.log("Client connecté");
  ws.on("message", function incoming(message) {
    switch (message) {
        case "JoinLobby":
            //fonctionX();
            break;
    }
    console.log("Reçu : %s", message);
    ws.send("Message reçu : " + message);
  });

  ws.send("Bienvenue client Unity !");
});

console.log(`Serveur matchmaking lancé sur le port ${PORT}`);
//fonctionX() {}