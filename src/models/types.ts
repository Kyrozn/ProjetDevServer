import { CustomWebSocket } from "../controllers/websocketController";

export interface User {
  id: string;
  pseudo: string;
  difficulties: string[];
}

export interface Lobby {
  gameState: GameState | null;
  players: Set<players>;
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
