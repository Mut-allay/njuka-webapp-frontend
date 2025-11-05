import { ArrowLeft } from 'lucide-react';
import type { LobbyGame, LoadingStates } from '../types/game';

interface MultiplayerPageProps {
  onBack: () => void;
  playerName: string;
  numPlayers: number;
  setNumPlayers: (num: number) => void;
  onCreateLobby: () => void;
  onJoinLobby: (lobbyId: string) => void;
  lobbies: LobbyGame[];
  loadingStates: LoadingStates;
  onRefreshLobbies: () => void;
}

export const MultiplayerPage = ({ 
  onBack, 
  playerName, 
  numPlayers, 
  setNumPlayers,
  onCreateLobby,
  onJoinLobby,
  lobbies,
  loadingStates,
  onRefreshLobbies
}: MultiplayerPageProps) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>Multiplayer Lobby</h2>
      </div>

      <div className="multiplayer-content">
        <div className="create-lobby-section">
          <h3>Create New Game</h3>
          <label>
            Max Players:
            <select 
              value={numPlayers} 
              onChange={(e) => setNumPlayers(Number(e.target.value))}
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={5}>5 Players</option>
              <option value={6}>6 Players</option>
            </select>
          </label>
          <button
            onClick={onCreateLobby}
            disabled={loadingStates.starting || !playerName.trim()}
            className="create-lobby-btn"
          >
            {loadingStates.starting ? "Creating..." : "Create New Game"}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="join-lobby-section">
          <div className="lobby-header">
            <h3>Available Lobbies</h3>
            <button onClick={onRefreshLobbies} className="refresh-btn">
              Refresh
            </button>
          </div>
          
          <div className="lobby-list">
            {!lobbies || lobbies.length === 0 ? (
              <div className="no-lobbies">
                <p>No games available right now.</p>
                <p>Create a new game to start playing!</p>
              </div>
            ) : (
              lobbies.map((lobby) => (
                <div key={lobby.id} className="lobby-item">
                  <div className="lobby-info">
                    <h4>Host: {lobby.host}</h4>
                    <p>Players: {lobby.players?.length || 0}/{lobby.max_players}</p>
                    <div className="player-list-preview">
                      {(lobby.players || []).map((player) => (
                        <span key={player} className="player-tag">
                          {player}
                          {player === lobby.host && " 👑"}
                        </span>
                      ))}
                    </div>
                    <p className="lobby-created">
                      Created: {new Date(lobby.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onJoinLobby(lobby.id)}
                    disabled={(lobby.players?.length || 0) >= lobby.max_players || loadingStates.joining}
                    className="join-lobby-btn"
                  >
                    {loadingStates.joining ? "Joining..." : "Join Game"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};