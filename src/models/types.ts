import { CustomWebSocket } from "../controllers/websocketController";

export interface User {
  id: string;
  pseudo: string;
  Elo: number;
}

export interface Lobby {
  gameState: GameState | null;
  players: Set<players>;
  isPerstistent: boolean;
}

export interface GameState {
  started: boolean;
  playersReady: number;
  maxPlayers: number;
  url: string;
  containerName: string;
}
export interface players {
  id: string;
  characterchoiced: string;
  ws: CustomWebSocket;
}
