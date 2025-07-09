import { useState, useEffect } from "react";
import "./App.css";

const API = "https://njuka-webapp-backend.onrender.com";

type CardType = {
  value: string;
  suit: string;
};

type Player = {
  name: string;
  hand: CardType[];
  is_cpu: boolean;
};

type GameState = {
  players: Player[];
  pot: CardType[];
  deck: CardType[];
  current_player: number;
  has_drawn: boolean;
  mode: string;
  id: string;
  max_players: number;
  winner?: string;
  winner_hand?: CardType[];
  game_over?: boolean;
};

const apiService = {
  createNewGame: async (
    mode: "cpu" | "multiplayer",
    playerName: string,
    cpuCount: number = 1
  ): Promise<GameState> => {
    try {
      const response = await fetch(
        `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create game");
      }
      return response.json();
    } catch (err) {
      console.error("API Error:", err);
      throw new Error("Network error. Please check your connection.");
    }
  },

  joinGame: async (gameId: string, playerName: string): Promise<GameState> => {
    try {
      const response = await fetch(
        `${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to join game");
      }
      return response.json();
    } catch (err) {
      console.error("API Error:", err);
      throw new Error("Network error. Please check your connection.");
    }
  },

  drawCard: async (gameId: string): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/game/${gameId}/draw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to draw card");
      }
      return response.json();
    } catch (err) {
      throw new Error("Failed to connect to server. Please try again.");
    }
  },

  discardCard: async (gameId: string, cardIndex: number): Promise<GameState> => {
    try {
      const response = await fetch(
        `${API}/game/${gameId}/discard?card_index=${cardIndex}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to discard card");
      }
      return response.json();
    } catch (err) {
      throw new Error("Failed to connect to server. Please try again.");
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/health`);
      return response.ok;
    } catch (err) {
      return false;
    }
  }
};

