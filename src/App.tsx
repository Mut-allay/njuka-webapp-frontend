import { useState, useEffect, useCallback, useMemo } from 'react';
import { Howl } from 'howler';
import './App.css';

// Import Lucide React icons
import { Settings, Info, Home, Users, Bot, BookOpen, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

// Import existing game components
import LazyGameTable from './components/LazyGameTable';
import LazyGameOverModal from './components/LazyGameOverModal';
import LazyTutorialModal from './components/LazyTutorialModal';
import ErrorModal from './components/ErrorModal';
import LoadingOverlay from './components/LoadingOverlay';
import { ConnectionStatus } from './components/ConnectionStatus';
import { WebSocketProvider } from './contexts/WebSocketContext';

const API = "https://njuka-webapp-backend.onrender.com";

// Sound Manager Hook
const useSoundManager = () => {
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  const createFallbackSound = useCallback(async (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        let context = audioContext;
        if (!context) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          context = new AudioContextClass();
          setAudioContext(context);
        }
        
        // Ensure audio context is resumed before creating sounds
        if (context.state === 'suspended') {
          await context.resume();
        }
        
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.05, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);
      } catch (error) {
        console.log('Fallback sound generation failed:', error);
      }
    }
  }, [audioContext]);
  
  const sounds = useMemo(() => ({
    draw: new Howl({
      src: ['/sounds/draw.mp3', '/sounds/draw.wav'],
      volume: 0.3,
      html5: true,
      onloaderror: () => console.log('Draw sound failed to load')
    }),
    discard: new Howl({
      src: ['/sounds/discard.mp3', '/sounds/discard.wav'],
      volume: 0.4,
      html5: true,
      onloaderror: () => console.log('Discard sound failed to load')
    }),
    win: new Howl({
      src: ['/sounds/win.mp3', '/sounds/win.wav'],
      volume: 0.5,
      html5: true,
      onloaderror: () => console.log('Win sound failed to load')
    }),
    button: new Howl({
      src: ['/sounds/button.mp3', '/sounds/button.wav'],
      volume: 0.2,
      html5: true,
      onloaderror: () => console.log('Button sound failed to load')
    }),
    shuffle: new Howl({
      src: ['/sounds/shuffle.mp3', '/sounds/shuffle.wav'],
      volume: 0.3,
      html5: true,
      onloaderror: () => console.log('Shuffle sound failed to load')
    })
  }), []);

  const createFallbackSoundForType = useCallback(async (soundType: keyof typeof sounds) => {
    try {
      switch (soundType) {
        case 'draw':
          await createFallbackSound(800, 0.2, 'sine');
          break;
        case 'discard':
          await createFallbackSound(400, 0.3, 'sawtooth');
          break;
        case 'shuffle':
          setTimeout(async () => await createFallbackSound(300, 0.1, 'square'), 0);
          setTimeout(async () => await createFallbackSound(350, 0.1, 'square'), 100);
          setTimeout(async () => await createFallbackSound(320, 0.1, 'square'), 200);
          break;
        case 'win':
          await createFallbackSound(523, 0.4, 'sine');
          setTimeout(async () => await createFallbackSound(659, 0.4, 'sine'), 200);
          setTimeout(async () => await createFallbackSound(784, 0.6, 'sine'), 400);
          break;
        case 'button':
          await createFallbackSound(1000, 0.1, 'square');
          break;
      }
    } catch (fallbackError) {
      console.log(`Fallback sound also failed for ${soundType}:`, fallbackError);
    }
  }, [createFallbackSound]);

  const playSound = useCallback(async (soundType: keyof typeof sounds) => {
    if (soundsEnabled) {
      try {
        const sound = sounds[soundType];
        if (sound.state() === 'loaded') {
          try {
            sound.play();
          } catch (playError) {
            console.log(`Howl sound failed for ${soundType}, using fallback:`, playError);
            await createFallbackSoundForType(soundType);
          }
        } else {
          await createFallbackSoundForType(soundType);
        }
      } catch (error) {
        console.log(`Failed to play ${soundType} sound:`, error);
        await createFallbackSoundForType(soundType);
      }
    }
  }, [soundsEnabled, sounds, createFallbackSoundForType]);

  const toggleSounds = useCallback(() => {
    setSoundsEnabled(prev => !prev);
  }, []);

  const enableAudio = useCallback(async () => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        let context = audioContext;
        if (!context) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          context = new AudioContextClass();
          setAudioContext(context);
        }
        if (context.state === 'suspended') {
          await context.resume();
        }
      } catch (error) {
        console.log('Failed to enable audio:', error);
      }
    }
  }, [audioContext]);

  return { playSound, soundsEnabled, toggleSounds, enableAudio };
};

