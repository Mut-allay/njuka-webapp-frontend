"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import "./App.css" // Ensure this path is correct after file moves

const API = "https://njuka-webapp-backend.onrender.com"

type CardType = {
  value: string
  suit: string
}

type Player = {
  name: string
  hand: CardType[]
  is_cpu: boolean
}

type GameState = {
  players: Player[]
  pot: CardType[]
  deck: CardType[]
  current_player: number
  has_drawn: boolean
  mode: string
  id: string
  max_players: number
  winner?: string
  winner_hand?: CardType[]
  game_over?: boolean
}

type LobbyGame = {
  id: string
  host: string
  players: string[]
  max_players: number
  created_at: string
  started?: boolean
  game_id?: string
}

const tutorialPromptsShown = new Map<string, number>()

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
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to create game")
      }
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Network error. Please check your connection.")
    }
  },

  joinGame: async (gameId: string, playerName: string): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/join_game?game_id=${gameId}&player_name=${encodeURIComponent(playerName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to join game")
      }
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Network error. Please check your connection.")
    }
  },

  drawCard: async (gameId: string): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/game/${gameId}/draw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to draw card")
      }
      return response.json()
    } catch (err) {
      throw new Error("Failed to connect to server. Please try again.")
    }
  },

  discardCard: async (gameId: string, cardIndex: number): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/game/${gameId}/discard?card_index=${cardIndex}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to discard card")
      }
      return response.json()
    } catch (err) {
      throw new Error("Failed to connect to server. Please try again.")
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/health`)
      return response.ok
    } catch (err) {
      return false
    }
  },

  listLobbies: async (): Promise<LobbyGame[]> => {
    try {
      const response = await fetch(`${API}/lobby/list`)
      if (!response.ok) {
        if (response.status === 404) {
          console.log("Lobby endpoint not found - returning empty list")
          return []
        }
        throw new Error("Failed to fetch lobbies")
      }
      const data = await response.json()
      return data.lobbies || []
    } catch (err) {
      console.error("API Error:", err)
      return []
    }
  },

  createLobby: async (hostName: string, maxPlayers: number): Promise<LobbyGame> => {
    try {
      const response = await fetch(
        `${API}/lobby/create?host_name=${encodeURIComponent(hostName)}&max_players=${maxPlayers}`,
        { method: "POST" },
      )
      if (!response.ok) throw new Error("Failed to create lobby")
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Failed to create lobby")
    }
  },

  joinLobby: async (lobbyId: string, playerName: string): Promise<LobbyGame> => {
    try {
      const response = await fetch(
        `${API}/lobby/join?lobby_id=${lobbyId}&player_name=${encodeURIComponent(playerName)}`,
        { method: "POST" },
      )
      if (!response.ok) throw new Error("Failed to join lobby")
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Failed to join lobby")
    }
  },

  getLobbyDetails: async (lobbyId: string): Promise<LobbyGame | null> => {
    try {
      const response = await fetch(`${API}/lobby/${lobbyId}`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) throw new Error("Failed to fetch lobby details")
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Failed to fetch lobby details")
    }
  },

  startLobbyGame: async (lobbyId: string, hostName: string): Promise<GameState> => {
    try {
      const response = await fetch(`${API}/lobby/start?lobby_id=${lobbyId}&host_name=${encodeURIComponent(hostName)}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to start game")
      return response.json()
    } catch (err) {
      console.error("API Error:", err)
      throw new Error("Failed to start game")
    }
  },
}

