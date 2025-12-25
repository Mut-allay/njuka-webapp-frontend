import type { GameState, LobbyGame } from '../types/game';

const API = import.meta.env.VITE_API_URL || "https://njuka-webapp-backend.onrender.com";
export const WS_API = API.replace('https://', 'wss://').replace('http://', 'ws://');  // WebSocket API

// Log backend configuration on module load
console.log('[GameService] Backend API:', API);
console.log('[GameService] WebSocket API:', WS_API);

export class GameService {
  private async handleResponse(response: Response, operation: string): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorMessage = `${operation} failed: ${response.status} ${response.statusText} - ${errorText}`;
      console.error(`[GameService] ${errorMessage}`);
      console.error(`[GameService] URL: ${response.url}`);
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  private async fetchWithErrorHandling(url: string, options: RequestInit, operation: string): Promise<any> {
    try {
      // ⬇️ ADDED: Prevent browser caching
      const noCacheHeaders = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };

      const finalOptions = {
        ...options,
        headers: {
          ...options.headers,
          ...noCacheHeaders,
        }
      };

      console.log(`[GameService] ${operation} - Requesting: ${url}`);
      const response = await fetch(url, finalOptions);
      return await this.handleResponse(response, operation);
    } catch (error: any) {
      console.error(`[GameService] ${operation} - Network error:`, error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach backend at ${API}. Is the server running?`);
      }
      throw error;
    }
  }

  async createLobby(host: string, maxPlayers: number, entryFee: number = 100): Promise<LobbyGame> {
    return this.fetchWithErrorHandling(
      `${API}/lobby/create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, max_players: maxPlayers, entry_fee: entryFee }),
      },
      'createLobby'
    );
  }

  async joinLobby(lobbyId: string, player: string): Promise<{ lobby: LobbyGame; game: GameState | null }> {
    return this.fetchWithErrorHandling(
      `${API}/lobby/${lobbyId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player }),
      },
      'joinLobby'
    );
  }

  async getWallet(playerName: string): Promise<number> {
    const data = await this.fetchWithErrorHandling(`${API}/wallet/${playerName}`, {}, "Get wallet");
    return data.wallet;
  }

  async getLobbies(): Promise<LobbyGame[]> {
    return this.fetchWithErrorHandling(`${API}/lobby/list`, {}, "Get lobbies");
  }

  async getGame(gameId: string): Promise<GameState> {
    return this.fetchWithErrorHandling(
      `${API}/game/${gameId}`,
      { method: 'GET' },
      'getGame'
    );
  }

  async drawCard(gameId: string): Promise<GameState> {
    return this.fetchWithErrorHandling(
      `${API}/game/${gameId}/draw`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      'drawCard'
    );
  }

  async discardCard(gameId: string, cardIndex: number): Promise<GameState> {
    return this.fetchWithErrorHandling(
      `${API}/game/${gameId}/discard?card_index=${cardIndex}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      'discardCard'
    );
  }

  async createNewGame(
    mode: string,
    playerName: string,
    cpuCount: number = 1,
    maxPlayers: number = 4,
    entryFee: number = 100
  ): Promise<GameState> {
    return this.fetchWithErrorHandling(
      `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}&max_players=${maxPlayers}&entry_fee=${entryFee}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      'createNewGame'
    );
  }

  async joinGame(gameId: string, playerName: string): Promise<GameState> {
    return this.fetchWithErrorHandling(
      `${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      'joinGame'
    );
  }

  async cancelLobby(lobbyId: string, hostName: string): Promise<void> {
    await this.fetchWithErrorHandling(
      `${API}/lobby/cancel?lobby_id=${lobbyId}&host_name=${encodeURIComponent(hostName)}`,
      { method: 'POST' },
      'cancelLobby'
    );
  }
}