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
  game_over?: boolean;
};

const apiService = {
  createNewGame: async (
    mode: "cpu" | "multiplayer",
    playerName: string,
    cpuCount: number = 1
  ): Promise<GameState> => {
    const response = await fetch(
      `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create game");
    }
    return response.json();
  },

  joinGame: async (gameId: string, playerName: string): Promise<GameState> => {
    const response = await fetch(
      `${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to join game");
    }
    return response.json();
  },

  drawCard: async (gameId: string): Promise<GameState> => {
    const response = await fetch(`${API}/game/${gameId}/draw`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) throw new Error("Failed to draw card");
    return response.json();
  },

  discardCard: async (gameId: string, cardIndex: number): Promise<GameState> => {
    const response = await fetch(
      `${API}/game/${gameId}/discard?card_index=${cardIndex}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) throw new Error("Failed to discard card");
    return response.json();
  },
};

function Card({
  value,
  suit,
  onClick,
  disabled,
}: {
  value: string;
  suit: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black";
  return (
    <div
      className={`card ${suitColor}`}
      onClick={!disabled ? onClick : undefined}
      style={disabled ? { opacity: 0.7, cursor: "not-allowed" } : {}}
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
  const [gameMode, setGameMode] = useState<"cpu" | "multiplayer">("cpu");
  const [cpuCount, setCpuCount] = useState(1);
  const [joinGameId, setJoinGameId] = useState("");
  const [playerName, setPlayerName] = useState("Player");

  useEffect(() => {
    if (!gameId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`);
        const latestState = await res.json();
        setState(latestState);
      } catch (err) {
        console.error(err);
      }
    }, 2000); // Every 2 seconds

    return () => clearInterval(interval);
  }, [gameId]);

  const newGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const gameState = await apiService.createNewGame(gameMode, playerName, cpuCount);
      setGameId(gameState.id);
      setState(gameState);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!joinGameId) return;
    setLoading(true);
    setError(null);
    try {
      const gameState = await apiService.joinGame(joinGameId, playerName);
      setGameId(joinGameId);
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

  const handleApiError = (err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes("Failed to fetch")) {
        return `Connection failed. Is backend running at ${API}?`;
      }
      return err.message;
    }
    return "An unknown error occurred";
  };

  const currentPlayer = state?.players[state?.current_player || 0];
  const yourPlayer = state?.players.find((p) => p.name === playerName);

  // Winner modal
  const winner = state?.winner;
  const winnerHand = (state as any)?.winner_hand as CardType[] | undefined;

  return (
    <div className="App">
      <h1>Njuka Card Game</h1>

      {!state ? (
        <>
          <div className="form-group">
            <label>Your Name:</label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label>Game Mode:</label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value as any)}
            >
              <option value="cpu">VS CPU</option>
              <option value="multiplayer">Multiplayer</option>
            </select>
          </div>

          {gameMode === "cpu" && (
            <div className="form-group">
              <label>CPU Players:</label>
              <select
                value={cpuCount}
                onChange={(e) => setCpuCount(Number(e.target.value))}
              >
                <option value={1}>1 CPU</option>
                <option value={2}>2 CPUs</option>
                <option value={3}>3 CPUs</option>
              </select>
            </div>
          )}

          <button 
            onClick={newGame} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Starting..." : "Start New Game"}
          </button>

          <div className="divider">OR</div>

          <div className="form-group">
            <label>Join Existing Game:</label>
            <input
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              placeholder="Enter Game ID"
            />
          </div>
          <button 
            onClick={joinGame} 
            disabled={loading || !joinGameId}
            className="btn-secondary"
          >
            {loading ? "Joining..." : "Join Game"}
          </button>
        </>
      ) : (
        <>
          <div className="game-info">
            <p>Game ID: {state.id}</p>
            <p>Deck: {state.deck.length} cards remaining</p>
            <p className="turn-indicator">
              Current Turn: <strong>{currentPlayer?.name}</strong>
              {currentPlayer?.is_cpu && " (CPU)"}
            </p>
          </div>

          {state.pot.length > 0 && (
            <div className="pot">
              <h3>Discard Pile</h3>
              <Card {...state.pot[state.pot.length - 1]} />
            </div>
          )}

          <div className="player-area">
            <h2>Your Hand ({yourPlayer?.name})</h2>
            <div className="hand">
              {yourPlayer?.hand.map((card, i) => (
                <Card
                  key={i}
                  {...card}
                  onClick={() => discard(i)}
                  disabled={!state.has_drawn || currentPlayer?.is_cpu || currentPlayer?.name !== yourPlayer?.name}
                />
              ))}
            </div>
            {!state.has_drawn && currentPlayer?.name === yourPlayer?.name && (
              <button 
                onClick={draw} 
                disabled={loading}
                className="btn-action"
              >
                {loading ? "Drawing..." : "Draw Card"}
              </button>
            )}
          </div>

          {state.mode === "multiplayer" && state.players.length < state.max_players && (
            <div className="lobby">
              <h2>Lobby</h2>
              <p>Waiting for players to join...</p>
              <ul>
                {state.players.map((p) => (
                  <li key={p.name}>{p.name}</li>
                ))}
              </ul>
              <p>
                {state.players.length} / {state.max_players} joined
              </p>
            </div>
          )}

          <button 
            onClick={() => {
              setGameId(null);
              setState(null);
              setJoinGameId("");
            }}
            className="btn-reset"
          >
            Leave Game
          </button>
        </>
      )}

      {/* Winner Modal */}
      {state?.game_over && winner && (
        <div className="winner-modal">
          <div className="winner-content">
            <h2>🎉 Winner: {winner} 🎉</h2>
            <p>Winning Hand:</p>
            <div className="hand">
              {winnerHand && winnerHand.map((card, i) => (
                <Card key={i} {...card} />
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <button
                className="btn-primary"
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const gameState = await apiService.createNewGame(gameMode, playerName, cpuCount);
                    setGameId(gameState.id);
                    setState(gameState);
                  } catch (err) {
                    setError(handleApiError(err));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Start New Game
              </button>
              <button
                className="btn-reset"
                style={{ marginLeft: 12 }}
                onClick={() => {
                  setGameId(null);
                  setState(null);
                  setJoinGameId("");
                }}
              >
                Quit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-modal">
          <div className="error-content">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}