function Card({
  value,
  suit,
  onClick,
  disabled,
  facedown = false,
  className = "",
  highlight = false,
  small = true,
  style = {},
  selected = false,
}: {
  value: string
  suit: string
  onClick?: () => void
  disabled?: boolean
  facedown?: boolean
  className?: string
  highlight?: boolean
  small?: boolean
  style?: React.CSSProperties
  selected?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  if (facedown) {
    return (
      <div
        className={`card facedown ${className} ${small ? "small-card" : ""} ${highlight ? "highlight-card" : ""} ${
          isHovered ? "card-hover" : ""
        }`}
        onClick={!disabled ? onClick : undefined}
        style={disabled ? { opacity: 0.7, cursor: "not-allowed", ...style } : style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="card-back"></div>
      </div>
    )
  }

  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black"
  return (
    <div
      className={`card ${suitColor} ${className} ${highlight ? "highlight-card" : ""} ${small ? "small-card" : ""} ${
        isHovered ? "card-hover" : ""
      } ${selected ? "card-selected" : ""}`}
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
  )
}

function Table({
  state,
  playerName,
  onDiscard,
  onDraw,
  loadingStates,
}: {
  state: GameState
  playerName: string
  onDiscard: (index: number) => void
  onDraw: () => void
  loadingStates: {
    drawing: boolean
    discarding: boolean
    cpuMoving: boolean
  }
}) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [discardingCardIndex, setDiscardingCardIndex] = useState<number | null>(null)
  const [showDeckHighlight, setShowDeckHighlight] = useState(false)
  const [hasShownPrompt, setHasShownPrompt] = useState(false)

  const yourPlayerIndex = state.players.findIndex((p) => p?.name === playerName)
  const currentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[currentPlayerIndex]
  const isGameOver = state.game_over

  if (yourPlayerIndex === -1 || !currentPlayer) {
    return <div className="error">Player data not available</div>
  }

  const getPlayerSafe = (index: number) => {
    return state.players[index % state.players.length] ?? { name: "Opponent", hand: [], is_cpu: false }
  }

  const isWinner = (player: Player) => isGameOver && state.winner === player.name

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name
    if (!playerId || playerId !== playerName || hasShownPrompt) return false

    const count = tutorialPromptsShown.get(playerId) || 0
    if (count < 2) {
      tutorialPromptsShown.set(playerId, count + 1)
      return true
    }
    return false
  }

  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      setDiscardingCardIndex(index) // Track the card being discarded
      onDiscard(index)
      setSelectedCardIndex(null)
    } else {
      setSelectedCardIndex(index)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDeckHighlight(true)
      setHasShownPrompt(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (state?.current_player !== yourPlayerIndex) {
      setShowDeckHighlight(false)
      setHasShownPrompt(false)
      setSelectedCardIndex(null)
    }
  }, [state, yourPlayerIndex])

  return (
    <div className="poker-table">
      {/* Top Player (opponent across the table) - Next player after current player */}
      <div
        className={`player-seat top ${currentPlayerIndex === (yourPlayerIndex + 1) % state.players.length ? "active" : ""}`}
      >
        <h3>
          {getPlayerSafe((yourPlayerIndex + 1) % state.players.length).name}
          {getPlayerSafe((yourPlayerIndex + 1) % state.players.length).is_cpu && " (CPU)"}
        </h3>
        <div className="hand horizontal">
          {Array.from({ length: getPlayerSafe((yourPlayerIndex + 1) % state.players.length).hand.length }).map(
            (_, i) => (
              <Card
                key={`top-${i}`}
                facedown={state.mode === "multiplayer" && !isGameOver}
                value={
                  isGameOver ? getPlayerSafe((yourPlayerIndex + 1) % state.players.length).hand[i]?.value || "" : ""
                }
                suit={isGameOver ? getPlayerSafe((yourPlayerIndex + 1) % state.players.length).hand[i]?.suit || "" : ""}
                small={true}
                highlight={isWinner(getPlayerSafe((yourPlayerIndex + 1) % state.players.length))}
              />
            ),
          )}
        </div>
      </div>

      {/* Left Player (to the left in portrait) - Player two positions ahead */}
      {state.players.length > 2 && (
        <div
          className={`player-seat left ${currentPlayerIndex === (yourPlayerIndex + 2) % state.players.length ? "active" : ""}`}
        >
          <h3>
            {getPlayerSafe((yourPlayerIndex + 2) % state.players.length).name}
            {getPlayerSafe((yourPlayerIndex + 2) % state.players.length).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal">
            {Array.from({ length: getPlayerSafe((yourPlayerIndex + 2) % state.players.length).hand.length }).map(
              (_, i) => (
                <Card
                  key={`left-${i}`}
                  facedown={state.mode === "multiplayer" && !isGameOver}
                  value={
                    isGameOver ? getPlayerSafe((yourPlayerIndex + 2) % state.players.length).hand[i]?.value || "" : ""
                  }
                  suit={
                    isGameOver ? getPlayerSafe((yourPlayerIndex + 2) % state.players.length).hand[i]?.suit || "" : ""
                  }
                  small={true}
                  highlight={isWinner(getPlayerSafe((yourPlayerIndex + 2) % state.players.length))}
                />
              ),
            )}
          </div>
        </div>
      )}

      {/* Right Player (to the right in portrait) - Player one position behind */}
      {state.players.length > 3 && (
        <div
          className={`player-seat right ${currentPlayerIndex === (yourPlayerIndex - 1 + state.players.length) % state.players.length ? "active" : ""}`}
        >
          <h3>
            {getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length).name}
            {getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal">
            {Array.from({
              length: getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length).hand.length,
            }).map((_, i) => (
              <Card
                key={`right-${i}`}
                facedown={state.mode === "multiplayer" && !isGameOver}
                value={
                  isGameOver
                    ? getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length).hand[i]
                        ?.value || ""
                    : ""
                }
                suit={
                  isGameOver
                    ? getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length).hand[i]
                        ?.suit || ""
                    : ""
                }
                small={true}
                highlight={isWinner(getPlayerSafe((yourPlayerIndex - 1 + state.players.length) % state.players.length))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="table-center">
        <div
          className={`deck-area ${showDeckHighlight ? "deck-highlight" : ""}`}
          onClick={
            !loadingStates.drawing && currentPlayer.name === playerName && !isGameOver && !state.has_drawn
              ? onDraw
              : undefined
          }
        >
          <div className="deck-count">{state.deck?.length ?? 0}</div>
          {shouldShowPrompt() && <div className="tutorial-prompt">Pick a card from the deck</div>}
          <Card
            facedown
            value=""
            suit=""
            className={loadingStates.drawing ? "card-drawing" : ""}
            style={{
              cursor:
                !loadingStates.drawing && currentPlayer.name === playerName && !isGameOver && !state.has_drawn
                  ? "pointer"
                  : "default",
            }}
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

      {/* Bottom Player (current player) */}
      <div className={`player-seat bottom ${currentPlayerIndex === yourPlayerIndex ? "active" : ""}`}>
        <h2>Your Hand ({yourPlayerIndex !== -1 ? state.players[yourPlayerIndex].name : "You"})</h2>
        <div className="hand">
          {yourPlayerIndex !== -1 &&
            state.players[yourPlayerIndex].hand?.map((card, i) => (
              <Card
                key={`you-${i}`}
                {...card}
                onClick={() => handleCardClick(i)}
                disabled={
                  !state.has_drawn ||
                  currentPlayer.is_cpu ||
                  currentPlayer.name !== state.players[yourPlayerIndex].name ||
                  loadingStates.discarding
                }
                className={discardingCardIndex === i ? "card-discarding" : ""}
                highlight={isWinner(state.players[yourPlayerIndex])}
                selected={selectedCardIndex === i}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

function LobbyView({
  lobby,
  playerName,
  onStartGame,
  onLeave,
  isHost,
}: {
  lobby: LobbyGame
  playerName: string
  onStartGame: () => void
  onLeave: () => void
  isHost: boolean
}) {
  return (
    <div className="new-game-form">
      <h2>Lobby: {lobby.id}</h2>
      <p>Host: {lobby.host}</p>
      <p>
        Players: {lobby.players.length}/{lobby.max_players}
      </p>

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

      {isHost && (
        <button
          onClick={onStartGame}
          disabled={lobby.players.length < 2}
          className={lobby.players.length < 2 ? "disabled-btn" : ""}
        >
          {lobby.players.length < 2 ? "Waiting for more players..." : "Start Game"}
        </button>
      )}

      <button onClick={onLeave} className="quit-btn">
        Leave Lobby
      </button>
    </div>
  )
}

function App() {
  const [state, setState] = useState<GameState | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const [loadingStates, setLoadingStates] = useState({
    drawing: false,
    discarding: false,
    joining: false,
    starting: false,
    cpuMoving: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [currentMenu, setCurrentMenu] = useState<"main" | "multiplayer" | "cpu">("main")
  const [numPlayersSetting, setNumPlayersSetting] = useState(1)
  const [playerName, setPlayerName] = useState("Player")
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [lobby, setLobby] = useState<LobbyGame | null>(null)
  const [lobbies, setLobbies] = useState<LobbyGame[]>([])

  useEffect(() => {
    const savedGame = localStorage.getItem("njukaGame")
    if (savedGame) {
      try {
        const { id, playerName: savedName } = JSON.parse(savedGame)
        if (id && savedName) {
          setGameId(id)
          setPlayerName(savedName)
        }
      } catch (e) {
        localStorage.removeItem("njukaGame")
      }
    }
  }, [])

  useEffect(() => {
    if (state?.id && playerName) {
      localStorage.setItem(
        "njukaGame",
        JSON.stringify({
          id: state.id,
          playerName,
        }),
      )
    } else {
      localStorage.removeItem("njukaGame")
    }
  }, [state, playerName])

  const checkConnection = useCallback(async () => {
    setLoadingStates((prev) => ({ ...prev, starting: true, joining: true }))
    try {
      const isHealthy = await apiService.checkHealth()
      setBackendAvailable(isHealthy)
      if (!isHealthy) {
        setError("Backend service unavailable. Please try again later.")
      }
    } catch (err) {
      setBackendAvailable(false)
      setError("Cannot connect to game server. Please try again later.")
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false, joining: false }))
    }
  }, [setBackendAvailable, setError, setLoadingStates])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  useEffect(() => {
    if (!gameId || !backendAvailable) return

    let intervalId: NodeJS.Timeout
    let currentRetries = 3

    const fetchGameState = async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`)
        if (!res.ok) {
          if (res.status === 404) {
            console.error(`Game ${gameId} not found on backend. Returning to menu.`)
            setError("Game not found or expired. Returning to main menu.")
            setState(null)
            setGameId(null)
            clearInterval(intervalId)
            return
          }
          throw new Error("Network response was not ok")
        }
        const latestState = await res.json()
        setState(latestState)
        currentRetries = 3
      } catch (err) {
        console.error("Failed to fetch game state:", err)
        currentRetries--
        if (currentRetries <= 0) {
          setError("Connection lost. Trying to reconnect...")
          clearInterval(intervalId)
          setTimeout(async () => {
            await checkConnection()
            if (backendAvailable) {
              intervalId = setInterval(fetchGameState, 2000)
              fetchGameState()
            }
            currentRetries = 3
          }, 5000)
        }
      }
    }

    intervalId = setInterval(fetchGameState, 2000)
    fetchGameState()

    return () => clearInterval(intervalId)
  }, [gameId, backendAvailable, checkConnection, setState, setGameId, setError])

  useEffect(() => {
    if (!state || state.game_over || !backendAvailable) return

    const currentPlayer = state.players[state.current_player]
    const isMyTurn = currentPlayer.name === playerName

    if (currentPlayer?.is_cpu && !isMyTurn && !loadingStates.cpuMoving) {
      setLoadingStates((prev) => ({ ...prev, cpuMoving: true }))

      const makeCpuMove = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const updatedStateAfterDraw = await apiService.drawCard(state.id)
          setState(updatedStateAfterDraw)

          await new Promise((resolve) => setTimeout(resolve, 1000))
          const cpuPlayerAfterDraw = updatedStateAfterDraw.players.find((p) => p.name === currentPlayer.name)
          if (cpuPlayerAfterDraw && cpuPlayerAfterDraw.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * cpuPlayerAfterDraw.hand.length)
            const finalState = await apiService.discardCard(updatedStateAfterDraw.id, randomIndex)
            setState(finalState)
          } else {
            const latestState = await fetch(`${API}/game/${state.id}`).then((res) => res.json())
            setState(latestState)
          }
        } catch (err) {
          console.error("CPU move failed:", err)
          try {
            const latestState = await fetch(`${API}/game/${state.id}`).then((res) => res.json())
            setState(latestState)
          } catch (fetchErr) {
            console.error("Failed to fetch game state after CPU move error:", fetchErr)
          }
        } finally {
          setLoadingStates((prev) => ({ ...prev, cpuMoving: false }))
        }
      }

      makeCpuMove()
    }
  }, [state, playerName, backendAvailable, loadingStates.cpuMoving])

  useEffect(() => {
    if (currentMenu !== "multiplayer" || !backendAvailable) return

    const interval = setInterval(() => {
      apiService
        .listLobbies()
        .then(setLobbies)
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  }, [currentMenu, backendAvailable])

  useEffect(() => {
    if (!lobby || !backendAvailable) return

    const fetchLobbyDetails = async () => {
      try {
        const updatedLobby = await apiService.getLobbyDetails(lobby.id)
        if (updatedLobby === null) {
          console.log("Lobby no longer exists. Checking if game started...")
          setLobby(null)
          setError("Lobby disappeared. It might have started or expired. Please check available games.")
          setCurrentMenu("main")
        } else if (updatedLobby.started && updatedLobby.game_id) {
          console.log(`Lobby started. Joining game with ID: ${updatedLobby.game_id}`)
          try {
            const game = await apiService.joinGame(updatedLobby.game_id, playerName)
            setLobby(null)
            setGameId(game.id)
            setState(game)
          } catch (joinErr: any) {
            setError(joinErr.message || "Failed to join game after lobby started.")
            console.error("Failed to join game after lobby started:", joinErr)
            setLobby(null)
            setCurrentMenu("main")
          }
        } else {
          setLobby(updatedLobby)
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while fetching lobby details.")
        console.error("Error fetching lobby details:", err)
      }
    }

    const intervalId = setInterval(fetchLobbyDetails, 3000)

    return () => clearInterval(intervalId)
  }, [lobby, backendAvailable, playerName])

  const discard = async (cardIdx: number) => {
    setLoadingStates((prev) => ({ ...prev, discarding: true }))
    setError(null)
    try {
      if (!state) return
      const newState = await apiService.discardCard(state.id, cardIdx)
      setState(newState)
    } catch (err: any) {
      setError(err.message || "Failed to discard card")
    } finally {
      setLoadingStates((prev) => ({ ...prev, discarding: false }))
    }
  }

  const draw = async () => {
    setLoadingStates((prev) => ({ ...prev, drawing: true }))
    setError(null)
    try {
      if (!state) return
      const newState = await apiService.drawCard(state.id)
      setState(newState)
    } catch (err: any) {
      setError(err.message || "Failed to draw card")
    } finally {
      setLoadingStates((prev) => ({ ...prev, drawing: false }))
    }
  }

  if (!backendAvailable) {
    return (
      <div className="App">
        <div className="error-notice">
          <h3>Service Unavailable</h3>
          <p>We're having trouble connecting to the game server.</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  const handleCreateLobby = async () => {
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)
    try {
      const newLobby = await apiService.createLobby(playerName, numPlayersSetting)
      setLobby(newLobby)
    } catch (err: any) {
      setError(err.message || "Failed to create lobby")
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const handleJoinLobby = async (lobbyId: string) => {
    setLoadingStates((prev) => ({ ...prev, joining: true }))
    setError(null)
    try {
      const joinedLobby = await apiService.joinLobby(lobbyId, playerName)
      setLobby(joinedLobby)
    } catch (err: any) {
      setError(err.message || "Failed to join lobby. Please try again.")
      console.error("Join lobby error:", err)
    } finally {
      setLoadingStates((prev) => ({ ...prev, joining: false }))
    }
  }

  const startGameFromLobby = async () => {
    if (!lobby) return

    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)

    try {
      const gameState = await apiService.startLobbyGame(lobby.id, playerName)
      setLobby(null)
      setGameId(gameState.id)
      setState(gameState)
    } catch (err: any) {
      setError(err.message || "Failed to start game. Please try again.")
      console.error("Start game error:", err)
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const handleStartCpuGame = async () => {
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)
    try {
      const game = await apiService.createNewGame("cpu", playerName, numPlayersSetting)
      setGameId(game.id)
      setState(game)
    } catch (err: any) {
      setError(err.message || "Failed to create game")
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const leaveLobby = () => {
    setLobby(null)
    setCurrentMenu("main")
  }

  const quitGameToMenu = () => {
    setState(null)
    setGameId(null)
    setCurrentMenu("main")
  }

  return (
    <div className="App">
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
            <button onClick={quitGameToMenu} className="quit-btn">
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
                <p>
                  Winner: <strong>{state.winner}</strong>
                </p>
                {state.winner_hand && (
                  <div className="winning-hand">
                    <p>Winning Hand:</p>
                    <div className="hand">
                      {state.winner_hand.map((card, i) => (
                        <Card key={`winner-${i}`} value={card.value} suit={card.suit} highlight={true} />
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={quitGameToMenu}>New Game</button>
              </div>
            </div>
          )}
        </div>
      ) : lobby ? (
        <LobbyView
          lobby={lobby}
          playerName={playerName}
          onStartGame={startGameFromLobby}
          onLeave={leaveLobby}
          isHost={lobby.host === playerName}
        />
      ) : (
        <div className="new-game-form">
          {currentMenu === "main" && (
            <>
              {/* Removed h1 "Njuka King" as it's part of the background image */}
              <label className="sr-only">
                Your Name:
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    const name = e.target.value.trim()
                    if (name.length <= 20) {
                      setPlayerName(name)
                    }
                  }}
                  placeholder="Name......"
                  minLength={2}
                  maxLength={20}
                  required
                />
              </label>
              <button
                onClick={() => setCurrentMenu("multiplayer")}
                disabled={!playerName.trim()}
                className={!playerName.trim() ? "disabled-btn" : ""}
              >
                Multiplayer
              </button>
              <button
                onClick={() => setCurrentMenu("cpu")}
                disabled={!playerName.trim()}
                className={!playerName.trim() ? "disabled-btn" : ""}
              >
                Play Vs CPU
              </button>
            </>
          )}

          {currentMenu === "multiplayer" && (
            <>
              <h2>Multiplayer Lobby</h2>
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button onClick={() => setCurrentMenu("main")}>Back to Main Menu</button>
                <button
                  onClick={() => {
                    apiService
                      .listLobbies()
                      .then(setLobbies)
                      .catch((err) => setError(err.message))
                  }}
                >
                  Refresh Lobbies
                </button>
              </div>

              <label>
                Max Players for New Lobby:
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={numPlayersSetting}
                  onChange={(e) => setNumPlayersSetting(Number(e.target.value))}
                />
              </label>
              <button
                onClick={handleCreateLobby}
                disabled={loadingStates.starting || !playerName.trim() || numPlayersSetting < 2}
                className={loadingStates.starting || !playerName.trim() || numPlayersSetting < 2 ? "disabled-btn" : ""}
              >
                {loadingStates.starting ? "Creating Lobby..." : "Create New Game"}
              </button>

              <div className="divider">OR</div>

              <h3>Available Lobbies</h3>
              <div className="lobby-list">
                {lobbies.length === 0 ? (
                  <p>No available games found. Create a new game to start playing!</p>
                ) : (
                  lobbies.map((lobby) => (
                    <div key={lobby.id} className="lobby-item">
                      <h3>Host: {lobby.host}</h3>
                      <p>Players: {lobby.players.join(", ")}</p>
                      <p>
                        Slots: {lobby.players.length}/{lobby.max_players}
                      </p>
                      <p>Created: {new Date(lobby.created_at).toLocaleString()}</p>
                      <button
                        onClick={() => handleJoinLobby(lobby.id)}
                        disabled={lobby.players.length >= lobby.max_players || loadingStates.joining}
                      >
                        {loadingStates.joining ? "Joining..." : "Join Game"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {currentMenu === "cpu" && (
            <>
              <h2>Play vs CPU</h2>
              <label>
                Number of CPU Players:
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={numPlayersSetting}
                  onChange={(e) => setNumPlayersSetting(Number(e.target.value))}
                />
              </label>
              <button
                onClick={handleStartCpuGame}
                disabled={loadingStates.starting || !playerName.trim()}
                className={loadingStates.starting || !playerName.trim() ? "disabled-btn" : ""}
              >
                {loadingStates.starting ? "Starting Game..." : "Start Game"}
              </button>
              <button onClick={() => setCurrentMenu("main")} className="quit-btn">
                Back to Main Menu
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
