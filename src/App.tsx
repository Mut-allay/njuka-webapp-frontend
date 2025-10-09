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

const API = "https://njuka-webapp-backend.onrender.com";
const WS_API = API.replace('https://', 'wss://');  // WebSocket API

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
        console.log(`Sound playback failed for ${soundType}:`, error);
      }
    }
  }, [soundsEnabled, sounds, createFallbackSoundForType]);

  return { playSound, soundsEnabled, toggleSounds: () => setSoundsEnabled(!soundsEnabled) };
};

// Component definitions
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
      </div>
    </div>
  );
};

const EnhancedBottomMenu = ({
  quitGameToMenu,
  soundsEnabled,
  toggleSounds,
  playSound,
  onShowRules,
  onGoHome
}: {
  quitGameToMenu?: () => void;
  soundsEnabled: boolean;
  toggleSounds: () => void;
  playSound: (soundType: 'button') => void;
  onShowRules: () => void;
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
    setInfoExpanded(false);
  };

  const toggleInfo = () => {
    setInfoExpanded(!infoExpanded);
    setSettingsExpanded(false);
  };

  return (
    <div className="enhanced-bottom-menu">
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

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [numPlayers, setNumPlayers] = useState(2);
  const [numCPU, setNumCPU] = useState(1);
  const [lobbies, setLobbies] = useState([]);
  const [lobby, setLobby] = useState<LobbyGame | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    starting: false,
    joining: false,
    drawing: false,
    discarding: false,
    cpuMoving: false,
  });
  const { playSound, soundsEnabled, toggleSounds } = useSoundManager();

  // WebSocket states
  const [lobbyWS, setLobbyWS] = useState<WebSocket | null>(null);
  const [gameWS, setGameWS] = useState<WebSocket | null>(null);

  // API service (assuming you have this; if not, add it)
  const apiService = useMemo(() => ({
    createLobby: async (host: string, maxPlayers: number) => {
      const response = await fetch(`${API}/lobby/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, max_players: maxPlayers }),
      });
      if (!response.ok) throw new Error('Failed to create lobby');
      return await response.json();
    },
    joinLobby: async (lobbyId: string, player: string) => {
      const response = await fetch(`${API}/lobby/${lobbyId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player }),
      });
      if (!response.ok) throw new Error('Failed to join lobby');
      return await response.json();
    },
    getLobbies: async () => {
      const response = await fetch(`${API}/lobbies`);
      if (!response.ok) throw new Error('Failed to fetch lobbies');
      return await response.json();
    },
    // Add other methods like drawCard, discard, etc.
    getGame: async (gameId: string) => {
      const response = await fetch(`${API}/game/${gameId}`);
      if (!response.ok) throw new Error('Failed to fetch game state');
      return await response.json();
    },
    drawCard: async (gameId: string) => {
      const response = await fetch(`${API}/game/${gameId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to draw card');
      return await response.json();
    },
    discardCard: async (gameId: string, cardIndex: number) => {
      const response = await fetch(`${API}/game/${gameId}/discard?card_index=${cardIndex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to discard card');
      return await response.json();
    },
    createNewGame: async (mode: string, playerName: string, cpuCount: number = 1, maxPlayers: number = 4) => {
      const response = await fetch(`${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}&max_players=${maxPlayers}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to create game');
      return await response.json();
    },
    joinGame: async (gameId: string, playerName: string) => {
      const response = await fetch(`${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to join game');
      return await response.json();
    },
    cancelLobby: async (lobbyId: string, hostName: string) => {
      const response = await fetch(`${API}/lobby/cancel?lobby_id=${lobbyId}&host_name=${encodeURIComponent(hostName)}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel lobby');
    },
  }), []);

  // WebSocket connections for real-time updates
  useEffect(() => {
    if (lobby && currentPage === 'multiplayer') {
      const ws = new WebSocket(`${WS_API}/ws/lobby/${lobby.id}`);
      ws.onopen = () => {
        console.log('Connected to lobby WebSocket');
        setLobbyWS(ws);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'lobby_update') {
          setLobby(message.data);
          if (message.data.started && message.data.game_id) {
            apiService.getGame(message.data.game_id).then(setGameState).catch(setError);
          }
        }
      };
      ws.onclose = () => {
        console.log('Lobby WebSocket closed');
        setLobbyWS(null);
      };
      ws.onerror = (error) => {
        console.error('Lobby WebSocket error:', error);
        setLobbyWS(null);
      };

      return () => {
        ws.close();
        setLobbyWS(null);
      };
    }
  }, [lobby, currentPage, apiService]);

  useEffect(() => {
    if (gameState && gameState.mode === 'multiplayer' && playerName) {
      const ws = new WebSocket(`${WS_API}/ws/game/${gameState.id}?player_name=${encodeURIComponent(playerName)}`);
      ws.onopen = () => {
        console.log('Connected to game WebSocket');
        setGameWS(ws);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'game_update') {
          setGameState(message.data);
        }
      };
      ws.onclose = () => {
        console.log('Game WebSocket closed');
        setGameWS(null);
      };
      ws.onerror = (error) => {
        console.error('Game WebSocket error:', error);
        setGameWS(null);
      };

      return () => {
        ws.close();
        setGameWS(null);
      };
    }
  }, [gameState, playerName]);

  // Existing functions (e.g., handleCreateLobby, handleJoinLobby, etc.)
  const handleCreateLobby = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    setError(null);
    try {
      // Create lobby first
      const newLobby = await apiService.createLobby(playerName, numPlayers);
      setLobby(newLobby);
      
      // Immediately create a game and join it
      const game = await apiService.createNewGame("multiplayer", playerName, 0, numPlayers);
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

  const handleJoinLobby = async (lobbyId: string) => {
    setLoadingStates(prev => ({ ...prev, joining: true }));
    setError(null);
    try {
      // Join the lobby first
      const joinedLobby = await apiService.joinLobby(lobbyId, playerName);
      setLobby(joinedLobby);
      
      // Check if the lobby already has a game, if not create one
      let game;
      if (joinedLobby.game_id) {
        // Join existing game
        game = await apiService.joinGame(joinedLobby.game_id, playerName);
          } else {
        // Create new game for this lobby
        game = await apiService.createNewGame("multiplayer", joinedLobby.host, 0, joinedLobby.max_players);
        // Add all lobby players to the game
        for (const playerName of joinedLobby.players) {
          if (playerName !== joinedLobby.host) {
            await apiService.joinGame(game.id, playerName);
          }
        }
      }
      
      setGameId(game.id);
      setGameState(game);
      setCurrentPage('game');
      
      playSound('draw');
    } catch (error: any) {
      setError(error.message || "Failed to join game");
        } finally {
      setLoadingStates(prev => ({ ...prev, joining: false }));
    }
  };

  const handleRefreshLobbies = useCallback(async () => {
    try {
      const response = await apiService.getLobbies();
      // The backend returns {lobbies: [...]}, so we need to extract the lobbies array
      setLobbies(response.lobbies || []);
    } catch (error: any) {
      setError(error.message || "Failed to fetch lobbies");
      setLobbies([]); // Set empty array on error to prevent map errors
    }
  }, [apiService]);

  useEffect(() => {
    if (currentPage === 'multiplayer') {
      handleRefreshLobbies();
      // Optional: Poll as fallback, but WS handles real-time now
      const interval = setInterval(handleRefreshLobbies, 10000);
    return () => clearInterval(interval);
    }
  }, [currentPage, handleRefreshLobbies]);

  // Poll game state as fallback when WebSocket is not available
  useEffect(() => {
    if (!gameId) return;

    // Only use polling if WebSocket is not connected
    const shouldPoll = !gameWS || gameWS.readyState !== WebSocket.OPEN;
    
    if (!shouldPoll) return;

    const interval = setInterval(async () => {
      try {
        const game = await apiService.getGame(gameId);
        setGameState(game);
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    }, gameState?.mode === 'multiplayer' ? 1000 : 2000); // More frequent for multiplayer

    return () => clearInterval(interval);
  }, [gameId, gameWS, gameState?.mode, apiService]);

  // ... (rest of your existing code, like draw, discard, handleQuitGame, etc.)

  const discard = async (index: number) => {
    setLoadingStates(prev => ({ ...prev, discarding: true }));
    setError(null);
    try {
      if (!gameState) return;
      const newState = await apiService.discardCard(gameState.id, index);  // Assume you have this method
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

  const handleSelectMode = (mode: 'multiplayer' | 'cpu') => {
    if (mode === 'multiplayer') {
      setCurrentPage('multiplayer');
    } else {
      setCurrentPage('cpu');
    }
  };

  const handleStartCPUGame = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    try {
      const game = await apiService.createNewGame("cpu", playerName, numCPU);
      setGameState(game);
      setCurrentPage('game');
      playSound('shuffle');
    } catch (error: any) {
      setError(error.message || "Failed to create game");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleQuitGame = () => {
    // Close WebSocket connections
    if (gameWS) {
      gameWS.close();
      setGameWS(null);
    }
    if (lobbyWS) {
      lobbyWS.close();
      setLobbyWS(null);
    }
    
    setGameState(null);
    setLobby(null);
    setGameId(null);
    setCurrentPage('home');
  };

  const handleCancelLobby = async () => {
    if (!lobby) return;
    
    setLoadingStates(prev => ({ ...prev, starting: true }));
    try {
      await apiService.cancelLobby(lobby.id, playerName);
      setLobby(null);
      setCurrentPage('home');
      playSound('button');
    } catch (error: any) {
      setError(error.message || "Failed to cancel lobby");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleShowRules = () => {
    setCurrentPage('rules');
  };

  const handleGoHome = () => {
    // Close WebSocket connections
    if (gameWS) {
      gameWS.close();
      setGameWS(null);
    }
    if (lobbyWS) {
      lobbyWS.close();
      setLobbyWS(null);
    }
    
    setCurrentPage('home');
    setLobby(null);
    setGameState(null);
    setGameId(null);
  };

  return (
      <div className="App">
        <h1>Njuka King</h1>

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
            {/* WebSocket Status Indicator for Multiplayer */}
            {gameState.mode === 'multiplayer' && (
              <div className="websocket-status" style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: gameWS?.readyState === WebSocket.OPEN ? '#4CAF50' : '#f44336',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 1000
              }}>
                {gameWS?.readyState === WebSocket.OPEN ? '🟢 Live' : '🔴 Polling'}
              </div>
            )}
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
          <div className="lobby-actions">
            {lobby.host === playerName && !lobby.started && (
              <button 
                onClick={handleCancelLobby} 
                className="cancel-btn"
                disabled={loadingStates.starting}
              >
                {loadingStates.starting ? "Cancelling..." : "Cancel Game"}
              </button>
            )}
            <button onClick={() => setLobby(null)} className="quit-btn">
              Leave Lobby
            </button>
          </div>
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
          onGoHome={handleGoHome}
        />
      </div>
  );
}

export default App;