// Card image mapping (unused in this version)
/*
const _cardImageMap: { [key: string]: string } = {
  'A♠': 'https://i.ibb.co/7xkX3DBP/ace-of-spades2.png',
  'A♥': 'https://i.ibb.co/35B8BckQ/ace-of-hearts.png',
  'A♦': 'https://i.ibb.co/Q7vLKGzd/ace-of-diamonds.png',
  'A♣': 'https://i.ibb.co/vx789zqQ/ace-of-clubs.png',
  'K♠': 'https://i.ibb.co/398YspSR/king-of-spades2.png',
  'K♥': 'https://i.ibb.co/9kxNhK2k/king-of-hearts2.png',
  'K♦': 'https://i.ibb.co/tphVCgVN/king-of-diamonds2.png',
  'K♣': 'https://i.ibb.co/Jj8sbb7c/king-of-clubs2.png',
  'Q♠': 'https://i.ibb.co/Df4rqCWy/queen-of-spades2.png',
  'Q♥': 'https://i.ibb.co/7NkjSWQr/queen-of-hearts2.png',
  'Q♦': 'https://i.ibb.co/SwK6jMqx/queen-of-diamonds2.png',
  'Q♣': 'https://i.ibb.co/SwBy5qF7/queen-of-clubs2.png',
  'J♠': 'https://i.ibb.co/NdTVnL3k/jack-of-spades2.png',
  'J♥': 'https://i.ibb.co/PGQwd0Bx/jack-of-hearts2.png',
  'J♦': 'https://i.ibb.co/HL2JdQzN/jack-of-diamonds2.png',
  'J♣': 'https://i.ibb.co/SwC4DSyV/jack-of-clubs2.png',
  '10♠': 'https://i.ibb.co/Q3gTw393/10-of-spades.png',
  '10♥': 'https://i.ibb.co/ch0S4v6d/10-of-hearts.png',
  '10♦': 'https://i.ibb.co/rGhvXcQ0/10-of-diamonds.png',
  '10♣': 'https://i.ibb.co/27WWR0RC/10-of-clubs.png',
  '9♠': 'https://i.ibb.co/ynrRZpdf/9-of-spades.png',
  '9♥': 'https://i.ibb.co/VYjD94NT/9-of-hearts.png',
  '9♦': 'https://i.ibb.co/Z3C0k19/9-of-diamonds.png',
  '9♣': 'https://i.ibb.co/MyCtXBzK/9-of-clubs.png',
  '8♠': 'https://i.ibb.co/p6cMtzSL/8-of-spades.png',
  '8♥': 'https://i.ibb.co/DfMDbGs1/8-of-hearts.png',
  '8♦': 'https://i.ibb.co/PR1P7W3/8-of-diamonds.png',
  '8♣': 'https://i.ibb.co/DSNkX0V/8-of-clubs.png',
  '7♠': 'https://i.ibb.co/3YGzcP6B/7-of-spades.png',
  '7♥': 'https://i.ibb.co/RkMZCPg0/7-of-hearts.png',
  '7♦': 'https://i.ibb.co/PGBBLCjc/7-of-diamonds.png',
  '7♣': 'https://i.ibb.co/Zp9RgpJB/7-of-clubs.png',
  '6♠': 'https://i.ibb.co/hJrcyLRB/6-of-spades.png',
  '6♥': 'https://i.ibb.co/LzVt9rp5/6-of-hearts.png',
  '6♦': 'https://i.ibb.co/4RCGvb87/6-of-diamonds.png',
  '6♣': 'https://i.ibb.co/LDWSqJVh/6-of-clubs.png',
  '5♠': 'https://i.ibb.co/274Cy2FS/5-of-spades.png',
  '5♥': 'https://i.ibb.co/G4ksQ9nr/5-of-hearts.png',
  '5♦': 'https://i.ibb.co/tGHPrkB/5-of-diamonds.png',
  '5♣': 'https://i.ibb.co/RGs6VwSx/5-of-clubs.png',
  '4♠': 'https://i.ibb.co/Dg1727gc/4-of-spades.png',
  '4♥': 'https://i.ibb.co/3mYLwTcJ/4-of-hearts.png',
  '4♦': 'https://i.ibb.co/hxCkckC3/4-of-diamonds.png',
  '4♣': 'https://i.ibb.co/dZvG32N/4-of-clubs.png',
  '3♠': 'https://i.ibb.co/6R0gW7Z7/3-of-spades.png',
  '3♥': 'https://i.ibb.co/dw5fs4kS/3-of-hearts.png',
  '3♦': 'https://i.ibb.co/RpdFmS3X/3-of-diamonds.png',
  '3♣': 'https://i.ibb.co/v604KYky/3-of-clubs.png',
  '2♠': 'https://i.ibb.co/wrJhGjjf/2-of-spades.png',
  '2♥': 'https://i.ibb.co/vC7D20SR/2-of-hearts.png',
  '2♦': 'https://i.ibb.co/kgb1jzxT/2-of-diamonds.png',
  '2♣': 'https://i.ibb.co/xqF5KThJ/2-of-clubs.png'
};
*/

