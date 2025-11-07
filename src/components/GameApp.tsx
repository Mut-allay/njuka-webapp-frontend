import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameState, LobbyGame, LoadingStates } from '../types/game';
import { GameService, WS_API } from '../services/gameService';

// Import game components
import LazyGameTable from './LazyGameTable';
import LazyGameOverModal from './LazyGameOverModal';
import ErrorModal from './ErrorModal';
import LoadingOverlay from './LoadingOverlay';
import { HomePage } from './HomePage';
import { MultiplayerPage } from './MultiplayerPage';
import { CPUGamePage } from './CPUGamePage';
import { RulesPage } from './RulesPage';
import { EnhancedBottomMenu } from './EnhancedBottomMenu';

interface GameAppProps {
  playerName: string;
  playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void;
  soundsEnabled: boolean;
  toggleSounds: () => void;
}

export function GameApp({
  playerName,
  playSound,
  soundsEnabled,
  toggleSounds
}: GameAppProps) {
  const [currentPage, setCurrentPage] = useState('home');
  const [numPlayers, setNumPlayers] = useState(2);
  const [numCPU, setNumCPU] = useState(1);
  const [lobbies, setLobbies] = useState<LobbyGame[]>([]);
  const [lobby, setLobby] = useState<LobbyGame | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    starting: false,
    joining: false,
    drawing: false,
    discarding: false,
    cpuMoving: false,
  });

  // WebSocket states
  const [lobbyWS, setLobbyWS] = useState<WebSocket | null>(null);
  const [gameWS, setGameWS] = useState<WebSocket | null>(null);

  // Initialize game service (use useMemo to avoid recreating on every render)
  const gameService = useMemo(() => new GameService(), []);

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
            gameService.getGame(message.data.game_id)
              .then(setGameState)
              .catch(error => setError(error.message));
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
  }, [lobby, currentPage]);

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

  // Poll game state as fallback when WebSocket is not available
  // For CPU games, always poll since they don't use WebSocket
  useEffect(() => {
    if (!gameId) return;

    // For CPU games, always poll. For multiplayer, only poll if WebSocket is not connected
    const isCPUGame = gameState?.mode === 'cpu';
    const shouldPoll = isCPUGame || !gameWS || gameWS.readyState !== WebSocket.OPEN;
    
    if (!shouldPoll) return;

    const interval = setInterval(async () => {
      try {
        const game = await gameService.getGame(gameId);
        setGameState(game);
      } catch (error: any) {
        console.error('Failed to fetch game state:', error);
      }
    }, gameState?.mode === 'multiplayer' ? 1000 : 2000); // More frequent for multiplayer

    return () => clearInterval(interval);
  }, [gameId, gameWS, gameState?.mode, gameService]);

  // CPU turn processing - automatically handle CPU moves
  const cpuProcessingRef = useRef(false);
  useEffect(() => {
    if (!gameState || gameState.mode !== 'cpu' || gameState.game_over) return;
    if (cpuProcessingRef.current) return; // Prevent concurrent CPU processing

    const currentPlayer = gameState.players[gameState.current_player];
    if (!currentPlayer || !currentPlayer.is_cpu) return; // Not a CPU turn

    // Check if CPU needs to draw
    if (!gameState.has_drawn) {
      cpuProcessingRef.current = true;
      setLoadingStates(prev => ({ ...prev, cpuMoving: true }));
      
      // CPU draws a card
      gameService.drawCard(gameState.id)
        .then((newState) => {
          setGameState(newState);
          playSound('draw');
          
          // After drawing, CPU needs to discard
          // Wait a bit for visual feedback, then discard
          setTimeout(() => {
            if (newState.has_drawn && newState.players[newState.current_player].hand.length > 0) {
              // CPU discards the first card (simple strategy)
              const discardIndex = 0;
              return gameService.discardCard(newState.id, discardIndex)
                .then((finalState) => {
                  setGameState(finalState);
                  playSound('discard');
                  cpuProcessingRef.current = false;
                  setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
                })
                .catch((error) => {
                  console.error('CPU discard failed:', error);
                  cpuProcessingRef.current = false;
                  setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
                });
            } else {
              cpuProcessingRef.current = false;
              setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
            }
          }, 1500); // 1.5 second delay between draw and discard
        })
        .catch((error) => {
          console.error('CPU draw failed:', error);
          cpuProcessingRef.current = false;
          setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
        });
    } else {
      // CPU has drawn but needs to discard
      cpuProcessingRef.current = true;
      setLoadingStates(prev => ({ ...prev, cpuMoving: true }));
      
      // CPU discards the first card
      const discardIndex = 0;
      gameService.discardCard(gameState.id, discardIndex)
        .then((newState) => {
          setGameState(newState);
          playSound('discard');
          cpuProcessingRef.current = false;
          setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
        })
        .catch((error) => {
          console.error('CPU discard failed:', error);
          cpuProcessingRef.current = false;
          setLoadingStates(prev => ({ ...prev, cpuMoving: false }));
        });
    }
  }, [gameState, gameService, playSound]);

  // Game actions
  const handleCreateLobby = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    setError(null);
    try {
      // Create lobby first
      const newLobby = await gameService.createLobby(playerName, numPlayers);
      setLobby(newLobby);
      
      // Immediately create a game and join it
      const game = await gameService.createNewGame("multiplayer", playerName, 0, numPlayers);
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
      const joinedLobby = await gameService.joinLobby(lobbyId, playerName);
      setLobby(joinedLobby);
      
      // Check if the lobby already has a game, if not create one
      let game;
      if (joinedLobby.game_id) {
        // Join existing game
        game = await gameService.joinGame(joinedLobby.game_id, playerName);
      } else {
        // Create new game for this lobby
        game = await gameService.createNewGame("multiplayer", joinedLobby.host, 0, joinedLobby.max_players);
        // Add all lobby players to the game
        for (const player of joinedLobby.players) {
          if (player !== joinedLobby.host) {
            await gameService.joinGame(game.id, player);
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
      const response = await gameService.getLobbies();
      setLobbies(response.lobbies || []);
    } catch (error: any) {
      setError(error.message || "Failed to fetch lobbies");
      setLobbies([]); // Set empty array on error to prevent map errors
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'multiplayer') {
      handleRefreshLobbies();
      const interval = setInterval(handleRefreshLobbies, 10000);
      return () => clearInterval(interval);
    }
  }, [currentPage, handleRefreshLobbies]);

  const discard = async (index: number) => {
    setLoadingStates(prev => ({ ...prev, discarding: true }));
    setError(null);
    try {
      if (!gameState) return;
      const newState = await gameService.discardCard(gameState.id, index);
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
      const newState = await gameService.drawCard(gameState.id);
      setGameState(newState);
      playSound('draw');
    } catch (error: any) {
      setError(error.message || "Failed to draw card");
    } finally {
      setLoadingStates(prev => ({ ...prev, drawing: false }));
    }
  };

  const handleStartCPUGame = async () => {
    setLoadingStates(prev => ({ ...prev, starting: true }));
    try {
      const game = await gameService.createNewGame("cpu", playerName, numCPU);
      setGameState(game);
      setGameId(game.id); // Set gameId for polling
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
      await gameService.cancelLobby(lobby.id, playerName);
      setLobby(null);
      setCurrentPage('home');
      playSound('button');
    } catch (error: any) {
      setError(error.message || "Failed to cancel lobby");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleCancelGame = async () => {
    if (!lobby) return;
    
    // Check if the current player is the host
    const isHost = lobby.host === playerName;
    if (!isHost) {
      setError("Only the host can cancel the game");
      return;
    }
    
    // Check if the game has started (has drawn cards or pot has cards)
    const gameHasStarted = gameState && (gameState.has_drawn || gameState.pot.length > 0);
    if (gameHasStarted) {
      setError("Cannot cancel a game that has already started");
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, starting: true }));
    try {
      await gameService.cancelLobby(lobby.id, playerName);
      
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
      playSound('button');
    } catch (error: any) {
      setError(error.message || "Failed to cancel game");
    } finally {
      setLoadingStates(prev => ({ ...prev, starting: false }));
    }
  };

  const handleSelectMode = (mode: 'multiplayer' | 'cpu') => {
    if (mode === 'multiplayer') {
      setCurrentPage('multiplayer');
    } else {
      setCurrentPage('cpu');
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

          {/* Debug Info for Multiplayer */}
          {gameState.mode === 'multiplayer' && (
            <div style={{
              position: 'fixed',
              top: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '10px',
              zIndex: 1000,
              maxWidth: '200px'
            }}>
              <div>Players: {gameState.players.length}/{gameState.max_players}</div>
              <div>Has Drawn: {gameState.has_drawn ? 'Yes' : 'No'}</div>
              <div>Pot: {gameState.pot.length} cards</div>
              <div>Host: {lobby?.host}</div>
              <div>You: {playerName}</div>
              <div>Is Host: {lobby?.host === playerName ? 'Yes' : 'No'}</div>
            </div>
          )}

          {/* Game Waiting State - Show cancel button for host when game hasn't started */}
          {gameState.mode === 'multiplayer' && 
           lobby && 
           lobby.host === playerName && 
           gameState.players.length < 2 && 
           !gameState.has_drawn && 
           gameState.pot.length === 0 && (
            <div className="game-waiting-overlay" style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              zIndex: 1001
            }}>
              <h3>Waiting for players to join...</h3>
              <p>Players: {gameState.players.length}/{gameState.max_players}</p>
              <button 
                onClick={handleCancelGame}
                disabled={loadingStates.starting}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                {loadingStates.starting ? "Cancelling..." : "Cancel Game"}
              </button>
            </div>
          )}

          <LazyGameTable
            state={gameState}
            playerName={playerName}
            onDiscard={discard}
            onDraw={draw}
            loadingStates={loadingStates}
            playSound={playSound}
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