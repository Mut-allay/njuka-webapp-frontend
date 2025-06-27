import { useEffect, useState } from "react";
import "./App.css";

// Configure API endpoint - update with your Render backend URL
const API = "https://your-render-backend.onrender.com";

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
};

// API Service Functions
const apiService = {
  createNewGame: async (
    mode: "cpu" | "multiplayer",
    playerName: string,
    cpuCount: number = 1
  ): Promise<GameState> => {
    const response = await fetch(`${API}/new_game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        player_name: playerName,
        cpu_count: mode === "cpu" ? cpuCount : 0,
        max_players: mode === "cpu" ? cpuCount + 1 : 4,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create game");
    }
    return response.json();
  },

  joinGame: async (
    gameId: string,
    playerName: string
  ): Promise<GameState> => {
    const response = await fetch(`${API}/join_game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        player_name: playerName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to join game");
    }
    return response.json();
  },

  drawCard: async (gameId: string): Promise<GameState> => {
    const response = await fetch(`${API}/game/${gameId}/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Failed to draw card");
    return response.json();
  },

  discardCard: async (
    gameId: string,
    cardIndex: number
  ): Promise<GameState> => {
    const response = await fetch(`${API}/game/${gameId}/discard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_index: cardIndex }),
    });

    if (!response.ok) throw new Error("Failed to discard card");
    return response.json();
  },

  fetchGameState: async (gameId: string): Promise<GameState> => {
    const response = await fetch(`${API}/game/${gameId}`);
    if (!response.ok) throw new Error("Failed to fetch game state");
    return response.json();
  },
};

function Card({ value, suit, onClick, disabled }: {
  value: string;
  suit: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const suitColor = suit === '♥' || suit === '♦' ? 'red' : 'black';
  return (
    <div 
      className={`card ${suitColor}`}
      onClick={!disabled ? onClick : undefined}
      style={disabled ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
    >
      <span className="card-value">{value}</span>
      <span className="card-suit">{suit}</span>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");
  const [gameMode, setGameMode] = useState<"cpu" | "multiplayer">("cpu");
  const [cpuCount, setCpuCount] = useState(1);
  const [showJoin, setShowJoin] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Game actions
  const newGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const gameState = await apiService.createNewGame(gameMode, playerName, cpuCount);
      setGameId(gameState.id);
      setState(gameState);
      if (gameMode === "multiplayer") {
        setInviteLink(`${window.location.origin}?game=${gameState.id}`);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!joinGameId || !playerName) return;
    setLoading(true);
    setError(null);
    try {
      const gameState = await apiService.joinGame(joinGameId, playerName);
      setGameId(gameState.id);
      setState(gameState);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const draw = async () => {
    if (!gameId || loading) return;
    setLoading(true);
    try {
      const gameState = await apiService.drawCard(gameId);
      setState(gameState);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const discard = async (cardIndex: number) => {
    if (!gameId || loading) return;
    setLoading(true);
    try {
      const gameState = await apiService.discardCard(gameId, cardIndex);
      setState(gameState);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchState = async (gid = gameId) => {
    if (!gid) return;
    setLoading(true);
    try {
      const gameState = await apiService.fetchGameState(gid);
      setState(gameState);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes("Failed to fetch")) {
        return `Connection failed. Please check:
          1. Backend is running at ${API}
          2. No CORS errors in console
          3. Try refreshing after backend starts`;
      }
      return err.message;
    }
    return "An unknown error occurred";
  };

  // Effects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get("game");
    if (urlGameId && !gameId) {
      setShowJoin(true);
      setJoinGameId(urlGameId);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId) fetchState();
    if (gameMode === "multiplayer" && gameId) {
      const interval = setInterval(fetchState, 2000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameMode]);

  // Render
  if (error) {
    return (
      <div className="App">
        <div className="error">{error}</div>
        <button onClick={() => setError(null)}>Back</button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="App">
        <div className="game-setup">
          <h1>Card Game</h1>
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <select
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as any)}
          >
            <option value="cpu">VS CPU</option>
            <option value="multiplayer">Multiplayer</option>
          </select>

          {gameMode === "cpu" && (
            <select
              value={cpuCount}
              onChange={(e) => setCpuCount(Number(e.target.value))}
            >
              <option value={1}>1 CPU</option>
              <option value={2}>2 CPUs</option>
              <option value={3}>3 CPUs</option>
            </select>
          )}

          <button onClick={newGame} disabled={loading || !playerName}>
            {loading ? "Creating..." : "Start Game"}
          </button>
          <button onClick={() => setShowJoin((v) => !v)}>
            {showJoin ? "Cancel" : "Join Game"}
          </button>

          {showJoin && (
            <div className="join-game">
              <input
                type="text"
                placeholder="Game ID"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
              />
              <button onClick={joinGame} disabled={loading || !playerName || !joinGameId}>
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
          )}

          {inviteLink && (
            <div className="invite-link">
              <p>Invite others:</p>
              <input type="text" value={inviteLink} readOnly />
              <button onClick={() => navigator.clipboard.writeText(inviteLink)}>
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Game board rendering
  const currentPlayer = state.players[state.current_player];
  const yourPlayerIndex = state.players.findIndex(p => p.name === playerName);
  const isYourTurn = yourPlayerIndex === state.current_player && !loading;
  const yourPlayer = state.players[yourPlayerIndex];

  return (
    <div className="app">
      <div className="game-container">
        <div className="game-info">
          <div>Deck: {state.deck.length} cards</div>
          <div>Current Turn: {currentPlayer.name}</div>
          {state.pot.length > 0 && (
            <div className="pot">
              Pot: <Card {...state.pot[state.pot.length - 1]} />
            </div>
          )}
        </div>

        <div className="player-area">
          <div className={`your-hand ${isYourTurn ? "your-turn" : ""}`}>
            <h2>Your Hand ({yourPlayer?.name})</h2>
            <div className="hand">
              {yourPlayer?.hand.map((card, i) => (
                <Card
                  key={i}
                  {...card}
                  onClick={() => isYourTurn && state.has_drawn && discard(i)}
                  disabled={!isYourTurn || !state.has_drawn}
                />
              ))}
            </div>
            {isYourTurn && !state.has_drawn && (
              <button onClick={draw} disabled={loading}>
                Draw Card
              </button>
            )}
          </div>

          <div className="opponents">
            {state.players.filter(p => p.name !== playerName).map((player, i) => (
              <div key={i} className={`opponent ${player.is_cpu ? "cpu" : ""}`}>
                <h3>{player.name}</h3>
                <div className="hand">
                  {Array(player.hand.length).fill(0).map((_, j) => (
                    <div key={j} className="card-back">🂠</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="game-controls">
          <button onClick={() => {
            setState(null);
            setGameId(null);
          }} disabled={loading}>
            New Game
          </button>
          {inviteLink && (
            <button onClick={() => navigator.clipboard.writeText(inviteLink)}>
              Copy Invite Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}