// Types
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

type LobbyGame = {
  id: string;
  host: string;
  players: string[];
  max_players: number;
  created_at: string;
  started?: boolean;
  game_id?: string;
};

// API Service
const apiService = {
  createNewGame: async (
    mode: "cpu" | "multiplayer",
    playerName: string,
    cpuCount = 1,
    maxPlayers = 4,
  ): Promise<GameState> => {
    try {
      const response = await fetch(
        `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}&max_players=${maxPlayers}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
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
      const response = await fetch(`${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

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
    } catch {
      throw new Error("Failed to connect to server. Please try again.");
    }
  },

  discardCard: async (gameId: string, cardIndex: number): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/game/${gameId}/discard?card_index=${cardIndex}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to discard card");
      }
      return response.json();
    } catch {
      throw new Error("Failed to connect to server. Please try again.");
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  listLobbies: async (): Promise<LobbyGame[]> => {
    try {
      const response = await fetch(`${API}/lobby/list`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log("Lobby endpoint not found - returning empty list");
          return [];
        }
        throw new Error("Failed to fetch lobbies");
      }
      const data = await response.json();
      return data.lobbies || [];
    } catch (error) {
      console.error("API Error:", error);
      return [];
    }
  },

  createLobby: async (hostName: string, maxPlayers: number): Promise<LobbyGame> => {
    try {
      const response = await fetch(
        `${API}/lobby/create?host_name=${encodeURIComponent(hostName)}&max_players=${maxPlayers}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to create lobby");
      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw new Error("Failed to create lobby");
    }
  },

  joinLobby: async (lobbyId: string, playerName: string): Promise<LobbyGame> => {
    try {
      const response = await fetch(
        `${API}/lobby/join?lobby_id=${lobbyId}&player_name=${encodeURIComponent(playerName)}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to join lobby");
      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw new Error("Failed to join lobby");
    }
  },

  getLobbyDetails: async (lobbyId: string): Promise<LobbyGame | null> => {
    try {
      const response = await fetch(`${API}/lobby/${lobbyId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) throw new Error("Failed to fetch lobby details");
      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw new Error("Failed to fetch lobby details");
    }
  },

  startLobbyGame: async (lobbyId: string, hostName: string): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/lobby/start?lobby_id=${lobbyId}&host_name=${encodeURIComponent(hostName)}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to start game");
      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw new Error("Failed to start game");
    }
  },
};


// Home Page Component
const HomePage = ({ onSelectMode, playerName, setPlayerName }: {
  onSelectMode: (mode: 'multiplayer' | 'cpu') => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}) => {
  return (
    <div className="page-container">
      <div className="welcome-section">
        <h2>Welcome to Njuka King!</h2>
        <p>Choose your game mode to start playing</p>
      </div>
      
      <div className="new-game-form">
        <label>
          Your Name:
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
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
        
        <div className="game-mode-buttons">
          <button
            className="mode-button multiplayer-button"
            onClick={() => onSelectMode('multiplayer')}
            disabled={!playerName.trim()}
          >
            <Users size={32} />
            <span>Multiplayer</span>
            <p>Play with friends online</p>
          </button>
          
          <button
            className="mode-button cpu-button"
            onClick={() => onSelectMode('cpu')}
            disabled={!playerName.trim()}
          >
            <Bot size={32} />
            <span>VS CPU</span>
            <p>Play against computer opponents</p>
          </button>
        </div>
      </div>
    </div>
  );
};

// Multiplayer Lobby Page Component
const MultiplayerPage = ({ 
  onBack, 
  playerName, 
  numPlayers, 
  setNumPlayers,
  onCreateLobby,
  onJoinLobby,
  lobbies,
  loadingStates,
  onRefreshLobbies
}: {
  onBack: () => void;
  playerName: string;
  numPlayers: number;
  setNumPlayers: (num: number) => void;
  onCreateLobby: () => void;
  onJoinLobby: (lobbyId: string) => void;
  lobbies: LobbyGame[];
  loadingStates: any;
  onRefreshLobbies: () => void;
}) => {
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
            {lobbies.length === 0 ? (
              <div className="no-lobbies">
                <p>No games available right now.</p>
                <p>Create a new game to start playing!</p>
              </div>
            ) : (
              lobbies.map((lobby) => (
                <div key={lobby.id} className="lobby-item">
                  <div className="lobby-info">
                    <h4>Host: {lobby.host}</h4>
                    <p>Players: {lobby.players.length}/{lobby.max_players}</p>
                    <div className="player-list-preview">
                      {lobby.players.map(player => (
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
                    disabled={lobby.players.length >= lobby.max_players || loadingStates.joining}
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

// CPU Game Page Component
const CPUGamePage = ({ 
  onBack, 
  onStartGame, 
  numCPU, 
  setNumCPU, 
  loadingStates 
}: {
  onBack: () => void;
  onStartGame: () => void;
  numCPU: number;
  setNumCPU: (num: number) => void;
  loadingStates: any;
}) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>Play vs CPU</h2>
      </div>

      <div className="cpu-game-content">
        <div className="cpu-options">
          <h3>Choose Your Opponents</h3>
          <p>Select how many CPU players you want to face</p>
          
          <div className="cpu-selection">
            <label>Number of CPU Players:</label>
            <div className="cpu-buttons">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setNumCPU(num)}
                  className={`cpu-count-btn ${numCPU === num ? 'selected' : ''}`}
                >
                  {num} CPU
                </button>
              ))}
            </div>
          </div>

          <div className="difficulty-info">
            <h4>CPU Difficulty: Smart</h4>
            <p>CPU players will make strategic decisions and try to win!</p>
          </div>

          <button
            onClick={onStartGame}
            disabled={loadingStates.starting}
            className="start-cpu-game-btn"
          >
            {loadingStates.starting ? "Starting Game..." : `Start Game vs ${numCPU} CPU`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Rules Page Component
const RulesPage = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>How to Play Njuka King</h2>
      </div>

      <div className="rules-content">
        <section className="rules-section">
          <h3>🎯 Objective</h3>
          <p>Be the first player to create a winning hand of exactly 4 cards.</p>
        </section>

        <section className="rules-section">
          <h3>🃏 Winning Hand</h3>
          <p>A winning hand consists of:</p>
          <ul>
            <li><strong>One Pair</strong> - Two cards of the same rank (e.g., two 8s)</li>
            <li><strong>Two Followers</strong> - Two cards in sequential order (e.g., 9 and 10)</li>
          </ul>
          <p><strong>Example:</strong> 8♥, 8♠, 9♣, 10♦ (pair of 8s + 9,10 sequence)</p>
        </section>

        <section className="rules-section">
          <h3>🎮 How to Play</h3>
          <ol>
            <li><strong>Draw Phase:</strong> On your turn, draw one card from the deck</li>
            <li><strong>Discard Phase:</strong> Choose one card from your hand to discard</li>
            <li><strong>Win Check:</strong> If you have a winning hand, the game ends and you win!</li>
            <li><strong>Continue:</strong> Play passes to the next player</li>
          </ol>
        </section>

        <section className="rules-section">
          <h3>📱 Controls</h3>
          <ul>
            <li><strong>Draw Card:</strong> Tap the deck to draw a card</li>
            <li><strong>Select Card:</strong> Tap a card in your hand to select it</li>
            <li><strong>Discard:</strong> Tap the selected card again to discard it</li>
            <li><strong>Mobile Gestures:</strong> Swipe cards left/right to discard quickly</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>💡 Pro Tips</h3>
          <ul>
            <li>Watch what other players discard - you might be able to use those cards!</li>
            <li>Sometimes you can win with just 3 cards if the top discard pile card completes your hand</li>
            <li>Keep track of which cards have been played to know what's still in the deck</li>
            <li>Don't hold onto cards too long - be ready to adapt your strategy</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>🎵 Audio & Accessibility</h3>
          <ul>
            <li>Sound effects play for all game actions</li>
            <li>Haptic feedback on mobile devices for better gameplay feel</li>
            <li>Screen reader compatible with proper ARIA labels</li>
            <li>Toggle sounds on/off in settings</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>🏆 Winning</h3>
          <p>The first player to achieve a winning hand wins the game! The winning hand will be displayed for all players to see.</p>
        </section>
      </div>
    </div>
  );
};

// Enhanced Bottom Menu with Expandable Options
const EnhancedBottomMenu = ({
  quitGameToMenu,
  soundsEnabled,
  toggleSounds,
  playSound,
  onShowRules,
  currentPage: _currentPage,
  onGoHome
}: {
  quitGameToMenu?: () => void;
  soundsEnabled: boolean;
  toggleSounds: () => void;
  playSound: (soundType: 'button') => void;
  onShowRules: () => void;
  currentPage: string;
  onGoHome: () => void;
}) => {
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  const handleButtonClick = (action: () => void) => {
    playSound('button');
    if (navigator.vibrate) {
      navigator.vibrate([40, 20, 40]);
    }
    action();
  };

  const toggleSettings = () => {
    setSettingsExpanded(!settingsExpanded);
    setInfoExpanded(false); // Close info if open
  };

  const toggleInfo = () => {
    setInfoExpanded(!infoExpanded);
    setSettingsExpanded(false); // Close settings if open
  };

  return (
    <div className="enhanced-bottom-menu">
      {/* Expandable Settings Panel */}
      {settingsExpanded && (
        <div className="expanded-panel settings-panel">
          <button 
            onClick={() => handleButtonClick(toggleSounds)}
            className="panel-button"
          >
            {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            Sound {soundsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Expandable Info Panel */}
      {infoExpanded && (
        <div className="expanded-panel info-panel">
          <button 
            onClick={() => handleButtonClick(onShowRules)}
            className="panel-button"
          >
            <BookOpen size={20} />
            Rules
          </button>
        </div>
      )}

      {/* Main Menu Bar */}
      <div className="main-menu-bar">
        <button 
          onClick={() => handleButtonClick(onGoHome)}
          className="menu-button"
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button 
          onClick={() => handleButtonClick(toggleSettings)}
          className={`menu-button ${settingsExpanded ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>

        <button 
          onClick={() => handleButtonClick(toggleInfo)}
          className={`menu-button ${infoExpanded ? 'active' : ''}`}
        >
          <Info size={20} />
          <span>Info</span>
        </button>

        {quitGameToMenu && (
          <button 
            onClick={() => handleButtonClick(quitGameToMenu)}
            className="menu-button quit-button"
          >
            <span>Quit</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'multiplayer' | 'cpu' | 'rules' | 'game' | 'tutorial'>('home');
  const [playerName, setPlayerName] = useState('Player');
  const [numPlayers, setNumPlayers] = useState(4);
  const [numCPU, setNumCPU] = useState(1);
  const [lobbies, setLobbies] = useState<LobbyGame[]>([]);
  const [lobby, setLobby] = useState<LobbyGame | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    drawing: false,
    discarding: false,
    joining: false,
    starting: false,
    cpuMoving: false,
  });

  const { playSound, soundsEnabled, toggleSounds, enableAudio } = useSoundManager();

  // Enable audio on first user interaction
  useEffect(() => {
    const enableAudioOnInteraction = async () => {
      await enableAudio();
      document.removeEventListener('touchstart', enableAudioOnInteraction);
      document.removeEventListener('click', enableAudioOnInteraction);
      document.removeEventListener('keydown', enableAudioOnInteraction);
    };
    
    document.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
    document.addEventListener('click', enableAudioOnInteraction, { once: true });
    document.addEventListener('keydown', enableAudioOnInteraction, { once: true });
    
    return () => {
      document.removeEventListener('touchstart', enableAudioOnInteraction);
      document.removeEventListener('click', enableAudioOnInteraction);
      document.removeEventListener('keydown', enableAudioOnInteraction);
    };
  }, [enableAudio]);

  // Game state polling
  useEffect(() => {
    if (!gameId || !backendAvailable) return;

    let intervalId: NodeJS.Timeout;
    let currentRetries = 3;
    let pollInterval = 2000;
    const maxInterval = 10000;
    const backoffMultiplier = 1.5;

    const fetchGameState = async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`);
        if (!res.ok) {
          if (res.status === 404) {
            console.error(`Game ${gameId} not found on backend. Returning to menu.`);
            setError("Game not found or expired. Returning to main menu.");
            setGameState(null);
            setGameId(null);
            clearInterval(intervalId);
            return;
          }
          throw new Error("Network response was not ok");
        }
        const latestState = await res.json();
        setGameState(latestState);
        currentRetries = 3;
        pollInterval = 2000;
      } catch (err) {
        console.error("Failed to fetch game state:", err);
        currentRetries--;
        
        pollInterval = Math.min(pollInterval * backoffMultiplier, maxInterval);
        
        if (currentRetries <= 0) {
          setError("Connection lost. Trying to reconnect...");
          clearInterval(intervalId);
          setTimeout(async () => {
            const isHealthy = await apiService.checkHealth();
            setBackendAvailable(isHealthy);
            if (isHealthy) {
              pollInterval = 2000;
              intervalId = setInterval(fetchGameState, pollInterval);
              fetchGameState();
            }
            currentRetries = 3;
          }, 5000);
        } else {
          clearInterval(intervalId);
          intervalId = setInterval(fetchGameState, pollInterval);
        }
      }
    };

    intervalId = setInterval(fetchGameState, pollInterval);
    fetchGameState();

    return () => clearInterval(intervalId);
  }, [gameId, backendAvailable]);

  // CPU move logic
  useEffect(() => {
    if (!gameState || gameState.game_over || !backendAvailable) return;

    const currentPlayer = gameState.players[gameState.current_player];
    const isMyTurn = currentPlayer.name === playerName;

    if (currentPlayer?.is_cpu && !isMyTurn && !loadingStates.cpuMoving) {
      setLoadingStates((prev) => ({ ...prev, cpuMoving: true }));

      const makeCpuMove = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          playSound('draw');
          const updatedStateAfterDraw = await apiService.drawCard(gameState.id);
          setGameState(updatedStateAfterDraw);

          await new Promise((resolve) => setTimeout(resolve, 1000));
          const cpuPlayerAfterDraw = updatedStateAfterDraw.players.find((p) => p.name === currentPlayer.name);
          if (cpuPlayerAfterDraw && cpuPlayerAfterDraw.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * cpuPlayerAfterDraw.hand.length);
            playSound('discard');
            const finalState = await apiService.discardCard(updatedStateAfterDraw.id, randomIndex);
            setGameState(finalState);
          } else {
            const latestState = await fetch(`${API}/game/${gameState.id}`).then((res) => res.json());
            setGameState(latestState);
          }
        } catch (err) {
          console.error("CPU move failed:", err);
          try {
            const latestState = await fetch(`${API}/game/${gameState.id}`).then((res) => res.json());
            setGameState(latestState);
          } catch (fetchErr) {
            console.error("Failed to fetch game state after CPU move error:", fetchErr);
          }
        } finally {
          setLoadingStates((prev) => ({ ...prev, cpuMoving: false }));
        }
      };

      makeCpuMove();
    }
  }, [gameState, playerName, backendAvailable, loadingStates.cpuMoving, playSound]);

  // Lobby polling
  useEffect(() => {
    if (currentPage !== "multiplayer" || !backendAvailable) return;

    const interval = setInterval(() => {
      apiService
        .listLobbies()
        .then(setLobbies)
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPage, backendAvailable]);

  // Lobby details polling
  useEffect(() => {
    if (!lobby || !backendAvailable) return;

    const fetchLobbyDetails = async () => {
      try {
        const updatedLobby = await apiService.getLobbyDetails(lobby.id);
        if (updatedLobby === null) {
          console.log("Lobby no longer exists. Checking if game started...");
          setLobby(null);
          setError("Lobby disappeared. It might have started or expired. Please check available games.");
          setCurrentPage("home");
        } else if (updatedLobby.started && updatedLobby.game_id) {
          console.log(`Lobby started. Joining game with ID: ${updatedLobby.game_id}`);
          try {
            const game = await apiService.joinGame(updatedLobby.game_id, playerName);
            setLobby(null);
            setGameId(game.id);
            setGameState(game);
          } catch (joinError: any) {
            const errorMessage = joinError instanceof Error ? joinError.message : "Failed to join game after lobby started.";
            setError(errorMessage);
            console.error("Failed to join game after lobby started:", joinError);
            setLobby(null);
            setCurrentPage("home");
          }
        } else {
          setLobby(updatedLobby);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching lobby details.";
        setError(errorMessage);
        console.error("Error fetching lobby details:", error);
      }
    };

    const intervalId = setInterval(fetchLobbyDetails, 3000);
    return () => clearInterval(intervalId);
  }, [lobby, backendAvailable, playerName]);

  const handleSelectMode = (mode: 'multiplayer' | 'cpu') => {
    if (mode === 'multiplayer') {
      setCurrentPage('multiplayer');
      // Load lobbies when entering multiplayer page
      apiService.listLobbies()
        .then(setLobbies)
        .catch(() => setLobbies([]));
    } else {
      setCurrentPage('cpu');
    }
  };

  const handleCreateLobby = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    setError(null);
    try {
      const newLobby = await apiService.createLobby(playerName, numPlayers);
      setLobby(newLobby);
      playSound('shuffle');
    } catch (error: any) {
      setError(error.message || "Failed to create lobby");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleJoinLobby = async (lobbyId: string) => {
    setLoadingStates(prev => ({ ...prev, joining: true }));
    setError(null);
    try {
      const joinedLobby = await apiService.joinLobby(lobbyId, playerName);
      setLobby(joinedLobby);
      playSound('draw');
    } catch (error: any) {
      setError(error.message || "Failed to join lobby");
    } finally {
      setLoadingStates(prev => ({ ...prev, joining: false }));
    }
  };

  const handleStartCPUGame = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    setError(null);
    try {
      const game = await apiService.createNewGame("cpu", playerName, numCPU);
      setGameId(game.id);
      setGameState(game);
      setCurrentPage('game');
      playSound('shuffle');
    } catch (error: any) {
      setError(error.message || "Failed to create game");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleRefreshLobbies = () => {
    apiService.listLobbies()
      .then(setLobbies)
      .catch(() => setError("Failed to refresh lobbies"));
  };

  const handleGoHome = () => {
    setCurrentPage('home');
    setLobby(null);
    setGameState(null);
    setGameId(null);
  };

  const handleShowRules = () => {
    setCurrentPage('rules');
  };

  const handleQuitGame = () => {
    setGameState(null);
    setGameId(null);
    setCurrentPage('home');
  };

  // Game logic functions
  const discard = async (cardIdx: number) => {
    setLoadingStates(prev => ({ ...prev, discarding: true }));
    setError(null);
    try {
      if (!gameState) return;
      const newState = await apiService.discardCard(gameState.id, cardIdx);
      setGameState(newState);
      playSound('discard');
    } catch (error: any) {
      setError(error.message || "Failed to discard card");
    } finally {
      setLoadingStates(prev => ({ ...prev, discarding: false }));
    }
  };

  const draw = async () => {
    setLoadingStates(prev => ({ ...prev, drawing: true }));
    setError(null);
    try {
      if (!gameState) return;
      const newState = await apiService.drawCard(gameState.id);
      setGameState(newState);
      playSound('draw');
    } catch (error: any) {
      setError(error.message || "Failed to draw card");
    } finally {
      setLoadingStates(prev => ({ ...prev, drawing: false }));
    }
  };


  const handleCloseTutorial = () => {
    setCurrentPage('home');
  };

  return (
    <WebSocketProvider baseUrl="wss://njuka-webapp-backend.onrender.com">
      <div className="App">
        <h1>Njuka King</h1>
        
        <ConnectionStatus 
          showControls={true}
          showDetails={true}
          className="connection-status-top"
        />

        <ErrorModal
          isOpen={!!error}
          onClose={() => setError(null)}
          message={error || ''}
          showRetryButton={error?.includes('Connection') || error?.includes('Network') || false}
          onRetry={() => window.location.reload()}
          retryButtonText="Retry Connection"
        />

        <LoadingOverlay
          isVisible={loadingStates.starting || loadingStates.joining}
          message="Connecting to game server..."
        />

        {/* Game Table Rendering */}
        {gameState ? (
          <div className="game-container">
            <LazyGameTable
              state={gameState}
              playerName={playerName}
              onDiscard={discard}
              onDraw={draw}
              loadingStates={loadingStates}
              playSound={playSound}
              showTutorial={currentPage === 'tutorial'}
              onCloseTutorial={handleCloseTutorial}
            />
            <LazyGameOverModal
              isOpen={!!gameState.game_over}
              onClose={handleQuitGame}
              winner={gameState.winner || 'Unknown'}
              winnerHand={gameState.winner_hand}
              onNewGame={handleQuitGame}
            />
          </div>
        ) : lobby ? (
          <div className="lobby-view">
            <h2>Lobby: {lobby.id}</h2>
            <p>Host: {lobby.host}</p>
            <p>Players: {lobby.players.length}/{lobby.max_players}</p>
            <div className="player-list">
              <h3>Players:</h3>
              <ul>
                {lobby.players.map((player) => (
                  <li key={player}>
                    {player} {player === playerName && "(You)"}
                    {player === lobby.host && " 👑"}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setLobby(null)} className="quit-btn">
              Leave Lobby
            </button>
          </div>
        ) : (
          <>
            {/* Page Rendering */}
            {currentPage === 'home' && (
              <HomePage
                onSelectMode={handleSelectMode}
                playerName={playerName}
                setPlayerName={setPlayerName}
              />
            )}

            {currentPage === 'multiplayer' && (
              <MultiplayerPage
                onBack={() => setCurrentPage('home')}
                playerName={playerName}
                numPlayers={numPlayers}
                setNumPlayers={setNumPlayers}
                onCreateLobby={handleCreateLobby}
                onJoinLobby={handleJoinLobby}
                lobbies={lobbies}
                loadingStates={loadingStates}
                onRefreshLobbies={handleRefreshLobbies}
              />
            )}

            {currentPage === 'cpu' && (
              <CPUGamePage
                onBack={() => setCurrentPage('home')}
                onStartGame={handleStartCPUGame}
                numCPU={numCPU}
                setNumCPU={setNumCPU}
                loadingStates={loadingStates}
              />
            )}

            {currentPage === 'rules' && (
              <RulesPage onBack={() => setCurrentPage('home')} />
            )}

            {currentPage === 'tutorial' && (
              <LazyTutorialModal
                isOpen={true}
                onClose={handleCloseTutorial}
              />
            )}
          </>
        )}

        <EnhancedBottomMenu
          quitGameToMenu={gameState ? handleQuitGame : undefined}
          soundsEnabled={soundsEnabled}
          toggleSounds={toggleSounds}
          playSound={playSound}
          onShowRules={handleShowRules}
          currentPage={currentPage}
          onGoHome={handleGoHome}
        />
      </div>
    </WebSocketProvider>
  );
}

export default App;