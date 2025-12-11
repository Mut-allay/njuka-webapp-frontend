import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { GameState, LobbyGame, LoadingStates } from '../types/game';
import { GameService, WS_API } from '../services/gameService';

interface GameContextType {
    // Player state
    playerName: string;
    setPlayerName: (name: string) => void;

    // Game state
    gameState: GameState | null;
    gameId: string | null;

    // Lobby state
    lobby: LobbyGame | null;
    lobbies: LobbyGame[];

    // Loading states
    loadingStates: LoadingStates;

    // Error state
    error: string | null;
    setError: (error: string | null) => void;

    // WebSocket connections
    lobbyWS: WebSocket | null;
    gameWS: WebSocket | null;

    // Game actions
    createLobby: (numPlayers: number) => Promise<void>;
    joinLobby: (lobbyId: string) => Promise<void>;
    startCPUGame: (numCPU: number) => Promise<void>;
    drawCard: () => Promise<void>;
    discardCard: (index: number) => Promise<void>;
    quitGame: () => void;
    refreshLobbies: () => Promise<void>;

    // Game service
    gameService: GameService;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
};

interface GameProviderProps {
    children: ReactNode;
    playerName: string;
    setPlayerName: (name: string) => void;
}

export const GameProvider = ({ children, playerName, setPlayerName }: GameProviderProps) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [lobby, setLobby] = useState<LobbyGame | null>(null);
    const [lobbies, setLobbies] = useState<LobbyGame[]>([]);
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

    // WebSocket connection for lobby updates
    useEffect(() => {
        if (lobby) {
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
    }, [lobby, gameService]);

    // WebSocket connection for game updates (multiplayer only)
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

    // Game actions
    const createLobby = useCallback(async (numPlayers: number) => {
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
        } catch (error: any) {
            setError(error.message || "Failed to create game");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService]);

    const joinLobby = useCallback(async (lobbyId: string) => {
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
        } catch (error: any) {
            setError(error.message || "Failed to join game");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, joining: false }));
        }
    }, [playerName, gameService]);

    const startCPUGame = useCallback(async (numCPU: number) => {
        setLoadingStates(prev => ({ ...prev, starting: true }));
        try {
            const game = await gameService.createNewGame("cpu", playerName, numCPU);
            setGameState(game);
            setGameId(game.id);
        } catch (error: any) {
            setError(error.message || "Failed to create game");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService]);

    const drawCard = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, drawing: true }));
        setError(null);
        try {
            if (!gameState) return;
            const newState = await gameService.drawCard(gameState.id);
            setGameState(newState);
        } catch (error: any) {
            setError(error.message || "Failed to draw card");
        } finally {
            setLoadingStates(prev => ({ ...prev, drawing: false }));
        }
    }, [gameState, gameService]);

    const discardCard = useCallback(async (index: number) => {
        setLoadingStates(prev => ({ ...prev, discarding: true }));
        setError(null);
        try {
            if (!gameState) return;
            const newState = await gameService.discardCard(gameState.id, index);
            setGameState(newState);
        } catch (error: any) {
            setError(error.message || "Failed to discard card");
        } finally {
            setLoadingStates(prev => ({ ...prev, discarding: false }));
        }
    }, [gameState, gameService]);

    const quitGame = useCallback(() => {
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
    }, [gameWS, lobbyWS]);

    const refreshLobbies = useCallback(async () => {
        try {
            const response = await gameService.getLobbies();
            setLobbies(response.lobbies || []);
        } catch (error: any) {
            setError(error.message || "Failed to fetch lobbies");
            setLobbies([]);
        }
    }, [gameService]);

    const value = {
        playerName,
        setPlayerName,
        gameState,
        gameId,
        lobby,
        lobbies,
        loadingStates,
        error,
        setError,
        lobbyWS,
        gameWS,
        createLobby,
        joinLobby,
        startCPUGame,
        drawCard,
        discardCard,
        quitGame,
        refreshLobbies,
        gameService,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
