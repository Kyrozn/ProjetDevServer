const WebSocketServer = require("ws").WebSocketServer;
const sqlite3 = require("sqlite3").verbose();

const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });
const db = new sqlite3.Database("OneStar.db");

// Stockage des lobbies et des joueurs en matchmaking
const lobbies = {};
const playersInMatchmaking = [];

// Création d'un lobby avec un identifiant unique
function createLobby(lobbyId) {
  if (!lobbies[lobbyId]) {
    lobbies[lobbyId] = {
      gameState: createGameServer(),
      clients: new Set(),
      players: {},
    };
    return true;
  }
  return false;
}

// Initialise l'état d'une partie (à adapter à ton jeu)
function createGameServer() {
  return {
    started: false,
    playersReady: 0,
    maxPlayers: 2,
    mapSeed: Math.floor(Math.random() * 1000000),
  };
}

// Génère un ID de lobby aléatoire (6 caractères)
function generateLobbyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Récupère un utilisateur à partir de son token
function getUserFromToken(token, callback) {
  db.get("SELECT * FROM users WHERE token = ?", [token], (err, row) => {
    if (err) {
      callback({ success: false, error: err.message });
    } else if (row) {
      const user = {
        id: row.id,
        pseudo: row.pseudo,
        difficulties: JSON.parse(row.difficulties || '[]')
      };
      callback({ success: true, user });
    } else {
      callback({ success: false, error: "Token invalide ou utilisateur inexistant" });
    }
  });
}

// Ajoute un joueur au matchmaking
function enterMatchmaking(ws) {
  playersInMatchmaking.push({
    userId: ws.userId,
    difficulties: ws.difficulties,
    socket: ws,
  });

  ws.send("MatchmakingStart");
  tryToCreateLobby();
}

// Essaie de regrouper 2 joueurs dans un lobby (simplifié)
function tryToCreateLobby() {
  if (playersInMatchmaking.length >= 2) {
    const [p1, p2] = playersInMatchmaking.splice(0, 2);
    const lobbyId = generateLobbyId();
    createLobby(lobbyId);

    lobbies[lobbyId].clients.add(p1.socket);
    lobbies[lobbyId].clients.add(p2.socket);
    lobbies[lobbyId].players[p1.userId] = p1;
    lobbies[lobbyId].players[p2.userId] = p2;

    p1.socket.send(`LobbyJoined ${lobbyId}`);
    p2.socket.send(`LobbyJoined ${lobbyId}`);
  }
}

// Connexion d'un client WebSocket
wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    const msg = message.toString();
    console.log("Reçu : %s", msg);

    // CheckToken <token>
    if (msg.startsWith("CheckToken")) {
      const parts = msg.split(" ");
      const token = parts[1];

      getUserFromToken(token, (result) => {
        if (result.success) {
          const user = result.user;
          ws.userId = user.id;
          ws.pseudo = user.pseudo;
          ws.difficulties = user.difficulties;
          ws.send("TokenValide " + user.pseudo);
        } else {
          ws.send("Erreur: " + result.error);
        }
      });
      return;
    }

    // CreateLobby
    else if (msg.startsWith("CreateLobby")) {
      const lobbyId = generateLobbyId();
      if (createLobby(lobbyId)) {
        ws.send("LobbyCreated " + lobbyId);
      } else {
        ws.send("LobbyCreationFailed");
      }
      return;
    }

    // EnterMatchmaking
    else if (msg.startsWith("EnterMatchmaking")) {
      if (!ws.userId) {
        ws.send("Erreur: Vous devez être connecté avec un token valide.");
      } else {
        enterMatchmaking(ws);
      }
      return;
    }

    // Réponse générique
    ws.send("Message reçu : " + msg);
  });
});

console.log(`✅ Serveur matchmaking lancé sur le port ${PORT}`);