function Card({
  value,
  suit,
  onClick,
  disabled,
  facedown = false,
  className = "",
  highlight = false,
  small = false
}: {
  value: string;
  suit: string;
  onClick?: () => void;
  disabled?: boolean;
  facedown?: boolean;
  className?: string;
  highlight?: boolean;
  small?: boolean;
}) {
  if (facedown) {
    return (
      <div className={`card facedown ${className} ${small ? 'small-card' : ''}`}>
        <div className="card-back"></div>
      </div>
    );
  }

  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black";
  return (
    <div
      className={`card ${suitColor} ${className} ${highlight ? 'highlight-card' : ''} ${small ? 'small-card' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={disabled ? { opacity: 0.7, cursor: "not-allowed" } : {}}
    >
      <div className="card-inner">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suit}</span>
      </div>
    </div>
  );
}

function Table({ state, playerName, onDiscard, onDraw, loading }: {
  state: GameState;
  playerName: string;
  onDiscard: (index: number) => void;
  onDraw: () => void;
  loading: boolean;
}) {
  if (!state || !state.players || state.players.length === 0) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading game data...</p>
      </div>
    );
  }

  const yourPlayer = state.players.find((p) => p?.name === playerName);
  const currentPlayerIndex = state.current_player ?? 0;
  const currentPlayer = state.players[currentPlayerIndex];
  const isGameOver = state.game_over;

  if (!yourPlayer || !currentPlayer) {
    return <div className="error">Player data not available</div>;
  }

  const getPlayerSafe = (index: number) => {
    return state.players[index] ?? { name: 'Player', hand: [], is_cpu: false };
  };

  const isWinner = (player: Player) => isGameOver && state.winner === player.name;

  return (
    <div className="poker-table">
      {state.players.length > 2 && (
        <div className={`player-seat top ${currentPlayerIndex === 1 ? 'active' : ''}`}>
          <h3>{getPlayerSafe(1).name}{getPlayerSafe(1).is_cpu && " (CPU)"}</h3>
          <div className="hand horizontal">
            {getPlayerSafe(1).hand.map((card, i) => (
              <Card
                key={`top-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(getPlayerSafe(1))}
              />
            ))}
          </div>
        </div>
      )}

      <div className={`player-seat left ${currentPlayerIndex === (state.players.length > 2 ? 2 : 1) ? 'active' : ''}`}>
        <h3>{getPlayerSafe(state.players.length > 2 ? 2 : 1).name}
          {getPlayerSafe(state.players.length > 2 ? 2 : 1).is_cpu && " (CPU)"}
        </h3>
        <div className="hand horizontal">
          {getPlayerSafe(state.players.length > 2 ? 2 : 1).hand.map((card, i) => (
            <Card
              key={`left-${i}`}
              facedown={!isGameOver}
              value={card.value}
              suit={card.suit}
              small={true}
              highlight={isWinner(getPlayerSafe(state.players.length > 2 ? 2 : 1))}
            />
          ))}
        </div>
      </div>

      <div className="table-center">
        <div className="deck-area">
          <div className="deck-count">{state.deck?.length ?? 0}</div>
          <Card facedown value="" suit="" />
        </div>
        
        <div className="discard-area">
          {state.pot?.length > 0 ? (
            <Card {...state.pot[state.pot.length - 1]} className="discard-top" />
          ) : (
            <div className="discard-empty">Empty</div>
          )}
        </div>
      </div>

      {state.players.length > 3 && (
        <div className={`player-seat right ${currentPlayerIndex === 3 ? 'active' : ''}`}>
          <h3>{getPlayerSafe(3).name}{getPlayerSafe(3).is_cpu && " (CPU)"}</h3>
          <div className="hand horizontal">
            {getPlayerSafe(3).hand.map((card, i) => (
              <Card
                key={`right-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(getPlayerSafe(3))}
              />
            ))}
          </div>
        </div>
      )}

      <div className={`player-seat bottom ${currentPlayerIndex === state.players.findIndex(p => p?.name === playerName) ? 'active' : ''}`}>
        <h2>Your Hand ({yourPlayer.name})</h2>
        <div className="hand">
          {yourPlayer.hand?.map((card, i) => (
            <Card
              key={`you-${i}`}
              {...card}
              onClick={() => onDiscard(i)}
              disabled={!state.has_drawn || currentPlayer.is_cpu || currentPlayer.name !== yourPlayer.name}
              highlight={isWinner(yourPlayer)}
            />
          ))}
        </div>
        {!state.has_drawn && currentPlayer.name === yourPlayer.name && !isGameOver && (
          <button 
            onClick={onDraw} 
            disabled={loading}
            className="draw-btn"
          >
            {loading ? "Drawing..." : "Draw Card"}
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<"cpu" | "multiplayer">("cpu");
  const [cpuCount, setCpuCount] = useState(1);
  const [playerName, setPlayerName] = useState("Player");
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [joinGameId, setJoinGameId] = useState("");

  useEffect(() => {
    const checkConnection = async () => {
      setLoading(true);
      try {
        const isHealthy = await apiService.checkHealth();
        setBackendAvailable(isHealthy);
        if (!isHealthy) {
          setError("Backend service unavailable. Please try again later.");
        }
      } catch (err) {
        setBackendAvailable(false);
        setError("Cannot connect to game server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (!gameId || !backendAvailable) return;

    const fetchGameState = async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const latestState = await res.json();
        setState(latestState);
      } catch (err) {
        console.error('Failed to fetch game state:', err);
        setError('Failed to load game. Please try again.');
      }
    };

    const interval = setInterval(fetchGameState, 2000);
    fetchGameState();
    
    return () => clearInterval(interval);
  }, [gameId, backendAvailable]);

  const discard = async (cardIdx: number) => {
    setLoading(true);
    setError(null);
    try {
      if (!state) return;
      const newState = await apiService.discardCard(state.id, cardIdx);
      setState(newState);
    } catch (err: any) {
      setError(err.message || "Failed to discard card");
    } finally {
      setLoading(false);
    }
  };

  const draw = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!state) return;
      const newState = await apiService.drawCard(state.id);
      setState(newState);
    } catch (err: any) {
      setError(err.message || "Failed to draw card");
    } finally {
      setLoading(false);
    }
  };

  if (!backendAvailable) {
    return (
      <div className="App">
        <h1>Njuka Card Game</h1>
        <div className="error-notice">
          <h3>Service Unavailable</h3>
          <p>We're having trouble connecting to the game server.</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-btn"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Njuka Card Game</h1>

      {error && (
        <div className="error-modal">
          <div className="error-content">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>OK</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Connecting to game server...</p>
        </div>
      )}

      {state ? (
        <div className="game-container">
          <div className="game-info">
            <p>Game ID: {state.id}</p>
            <p className="turn-indicator">
              Current Turn: <strong>{state.players[state.current_player]?.name}</strong>
              {state.players[state.current_player]?.is_cpu && " (CPU)"}
            </p>
            <button 
              onClick={() => { 
                setState(null); 
                setGameId(null); 
              }}
              className="quit-btn"
            >
              Quit to Menu
            </button>
          </div>
          <Table 
            state={state}
            playerName={playerName}
            onDiscard={discard}
            onDraw={draw}
            loading={loading}
          />
          {state.game_over && (
            <div className="game-over">
              <div>
                <h2>Game Over!</h2>
                <p>Winner: <strong>{state.winner}</strong></p>
                {state.winner_hand && (
                  <div className="winning-hand">
                    <p>Winning Hand:</p>
                    <div className="hand">
                      {state.winner_hand.map((card, i) => (
                        <Card
                          key={`winner-${i}`}
                          value={card.value}
                          suit={card.suit}
                          highlight={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { setState(null); setGameId(null); }}>
                  New Game
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="new-game-form">
          <h2>Start or Join a Game</h2>
          <label>
            Your Name:
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </label>
          
          <div className="join-section">
            <h3>Join Existing Game</h3>
            <label>
              Game ID:
              <input
                type="text"
                value={joinGameId}
                onChange={e => setJoinGameId(e.target.value)}
                placeholder="Enter game ID"
              />
            </label>
            <button
              disabled={loading || !joinGameId}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const game = await apiService.joinGame(joinGameId, playerName);
                  setGameId(game.id);
                  setState(game);
                } catch (err: any) {
                  setError(err.message || "Failed to join game");
                } finally {
                  setLoading(false);
                }
              }}
              className="join-btn"
            >
              Join Game
            </button>
          </div>

          <div className="divider">OR</div>

          <h3>Start New Game</h3>
          <label>
            Game Mode:
            <select
              value={gameMode}
              onChange={e => setGameMode(e.target.value as "cpu" | "multiplayer")}
            >
              <option value="cpu">Play vs CPU</option>
              <option value="multiplayer">Multiplayer</option>
            </select>
          </label>
          {gameMode === "cpu" && (
            <label>
              Number of CPU Players:
              <input
                type="number"
                min={1}
                max={3}
                value={cpuCount}
                onChange={e => setCpuCount(Number(e.target.value))}
              />
            </label>
          )}
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const game = await apiService.createNewGame(gameMode, playerName, cpuCount);
                setGameId(game.id);
                setState(game);
              } catch (err: any) {
                setError(err.message || "Failed to create game");
              } finally {
                setLoading(false);
              }
            }}
            className="new-game-btn"
          >
            Start New Game
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
