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

const tutorialPromptsShown = new Map<string, number>();

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
  small = false,
  style = {},
  isDeck = false
}: {
  value: string;
  suit: string;
  onClick?: () => void;
  disabled?: boolean;
  facedown?: boolean;
  className?: string;
  highlight?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
  isDeck?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (facedown) {
    return (
      <div 
        className={`card facedown ${className} ${small ? 'small-card' : ''} ${isDeck && isHovered ? 'deck-hover' : ''}`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="card-back"></div>
      </div>
    );
  }

  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black";
  return (
    <div
      className={`card ${suitColor} ${className} ${highlight ? 'highlight-card' : ''} ${small ? 'small-card' : ''} ${isHovered ? 'card-hover' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={disabled ? { opacity: 0.7, cursor: "not-allowed", ...style } : style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-inner">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suit}</span>
      </div>
    </div>
  );
}

function Table({ state, playerName, onDiscard, onDraw, loadingStates }: {
  state: GameState;
  playerName: string;
  onDiscard: (index: number) => void;
  onDraw: () => void;
  loadingStates: {
    drawing: boolean;
    discarding: boolean;
    cpuMoving: boolean;
  };
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

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name;
    if (!playerId || playerId !== playerName) return false;
    
    const count = tutorialPromptsShown.get(playerId) || 0;
    if (count < 2) {
      tutorialPromptsShown.set(playerId, count + 1);
      return true;
    }
    return false;
  };

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
        <div 
          className="deck-area" 
          onClick={!loadingStates.drawing && currentPlayer.name === yourPlayer.name && !isGameOver && !state.has_drawn ? onDraw : undefined}
        >
          <div className="deck-count">{state.deck?.length ?? 0}</div>
          {shouldShowPrompt() && (
            <div className="tutorial-prompt">Pick a card from the deck</div>
          )}
          <Card 
            facedown 
            value="" 
            suit="" 
            className={loadingStates.drawing ? 'card-drawing' : ''}
            style={{
              cursor: !loadingStates.drawing && currentPlayer.name === yourPlayer.name && !isGameOver && !state.has_drawn ? 'pointer' : 'default'
            }}
            isDeck={true}
          />
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
              disabled={!state.has_drawn || currentPlayer.is_cpu || currentPlayer.name !== yourPlayer.name || loadingStates.discarding}
              className={loadingStates.discarding ? 'card-discarding' : ''}
              highlight={isWinner(yourPlayer)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    drawing: false,
    discarding: false,
    joining: false,
    starting: false,
    cpuMoving: false
  });
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<"cpu" | "multiplayer">("cpu");
  const [cpuCount, setCpuCount] = useState(1);
  const [playerName, setPlayerName] = useState("Player");
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [joinGameId, setJoinGameId] = useState("");

  useEffect(() => {
    const savedGame = localStorage.getItem('njukaGame');
    if (savedGame) {
      try {
        const { id, playerName: savedName } = JSON.parse(savedGame);
        if (id && savedName) {
          setGameId(id);
          setPlayerName(savedName);
        }
      } catch (e) {
        localStorage.removeItem('njukaGame');
      }
    }
  }, []);

  useEffect(() => {
    if (state?.id && playerName) {
      localStorage.setItem('njukaGame', JSON.stringify({
        id: state.id,
        playerName
      }));
    } else {
      localStorage.removeItem('njukaGame');
    }
  }, [state, playerName]);

  useEffect(() => {
    const checkConnection = async () => {
      setLoadingStates(prev => ({...prev, starting: true, joining: true}));
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
        setLoadingStates(prev => ({...prev, starting: false, joining: false}));
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (!gameId || !backendAvailable) return;

    let retries = 3;
    let intervalId: NodeJS.Timeout;

    const fetchGameState = async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const latestState = await res.json();
        setState(latestState);
        retries = 3;
      } catch (err) {
        console.error('Failed to fetch game state:', err);
        retries--;
        if (retries <= 0) {
          setError('Connection lost. Trying to reconnect...');
          setTimeout(() => {
            checkConnection();
            retries = 3;
          }, 5000);
        }
      }
    };

    const checkConnection = async () => {
      const isHealthy = await apiService.checkHealth();
      setBackendAvailable(isHealthy);
      if (isHealthy) {
        setError(null);
        intervalId = setInterval(fetchGameState, 2000);
        fetchGameState();
      }
    };

    intervalId = setInterval(fetchGameState, 2000);
    fetchGameState();
    
    return () => clearInterval(intervalId);
  }, [gameId, backendAvailable]);

  // Improved CPU move logic
  useEffect(() => {
    if (!state || state.game_over || !backendAvailable) return;
    
    const currentPlayer = state.players[state.current_player];
    if (currentPlayer?.is_cpu && currentPlayer.name !== playerName) {
      setLoadingStates(prev => ({...prev, cpuMoving: true}));
      
      const makeCpuMove = async () => {
        try {
          // First, draw a card
          const afterDrawState = await apiService.drawCard(state.id);
          
          // Then discard a random card if they have any
          if (afterDrawState.has_drawn && afterDrawState.players[state.current_player].hand.length > 0) {
            const randomIndex = Math.floor(
              Math.random() * afterDrawState.players[state.current_player].hand.length
            );
            await apiService.discardCard(state.id, randomIndex);
          }
          
          // Update state after CPU move is complete
          const updatedState = await apiService.checkHealth()
            .then(() => fetch(`${API}/game/${state.id}`))
            .then(res => res.json());
          setState(updatedState);
        } catch (err) {
          console.error("CPU move failed:", err);
          // If there's an error, try to get the latest state
          try {
            const latestState = await fetch(`${API}/game/${state.id}`).then(res => res.json());
            setState(latestState);
          } catch (fetchErr) {
            console.error("Failed to fetch game state after CPU move error:", fetchErr);
          }
        } finally {
          setLoadingStates(prev => ({...prev, cpuMoving: false}));
        }
      };

      const timer = setTimeout(makeCpuMove, 1500);
      return () => {
        clearTimeout(timer);
        setLoadingStates(prev => ({...prev, cpuMoving: false}));
      };
    }
  }, [state?.current_player, state?.id, playerName, backendAvailable]);

  const discard = async (cardIdx: number) => {
    setLoadingStates(prev => ({...prev, discarding: true}));
    setError(null);
    try {
      if (!state) return;
      const newState = await apiService.discardCard(state.id, cardIdx);
      setState(newState);
    } catch (err: any) {
      setError(err.message || "Failed to discard card");
    } finally {
      setLoadingStates(prev => ({...prev, discarding: false}));
    }
  };

  const draw = async () => {
    setLoadingStates(prev => ({...prev, drawing: true}));
    setError(null);
    try {
      if (!state) return;
      const newState = await apiService.drawCard(state.id);
      setState(newState);
    } catch (err: any) {
      setError(err.message || "Failed to draw card");
    } finally {
      setLoadingStates(prev => ({...prev, drawing: false}));
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

      {(loadingStates.starting || loadingStates.joining) && (
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
              {loadingStates.cpuMoving && " - Thinking..."}
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
            loadingStates={loadingStates}
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
              onChange={e => {
                const name = e.target.value.trim();
                if (name.length <= 20) {
                  setPlayerName(name);
                }
              }}
              placeholder="Enter your name (2-20 chars)"
              minLength={2}
              maxLength={20}
              required
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
              disabled={loadingStates.joining || !joinGameId || !playerName.trim()}
              onClick={async () => {
                setLoadingStates(prev => ({...prev, joining: true}));
                setError(null);
                try {
                  const game = await apiService.joinGame(joinGameId, playerName);
                  setGameId(game.id);
                  setState(game);
                } catch (err: any) {
                  setError(err.message || "Failed to join game");
                } finally {
                  setLoadingStates(prev => ({...prev, joining: false}));
                }
              }}
              className="join-btn"
            >
              {loadingStates.joining ? "Joining..." : "Join Game"}
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
            disabled={loadingStates.starting || !playerName.trim()}
            onClick={async () => {
              setLoadingStates(prev => ({...prev, starting: true}));
              setError(null);
              try {
                const game = await apiService.createNewGame(gameMode, playerName, cpuCount);
                setGameId(game.id);
                setState(game);
              } catch (err: any) {
                setError(err.message || "Failed to create game");
              } finally {
                setLoadingStates(prev => ({...prev, starting: false}));
              }
            }}
            className="new-game-btn"
          >
            {loadingStates.starting ? "Starting..." : "Start New Game"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
