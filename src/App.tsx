import { useState } from "react";
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
  winner?: string;
  game_over: boolean;
};

const apiService = {
  createNewGame: async (
    mode: "cpu" | "multiplayer",
    cpuCount: number = 1
  ): Promise<GameState> => {
    const response = await fetch(`${API}/new_game?mode=${mode}&player_count=1&cpu_count=${cpuCount}`, {
      method: "POST",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create game");
    }
    return response.json();
  },

  joinGame: async (gameId: string): Promise<GameState> => {
    const response = await fetch(`${API}/join_game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_code: gameId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to join game");
    }
    return response.json();
  },

  drawCard: async (gameId: string): Promise<any> => {
    const response = await fetch(`${API}/game/${gameId}/draw`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to draw card");
    return response.json();
  },

  discardCard: async (gameId: string, cardIndex: number): Promise<any> => {
    const response = await fetch(`${API}/game/${gameId}/discard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_index: cardIndex }),
    });
    if (!response.ok) throw new Error("Failed to discard card");
    return response.json();
  },
};

function Card({ value, suit, onClick, disabled }: {
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

  const newGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const gameState = await apiService.createNewGame(gameMode, cpuCount);
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
      const gameState = await apiService.joinGame(joinGameId);
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
      if (gameState?.state) {
        setState(gameState.state);
        alert(`${gameState.winner} has won!`);
      } else {
        setState(gameState);
      }
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
      if (gameState?.state) {
        setState(gameState.state);
        alert(`${gameState.winner} has won!`);
      } else {
        setState(gameState);
      }
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

  const currentPlayer = state?.players[state?.current_player];
  const yourPlayer = state?.players.find(p => !p.is_cpu);

  return (
    <div className="App">
      <h1>Njuka Card Game</h1>

      {!state ? (
        <>
          <select value={gameMode} onChange={(e) => setGameMode(e.target.value as any)}>
            <option value="cpu">VS CPU</option>
            <option value="multiplayer">Multiplayer</option>
          </select>

          {gameMode === "cpu" && (
            <select value={cpuCount} onChange={(e) => setCpuCount(Number(e.target.value))}>
              <option value={1}>1 CPU</option>
              <option value={2}>2 CPUs</option>
              <option value={3}>3 CPUs</option>
            </select>
          )}

          <button onClick={newGame} disabled={loading}>
            {loading ? "Starting..." : "Start Game"}
          </button>

          <h3>Or Join Existing Game</h3>
          <input
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value)}
            placeholder="Game Code"
          />
          <button onClick={joinGame} disabled={loading || !joinGameId}>
            {loading ? "Joining..." : "Join"}
          </button>
        </>
      ) : (
        <>
          <p>Game ID: {state.id}</p>
          <p>Deck: {state.deck.length} cards</p>
          <p>Current Turn: {currentPlayer?.name}</p>
          {state.pot.length > 0 && (
            <div className="pot">
              Pot: <Card {...state.pot[state.pot.length - 1]} />
            </div>
          )}

          <h2>Your Hand</h2>
          <div className="hand">
            {yourPlayer?.hand.map((card, i) => (
              <Card
                key={i}
                {...card}
                onClick={() => discard(i)}
                disabled={!state.has_drawn}
              />
            ))}
          </div>
          {!state.has_drawn && !state.game_over && (
            <button onClick={draw}>Draw</button>
          )}

          <br />
          <button onClick={() => {
            setGameId(null);
            setState(null);
            setJoinGameId("");
          }}>Reset</button>
        </>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>OK</button>
        </div>
      )}
    </div>
  );
}
