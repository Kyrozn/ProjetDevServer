import { Lobby, User, GameState, players } from "../models/types";
import { execSync } from "child_process";
import os from "os";
import getPort from "get-port";
import { generateLobbyId } from "../utils/helpers.js";
import { CustomWebSocket } from "../controllers/websocketController";

export const lobbies: Record<string, Lobby> = {};
export const playersInMatchmaking: {
  userId: string;
  characterchoice: string;
  difficulties: string[];
  socket: CustomWebSocket;
}[] = [];

export function isPlayerInAnyLobby(playerId: string): boolean {
  return Object.values(lobbies).some((lobby) =>
    Array.from(lobby.players).some((player) => player.id === playerId)
  );
}

export function getLobbyOfPlayer(playerId: string): string | null {
  for (const [id, lobby] of Object.entries(lobbies)) {
    for (const player of lobby.players) {
      if (player.id === playerId) return id;
    }
  }
  return null;
}

export async function createGameServer(
  lobbyId: string
): Promise<GameState | null> {
  try {


    const port = await getPort({ port: [9001, 9002, 9003] });
    const containerName = `unity_server_${lobbyId}`;
    // ici tu peux relancer ton docker avec execSync
    const interfaces = os.networkInterfaces();
    let ip = "127.0.0.1";
    for (const iface of Object.values(interfaces)) {
      for (const addr of iface ?? []) {
        if (addr.family === "IPv4" && !addr.internal) {
          ip = addr.address;
          break;
        }
      }
    }
        const cmd = `docker run -d --name ${containerName} \
      -e GAME_PORT=${port} \
      -p ${port}:${port} \
      unity-headless-server`;

        execSync(cmd, { stdio: "inherit" });
    return {
      started: true,
      playersReady: 0,
      maxPlayers: 2,
      url: `${port}`,
      containerName,
    };
  } catch (err) {
    console.error("Erreur création serveur de jeu:", err);
    return null;
  }
}

export async function createLobby(
  lobbyId: string,
  playerId: string
): Promise<boolean> {
  if (lobbies[lobbyId] || isPlayerInAnyLobby(playerId)) return false;
  const gameState = await createGameServer(lobbyId);
  if (!gameState) return false;
  lobbies[lobbyId] = { gameState, players: new Set<players>() };
  return true;
}

export function stopGameServer(lobbyId: string) {
  try {
    execSync(`docker stop ${lobbyId}`, { stdio: "ignore" });
    execSync(`docker rm ${lobbyId}`, { stdio: "ignore" });
    console.log(`Conteneur ${lobbyId} stoppé et supprimé.`);
  } catch (err) {
    console.error("Erreur arrêt conteneur:", err);
  }
}
export function leftMatchmaking(ws: CustomWebSocket) {
  const index = playersInMatchmaking.findIndex((p) => p.userId === ws.userId);
  if (index !== -1) {
    playersInMatchmaking.splice(index, 1);
    ws.send("LeftMatchmaking");
  } else {
    ws.send("NotInMatchmaking");
  }
}
// Ajoute un joueur au matchmaking
export function enterMatchmaking(ws: any, characterchoice: string) {
    if (!isPlayerInAnyLobby(ws.userId)) {
      playersInMatchmaking.push({
        userId: ws.userId,
        characterchoice: characterchoice,
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
async function tryToCreateLobby() {
    if (playersInMatchmaking.length >= 2) {
      const [p1, p2] = playersInMatchmaking.splice(0, 2);
      const lobbyId = generateLobbyId();
      if(await createLobby(lobbyId, p1.userId)) {
  
      // lobbies[lobbyId].clients.add(p1.socket);
      // lobbies[lobbyId].clients.add(p2.socket);
      // ex : lobbies['098OML'].players['zuayte-aiuzea-aezgai-456'] = p1;
      lobbies[lobbyId].players.add({
        id: p1.userId,
        characterchoiced: p1.characterchoice, 
        ws: p1.socket
      } as players);
      lobbies[lobbyId].players.add({
        id: p2.userId,
        characterchoiced: p2.characterchoice,
        ws: p2.socket
      } as players);
  
      p1.socket.send(`LobbyJoined ${lobbyId}`);
      p2.socket.send(`LobbyJoined ${lobbyId}`);
    }
    }
  }