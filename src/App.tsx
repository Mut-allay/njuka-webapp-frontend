import { useState } from "react";
import "./App.css";

const API = "http://localhost:8000";

type CardType = { value: string; suit: string; };
type Player = { name: string; hand: CardType[]; is_cpu: boolean; };
type GameState = {
  players: Player[];
  pot: CardType[];
  deck: CardType[];
  current_player: number;
  has_drawn: boolean;
  mode: string;
  id: string;
  winner?: string;
  game_over?: boolean;
};

function Card({ value, suit }: CardType) {
  const isRed = suit === "♥" || suit === "♦";
  return (
    <span className={`card ${isRed ? "red" : "black"}`}>
      <span className="card-value">{value}</span>
      <span className="card-suit">{suit}</span>
    </span>
  );
}

function FaceDownCard() {
  return (
    <span className="card facedown">
      <span className="card-back" />
    </span>
  );
}

function DiscardPile({ pile }: { pile: CardType[] }) {
  if (!pile.length) return <span className="card discard-empty" />;
  const top = pile[pile.length - 1];
  const isRed = top.suit === "♥" || top.suit === "♦";
  return (
    <span className={`card discard-top ${isRed ? "red" : "black"}`}>
      <span className="card-inner">
        <span className="card-value">{top.value}</span>
        <span className="card-suit">{top.suit}</span>
      </span>
    </span>
  );
}

