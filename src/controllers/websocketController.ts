import WebSocket from 'ws';
import { getUserFromPassword, getUserFromToken } from "../services/auth.js";
import {
  createLobby,
  isPlayerInAnyLobby,
  playersInMatchmaking,
  lobbies,
  getLobbyOfPlayer,
  stopGameServer,
  enterMatchmaking,
} from "../services/matchmaking.js";
import { generateLobbyId } from "../utils/helpers.js";

interface CustomWebSocket extends WebSocket {
  userId?: string; // ou string, selon ce que tu utilises
  pseudo?: string;
  difficulties?: any; // précise le type si tu peux
}

export async function handleMessage(ws: CustomWebSocket, message: string) {
  const msg = message.toString();
  if (msg.startsWith("Connection")) {
    const [, username, password] = msg.split(" ");
    try {
      const user = await getUserFromPassword(username, password);
      if (!user) {
        ws.send("Erreur: Utilisateur ou mot de passe incorrect");
        return;
      }
      ws["userId"] = user.id;
      ws["pseudo"] = user.pseudo;
      ws["difficulties"] = user.difficulties;
      ws.send("TokenValide " + user.pseudo);
      ws.send(
        "GetAccount " +
          user.id +
          " " +
          user.pseudo +
          " " +
          JSON.stringify(user.difficulties)
      );
    } catch (err) {
      ws.send("Erreur: " + (err as Error).message);
    }
  } else if (msg.startsWith("CheckToken")) {
    const [, token] = msg.split(" ");
    try {
      const user = await getUserFromToken(token);
      if (!user) {
        ws.send("Erreur: Token invalide");
        return;
      }
      ws["userId"] = user.id;
      ws["pseudo"] = user.pseudo;
      ws["difficulties"] = user.difficulties;
      ws.send("TokenValide " + user.pseudo);
      ws.send(
        "GetAccount " +
          user.id +
          " " +
          user.pseudo +
          " " +
          JSON.stringify(user.difficulties)
      );
    } catch (err) {
      ws.send("Erreur: " + (err as Error).message);
    }
  } else if (msg.startsWith("CreateLobby")) {
    if (!ws["userId"]) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    const lobbyId = generateLobbyId();
    if (await createLobby(lobbyId, ws["userId"])) {
      ws.send("LobbyCreated " + lobbyId);
    } else {
      ws.send("LobbyCreationFailed");
    }
  } else if (msg.startsWith("JoinLobby")) {
    const [, id] = msg.split(" ");
    if (!ws["userId"]) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    if (!lobbies[id]) {
      ws.send("LobbyNotFound");
      return;
    }
    const lobby = lobbies[id];
    if (lobby.players.size >= (lobby.gameState?.maxPlayers ?? 2)) {
      ws.send("LobbyFull");
      return;
    }
    if (isPlayerInAnyLobby(ws["userId"])) {
      const oldLobbyId = getLobbyOfPlayer(ws["userId"]);
      if (oldLobbyId && lobbies[oldLobbyId]) {
        lobbies[oldLobbyId].players.delete(ws["userId"]);
      }
    }
    lobby.players.add(ws["userId"]);
    ws.send("LobbyJoin " + id);
  } else if (
    msg.startsWith("EnterMatchmaking") ||
    msg.startsWith("StartGame")
  ) {
    if (!ws["userId"]) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    enterMatchmaking(ws);
  } else if (msg.startsWith("DestroyContainer")) {
    if (!ws["userId"]) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    const lobbyId = getLobbyOfPlayer(ws["userId"]);
    if (lobbyId) {
      stopGameServer(lobbyId);
    }
  } else {
    ws.send("Message reçu : " + msg);
  }
}
