import { Lobby, User, GameState, players } from "../models/types";
import { execSync } from "child_process";
import os from "os";
import getPort from "get-port";
import { generateLobbyId } from "../utils/helpers.js";
import { CustomWebSocket } from "../controllers/websocketController";
import db from "../database/db.js";
import { randomUUID } from "crypto";

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
      -e GAME_PORT=7777 \
      -p ${port}:7777/udp \
      unity-headless-server3`;

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
  playerId: string,
  isPerstistent: boolean
): Promise<boolean> {
  if (lobbies[lobbyId] || isPlayerInAnyLobby(playerId)) return false;
  const gameState = await createGameServer(lobbyId);
  if (!gameState) return false;
  lobbies[lobbyId] = { gameState, players: new Set<players>(), isPerstistent };
  return true;
}

export function stopGameServer(lobbyId: string) {
  try {
    var container = lobbies[lobbyId].gameState?.containerName
    execSync(`docker stop ${container}`, { stdio: "ignore" });
    execSync(`docker rm ${container}`, { stdio: "ignore" });
    console.log(`Conteneur ${container} stoppé et supprimé.`);
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
      if(await createLobby(lobbyId, p1.userId, false)) {
  
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
  export function updateHistoric(lobbyId: string, isWin: string) {
    var playersid: string[] = [];
    lobbies[lobbyId].players.forEach((player) => {playersid.push(player.id)});

      db.run(
        `INSERT INTO historic (id, player1_id, player2_id, isWin, Player1_char, Player2_char, game_date) VALUES 
        (?, ?, ?, ?, ?, ?, ?);`,
        [
          randomUUID(),
          playersid[0],
          playersid.length > 1 ? playersid[1] : "",
          isWin,
          Array.from(lobbies[lobbyId].players)[0]?.characterchoiced,
          playersid.length > 1
            ? Array.from(lobbies[lobbyId].players)[1]?.characterchoiced
            : "",
          Date.now()
        ]
      );
  }
  export function updateRank(lobbyId: string, isWin: string) {
    lobbies[lobbyId].players.forEach((player) => {
      db.get(
        `Select Elo from users where id = ?`, 
        [player.id], 
        (err, result: { Elo: number }) => {
          if (err || !result) return;
          db.run(
            `Update users SET Elo = ? where id = ?;`,
            [isWin === "true"? result.Elo + 100 : result.Elo - 100, player.id],
          );
        }
      );
    });
  }
//   db.get(
//     `INSERT INTO historic (id, player1_id, player2_id, isWin, Player1_char, Player2_char, game_date) VALUES 
//     (?, ?, ?, ?, ?, ?, ?);`[randomUUID, player.id, ],
//     async (
//       err,
//       result: {
//         token: string;
//         id: string;
//         pseudo: string;
//         difficulties: string;
//       }
//     ) => {
//       if (err) return reject(err);
//       if (!result) return resolve(null);
//       bcrypt.compare(password, result.token, (bcryptErr, resultbool) => {
//         if (bcryptErr) return reject(bcryptErr);
//         if (resultbool) {
//           resolve({
//             id: result.id,
//             pseudo: result.pseudo,
//             difficulties: JSON.parse(result.difficulties || "[]"),
//           });
//         } else {
//           resolve(null);
//         }
//       });
//     }
//   );
  
  
//   player.id
// });