export default function App() {
  const [menu, setMenu] = useState<"start" | "cpu" | "multi" | "game" | "online" | "join">("start");
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [gameCode, setGameCode] = useState("");
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem("njuka_player_id") || "");
  const [name, setName] = useState("");
  const [showGameCode, setShowGameCode] = useState<string | null>(null);

  async function startCpuGame(cpuCount = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/new_game?mode=cpu&player_count=1&cpu_count=${cpuCount}`, { method: "POST" });
      const data = await res.json();
      setState(data);
      setMenu("game");
      setShowGameCode(null);
    } catch (e) {
      setError("Failed to start CPU game.");
    }
    setLoading(false);
  }

  async function startMultiGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/new_game?mode=multi&player_count=${playerCount}&cpu_count=0`, { method: "POST" });
      const data = await res.json();
      setState(data);
      setMenu("game");
      setShowGameCode(null);
    } catch (e) {
      setError("Failed to start multiplayer game.");
    }
    setLoading(false);
  }

  async function createOnlineGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/create_game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setGameCode(data.game_code);
      setPlayerId(data.player_id);
      localStorage.setItem("njuka_player_id", data.player_id);

      // Fetch game state after creating
      const stateRes = await fetch(`${API}/game/${data.game_code}`);
      const stateData = await stateRes.json();
      setState(stateData);

      setMenu("game");
      setShowGameCode(data.game_code); // <-- Show code after creation
    } catch (e) {
      setError("Failed to create online game.");
    }
    setLoading(false);
  }

  async function joinOnlineGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/join_game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_code: gameCode }),
      });
      const data = await res.json();
      setPlayerId(data.player_id);
      localStorage.setItem("njuka_player_id", data.player_id);

      // Fetch game state after joining
      const stateRes = await fetch(`${API}/game/${gameCode}`);
      const stateData = await stateRes.json();
      setState(stateData);

      setMenu("game");
      setShowGameCode(gameCode); // <-- Show code after joining
    } catch (e) {
      setError("Failed to join online game.");
    }
    setLoading(false);
  }

  async function draw() {
    if (!state) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/game/${state.id}/draw`, { method: "POST" });
      const data = await res.json();
      setState(data.state ? data.state : data);
    } catch (e) {
      setError("Draw error.");
    }
    setLoading(false);
  }

  async function discard(cardIndex: number) {
    if (!state) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/game/${state.id}/discard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_index: cardIndex }),
      });
      const data = await res.json();
      setState(data.state ? data.state : data);
    } catch (e) {
      setError("Discard error.");
    }
    setLoading(false);
  }

  function newGameMenu() {
    setState(null);
    setError(null);
    setMenu("start");
    setShowGameCode(null);
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">{error}</div>
        <button onClick={newGameMenu}>Back</button>
      </div>
    );
  }

  if (menu === "start") {
    return (
      <div className="App">
        <h1>Njuka</h1>
        <button onClick={() => setMenu("cpu")}>Vs CPU</button>
        <button onClick={() => setMenu("multi")}>Multiplayer (Local)</button>
        <button onClick={() => setMenu("online")}>Online (Invite/Join)</button>
      </div>
    );
  }

  if (menu === "cpu") {
    return (
      <div className="App">
        <h1>Vs CPU</h1>
        <button onClick={() => startCpuGame(1)}>Start Game</button>
        <button onClick={newGameMenu}>Back</button>
      </div>
    );
  }

  if (menu === "multi") {
    return (
      <div className="App">
        <h1>Multiplayer (Local)</h1>
        <label>
          Number of Players:
          <select value={playerCount} onChange={e => setPlayerCount(Number(e.target.value))}>
            {[2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button onClick={startMultiGame} disabled={loading}>Start Multiplayer Game</button>
        <button onClick={newGameMenu}>Back</button>
      </div>
    );
  }

  if (menu === "online") {
    return (
      <div className="App">
        <h1>Online Play</h1>
        <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={createOnlineGame} disabled={loading || !name}>Create Game</button>
        <div style={{ margin: "16px 0" }}>or</div>
        <input placeholder="Game Code" value={gameCode} onChange={e => setGameCode(e.target.value.toUpperCase())} />
        <button onClick={joinOnlineGame} disabled={loading || !gameCode}>Join Game</button>
        <button onClick={newGameMenu}>Back</button>
      </div>
    );
  }

  if (menu === "game" && state) {
    const currentPlayer = state.players[state.current_player];
    const isYourTurn = !state.game_over; // For local/CPU, always true for now

    return (
      <div className="App">
        <h1>Njuka Game</h1>
        {showGameCode && (
          <div style={{
            background: "#222",
            color: "#FFD700",
            border: "2px solid #FFD700",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            fontSize: "1.3em",
            fontWeight: "bold",
            letterSpacing: "2px"
          }}>
            Share this code to invite: <span style={{ fontSize: "1.5em" }}>{showGameCode}</span>
          </div>
        )}
        <div className="game-info" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginBottom: 12 }}>
            <div className="deck-area">
              <div style={{ textAlign: "center", marginBottom: 4 }}>Deck</div>
              <div style={{ position: "relative", width: 70, height: 100 }}>
                {state.deck.length > 0 ? (
                  <div
                    onClick={isYourTurn && !state.has_drawn && state.players[0].hand.length < 4 && !loading ? draw : undefined}
                    style={{ cursor: isYourTurn && !state.has_drawn && state.players[0].hand.length < 4 && !loading ? "pointer" : "not-allowed" }}
                  >
                    <FaceDownCard />
                    <div className="deck-count">{state.deck.length}</div>
                  </div>
                ) : (
                  <span className="card facedown" />
                )}
              </div>
            </div>
            <div className="discard-area">
              <div style={{ textAlign: "center", marginBottom: 4 }}>Discard</div>
              <div style={{ position: "relative", width: 70, height: 100 }}>
                <DiscardPile pile={state.pot} />
                <div className="discard-count">{state.pot.length}</div>
              </div>
            </div>
          </div>
          <div>
            <strong>Current Turn:</strong> {currentPlayer.name}
          </div>
        </div>

        <div className="your-hand your-turn" style={{ border: "2px solid #FFD700", padding: 16, borderRadius: 8 }}>
          <h2>Your Hand</h2>
          <div className="hand">
            {state.players[0].hand.map((card, i) => (
              <div key={i} style={{ position: "relative", display: "inline-block" }}>
                <Card value={card.value} suit={card.suit} />
                {isYourTurn && state.has_drawn && !state.game_over && (
                  <button
                    className="discard-btn"
                    onClick={() => discard(i)}
                    style={{
                      position: "absolute",
                      bottom: -30,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "0.8em",
                      padding: "2px 8px",
                    }}
                    disabled={loading}
                  >
                    Discard
                  </button>
                )}
              </div>
            ))}
          </div>
          {isYourTurn && !state.has_drawn && state.players[0].hand.length < 4 && !state.game_over && (
            <button className="draw-btn" onClick={draw} style={{ marginTop: 16 }} disabled={loading}>
              Draw Card
            </button>
          )}
        </div>

        <div className="opponents" style={{ marginTop: 32 }}>
          {state.players.slice(1).map((cpu, idx) => (
            <div className="opponent" key={idx}>
              <div>{cpu.name}</div>
              <div className="hand">
                {cpu.hand.map((_, i) => (
                  <FaceDownCard key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {state.game_over && (
          <div className="winner" style={{ marginTop: 32, fontSize: "1.5em", color: "#FFD700" }}>
            Winner: {state.winner}
          </div>
        )}

        <button onClick={newGameMenu} style={{ marginTop: 32 }} disabled={loading}>
          New Game
        </button>
        {loading && <div className="loading-spinner">Loading...</div>}
      </div>
    );
  }

  return <div className="App">Loading...</div>;
}

