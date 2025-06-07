import { Lobby, User, GameState } from "../models/types";
import { execSync } from "child_process";
import os from "os";
import getPort from "get-port";
import { generateLobbyId } from "../utils/helpers.js";

export const lobbies: Record<string, Lobby> = {};
export const playersInMatchmaking: {
  userId: string;
  difficulties: string[];
  socket: WebSocket;
}[] = [];

export function isPlayerInAnyLobby(playerId: string): boolean {
  return Object.values(lobbies).some((lobby) => lobby.players.has(playerId));
}

export function getLobbyOfPlayer(playerId: string): string | null {
  for (const [id, lobby] of Object.entries(lobbies)) {
    if (lobby.players.has(playerId)) return id;
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
    return {
      started: true,
      playersReady: 0,
      maxPlayers: 2,
      url: `http://${ip}:${port}/`,
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
  lobbies[lobbyId] = { gameState, players: new Set([playerId]) };
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

// Ajoute un joueur au matchmaking
export function enterMatchmaking(ws: any) {
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
      createLobby(lobbyId, p1.userId);
  
      // lobbies[lobbyId].clients.add(p1.socket);
      // lobbies[lobbyId].clients.add(p2.socket);
      // ex : lobbies['098OML'].players['zuayte-aiuzea-aezgai-456'] = p1;
      lobbies[lobbyId].players.add(p1.userId);
      lobbies[lobbyId].players.add(p2.userId);
  
      p1.socket.send(`LobbyJoined ${lobbyId}`);
      p2.socket.send(`LobbyJoined ${lobbyId}`);
    }
  }