import type { GameState, LobbyGame } from '../types/game';

const API = "https://njuka-webapp-backend.onrender.com";
export const WS_API = API.replace('https://', 'wss://');  // WebSocket API

export class GameService {
  async createLobby(host: string, maxPlayers: number): Promise<LobbyGame> {
    const response = await fetch(`${API}/lobby/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, max_players: maxPlayers }),
    });
    if (!response.ok) throw new Error('Failed to create lobby');
    return await response.json();
  }

  async joinLobby(lobbyId: string, player: string): Promise<LobbyGame> {
    const response = await fetch(`${API}/lobby/${lobbyId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player }),
    });
    if (!response.ok) throw new Error('Failed to join lobby');
    return await response.json();
  }

  async getLobbies(): Promise<{ lobbies: LobbyGame[] }> {
    const response = await fetch(`${API}/lobbies`);
    if (!response.ok) throw new Error('Failed to fetch lobbies');
    return await response.json();
  }

  async getGame(gameId: string): Promise<GameState> {
    const response = await fetch(`${API}/game/${gameId}`);
    if (!response.ok) throw new Error('Failed to fetch game state');
    return await response.json();
  }

  async drawCard(gameId: string): Promise<GameState> {
    const response = await fetch(`${API}/game/${gameId}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to draw card');
    return await response.json();
  }

  async discardCard(gameId: string, cardIndex: number): Promise<GameState> {
    const response = await fetch(`${API}/game/${gameId}/discard?card_index=${cardIndex}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to discard card');
    return await response.json();
  }

  async createNewGame(
    mode: string,
    playerName: string,
    cpuCount: number = 1,
    maxPlayers: number = 4
  ): Promise<GameState> {
    const response = await fetch(
      `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}&max_players=${maxPlayers}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) throw new Error('Failed to create game');
    return await response.json();
  }

  async joinGame(gameId: string, playerName: string): Promise<GameState> {
    const response = await fetch(`${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to join game');
    return await response.json();
  }

  async cancelLobby(lobbyId: string, hostName: string): Promise<void> {
    const response = await fetch(`${API}/lobby/cancel?lobby_id=${lobbyId}&host_name=${encodeURIComponent(hostName)}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to cancel lobby');
  }
}