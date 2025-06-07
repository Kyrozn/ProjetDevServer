export interface User {
  id: string;
  pseudo: string;
  difficulties: string[];
}

export interface Lobby {
  gameState: GameState | null;
  players: Set<string>;
}

export interface GameState {
  started: boolean;
  playersReady: number;
  maxPlayers: number;
  url: string;
  containerName: string;
}
