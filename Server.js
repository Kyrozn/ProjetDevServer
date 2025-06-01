const WebSocketServer = require("ws").WebSocketServer;
const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("OneStar.db"); 

const lobbies = {};
const PlayerInMatchmaking = {userId, Diffictulties};

function createLobby(lobbyId) {
  if (!lobbies[lobbyId]) {
    lobbies[lobbyId] = {
      gameState: CreateGameServer(),
      clients: new Set(),
      players: {},
    };
    return true;
  }
  return false;
}
function CreateGameServer() {

}

wss.on("message", function incoming(message) {
  const msg = message.toString(); // assure-toi que c'est bien une string
  console.log("Reçu : %s", msg);

  if (msg.startsWith("CheckToken")) {
    const parts = msg.split(" ");
    const token = parts[1];
    const result = verifyToken(token);
    if (result.valid) {
      wss.send("Token valide !");
    } else {
      wss.send("Token invalide : " + result.error);
    }
    return;
  }
  else if (msg.startsWith("CreateLobby")) {
    const parts = msg.split(" ");
    var lobbyId = generateLobbyId();
    if (createLobby(lobbyId)) {} else {}
    return;
  }
  wss.send("Message reçu : " + msg);
});

console.log(`Serveur matchmaking lancé sur le port ${PORT}`);


function verifyToken(token) {
  try {
    db.get("SELECT id FROM users WHERE id = ?", [token], (err, row) => {
      if (err) {
        console.error("Erreur DB:", err.message);
        ws.send("ErreurDB");
      } else if (row) {
        console.log("Utilisateur trouvé:", row.pseudo);
        ws.send("TokenValide: " + row.pseudo);
      } else {
        ws.send("UtilisateurInexistant");
      }
    });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function generateLobbyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function EnterInMatchmaking() {
  PlayerInMatchmaking;
}