const WebSocketServer = require("ws").WebSocketServer;
const sqlite3 = require("sqlite3").verbose();
const { execSync } = require("child_process");
const bcrypt = require("bcrypt"); // Make sure bcrypt is required at the top of your file
let getPort;
import("get-port")
  .then((module) => {
    getPort = module.default;
  })
  .catch((err) => {
    console.error("Failed to import get-port:", err);
    process.exit(1);
  });
const os = require("os");

const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });
const db = new sqlite3.Database("OneStar.db");

// Stockage des lobbies et des joueurs en matchmaking
const lobbies = {};
const playersInMatchmaking = [];
function isPlayerInAnyLobby(playerId) {
  return Object.values(lobbies).some(
    (lobby) => lobby.players && lobby.players.has(playerId)
  );
}

function GetLobbyofPlayer(playerId) {
  for (const lobby of Object.values(lobbies)) {
    if (lobby.players && lobby.players.has(playerId)) {
      return lobby.gameState?.containerName;
    }
  }
  return null;
}

// Création d'un lobby avec un identifiant unique
function createLobby(lobbyId, id) {
  if (!lobbies[lobbyId] && !isPlayerInAnyLobby(id)) {
    lobbies[lobbyId] = {
      gameState: createGameServer(lobbyId),
      players: new Set([id]),
    };
    if (lobbies[lobbyId].gameState === null) return false; 
    return true;
  }
  return false;
}

function stopGameServer(idPlayer) {
  try {
    // Arrêter le conteneur (utile si tu ne l'as pas lancé avec --rm)
    execSync(`docker stop ${GetLobbyofPlayer(idPlayer)}`, { stdio: "ignore" });

    // Supprimer le conteneur (optionnel si tu l'avais lancé avec --rm)
    execSync(`docker rm ${GetLobbyofPlayer(idPlayer)}`, { stdio: "ignore" });

    console.log(
      `✅ Conteneur "${GetLobbyofPlayer(idPlayer)}" supprimé avec succès.`
    );
  } catch (error) {
    console.error(
      `❌ Erreur lors de la suppression du conteneur "${GetLobbyofPlayer(
        idPlayer
      )}":`,
      error.message
    );
  }
}

// Initialise l'état d'une partie (à adapter à ton jeu)
async function createGameServer(lobbyId) {
  if (!getPort) {
    throw new Error("get-port module not initialized yet");
  }
  const minPort = 9001;
  const maxPort = 9003;

  // Correct way to specify port range in current get-port versions
  const port = await getPort({
    port: [
      9001,
      9002,
      9003, // Explicit array of ports to try
    ],
  });

  const containerName = `unity_server_${lobbyId}`;
  const unityImage = "my-unity-server:latest";
  const containerPort = 7777;
/*
  try {
    execSync(
      `docker run -d --rm --name ${containerName} -p ${port}:${containerPort} ${unityImage} -batchmode -nographics -port ${containerPort}`,
      { stdio: "ignore" }
    );
  } catch (error) {
    console.error("Erreur lors du lancement du conteneur Docker:", error);
    return null;
  }
*/
  // Obtenir l’IP locale
  const interfaces = os.networkInterfaces();
  let ip = "127.0.0.1"; // fallback
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
  }

  return {
    started: true,
    playersReady: 0,
    maxPlayers: 2,
    url: `http://${ip}:${port}/`,
    containerName: containerName,
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


function getUserFromPassword(username, password, callback) {
  db.get("SELECT * FROM users WHERE pseudo = ?", [username], (err, row) => {
    if (err) {
      callback({ success: false, error: err.message });
    } else if (row) {
      bcrypt.compare(password, row.token, (bcryptErr, result) => {
        if (bcryptErr) {
          callback({ success: false, error: bcryptErr.message });
        } else if (result) {
          const user = {
            id: row.id,
            pseudo: row.pseudo,
            difficulties: JSON.parse(row.difficulties || "[]"),
          };
          callback({ success: true, user });
        } else {
          callback({
            success: false,
            error: "Mot de passe incorrect",
          });
        }
      });
    } else {
      callback({
        success: false,
        error: "Utilisateur inexistant",
      });
    }
  });
}

// Ajoute un joueur au matchmaking
function enterMatchmaking(ws) {
  if (!isPlayerInAnyLobby(ws.userId)) {
    playersInMatchmaking.push({
      userId: ws.userId,
      difficulties: ws.difficulties,
      socket: ws,
    });
  
    ws.send("MatchmakingStart");
    tryToCreateLobby();
  } else {
    ws.send("Player Already in a Lobby");
  }
}

// Essaie de regrouper 2 joueurs dans un lobby (simplifié)
function tryToCreateLobby() {
  if (playersInMatchmaking.length >= 2) {
    const [p1, p2] = playersInMatchmaking.splice(0, 2);
    const lobbyId = generateLobbyId();
    createLobby(lobbyId);

    // lobbies[lobbyId].clients.add(p1.socket);
    // lobbies[lobbyId].clients.add(p2.socket);
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
    if (msg.startsWith("Connection")) {
      const parts = msg.split(" ");
      const username = parts[1];
      const password = parts[2];
      getUserFromPassword(username, password, (result) => {
        if (result.success) {
          const user = result.user;
          ws.userId = user.id;
          ws.pseudo = user.pseudo;
          ws.difficulties = user.difficulties;
          ws.send("TokenValide " + user.pseudo);
          ws.send("GetAccount " + user.id + " " + user.pseudo + " " + user.difficulties);
        } else {
          ws.send("Erreur: " + result.error);
        }
      });
      return;
    }
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
          ws.send("GetAccount " + user.id + " " + user.pseudo + " " + user.difficulties);
        } else {
          ws.send("Erreur: " + result.error);
        }
      });
      return;
    }

    // CreateLobby
    else if (msg.startsWith("CreateLobby")) {
      const lobbyId = generateLobbyId();
      const parts = msg.split(" ");
      const token = parts[1];
      if (createLobby(lobbyId, token)) {
        ws.send("LobbyCreated " + lobbyId);
      } else {
        ws.send("LobbyCreationFailed");
      }
      return;
    } else if (msg.startsWith("JoinLobby")) {
      const parts = msg.split(' ');
      const id = parts[1];
      
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
    } else if (msg.startsWith("DestroyContainer")) {
      if (!ws.userId) {
        ws.send("Erreur: Vous devez être connecté avec un token valide.");
      } else {
        stopGameServer(ws.userId);
      }
      return;
    } 

    // Réponse générique
    ws.send("Message reçu : " + msg);
  });
});

console.log(`✅ Serveur matchmaking lancé sur le port ${PORT}`);