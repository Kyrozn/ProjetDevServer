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
  leftMatchmaking,
} from "../services/matchmaking.js";
import { generateLobbyId } from "../utils/helpers.js";
import { players } from '../models/types.js';

export interface CustomWebSocket extends WebSocket {
  userId?: string; // ou string, selon ce que tu utilises
  pseudo?: string;
  difficulties?: any; // précise le type si tu peux
}

export async function handleMessage(ws: WebSocket, message: string) {
  const cws = ws as CustomWebSocket;
  const msg = message.toString();
  if (msg.startsWith("Connection")) {
    const [, username, password] = msg.split(" ");
    console.log("Hello");
    try {
      const user = await getUserFromPassword(username, password);
      if (!user) {
        ws.send("Erreur: Utilisateur ou mot de passe incorrect");
        console.log("Erreur: Utilisateur ou mot de passe incorrect");
        return;
      }
      cws.userId = user.id;
      cws.pseudo = user.pseudo;
      cws.difficulties = user.difficulties;
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
      cws.userId = user.id;
      cws.pseudo = user.pseudo;
      cws.difficulties = user.difficulties;
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
    if (!cws.userId) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    const lobbyId = generateLobbyId();
    if (await createLobby(lobbyId, cws.userId)) {
      ws.send("LobbyCreated " + lobbyId + " " + lobbies[lobbyId].gameState?.url);
    } else {
      ws.send("LobbyCreationFailed");
    }
  } else if (msg.startsWith("JoinLobby")) {
    const [, id] = msg.split(" ");
    if (!cws.userId) {
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
    if (isPlayerInAnyLobby(cws.userId)) {
      const oldLobbyId = getLobbyOfPlayer(cws.userId);
      if (oldLobbyId && lobbies[oldLobbyId]) {
        // Find the player object by userId and delete it from the set
        const playerToDelete = Array.from(lobbies[oldLobbyId].players).find((p: players) => p.id === cws.userId);
        if (playerToDelete) {
          lobbies[oldLobbyId].players.delete(playerToDelete);
        }
      }
    }
    // You may need to provide a characterchoiced value here, e.g. null or from the message
    lobby.players.add({
      id: cws.userId,
      characterchoiced: "Luffy",
      ws: ws,
    });
    ws.send("LobbyJoin " + id);
  } else if (msg.startsWith("EnterMatchmaking")) {
    if (!cws.userId) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    var characterchoice = msg.split(" ")[1];
    enterMatchmaking(ws, characterchoice);
  } else if (msg.startsWith("LeftMatchmaking")) {
    if (!cws.userId) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    leftMatchmaking(cws);
  } else if (msg.startsWith("DestroyContainer")) {
    if (!cws.userId) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    const lobbyId = getLobbyOfPlayer(cws.userId);
    if (lobbyId) {
      stopGameServer(lobbyId);
    }
  } else if (msg.startsWith("StartGame")) {
    if (!cws.userId) {
      ws.send("Erreur: Vous devez être connecté.");
      return;
    }
    const lobbyId = getLobbyOfPlayer(cws.userId);
    if (lobbyId) {

    } 
  } else if (msg.startsWith("ChangeCharacter")) {
      if (!cws.userId) {
        ws.send("Erreur: Vous devez être connecté.");
        return;
      }
      const lobbyId = getLobbyOfPlayer(cws.userId);
      if (lobbyId) {
        const player = Array.from(lobbies[lobbyId].players).find((p: players) => p.id === cws.userId);
        if (player) {
          const [, newCharacter] = msg.split(" ");
          player.characterchoiced = newCharacter;
        }
      }
    } else {
    ws.send("Message reçu : " + msg);
  }
}
