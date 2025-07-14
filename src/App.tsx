"use client"

import type React from "react"

import { useState, useEffect } from "react"
import "./App.css"

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
  game_id?: string // Add game_id to LobbyGame type
}

const tutorialPromptsShown = new Map<string, number>()

const apiService = {
  createNewGame: async (mode: "cpu" | "multiplayer", playerName: string, cpuCount = 1): Promise<GameState> => {
    try {
      const response = await fetch(
        `${API}/new_game?mode=${mode}&player_name=${encodeURIComponent(playerName)}&cpu_count=${cpuCount}`,
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
          return [] // Return empty array instead of error
        }
        throw new Error("Failed to fetch lobbies")
      }
      const data = await response.json()
      return data.lobbies || []
    } catch (err) {
      console.error("API Error:", err)
      return [] // Return empty array on error
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
        return null // Return null if lobby not found (game started or lobby expired)
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
  small = false,
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
        className={`card facedown ${className} ${small ? "small-card" : ""}`}
        style={style}
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
      className={`card ${suitColor} ${className} ${highlight ? "highlight-card" : ""} ${small ? "small-card" : ""} ${isHovered ? "card-hover" : ""} ${selected ? "card-selected" : ""}`}
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
  const [showDeckHighlight, setShowDeckHighlight] = useState(false)
  const [hasShownPrompt, setHasShownPrompt] = useState(false)

  const yourPlayer = state.players.find((p) => p?.name === playerName)
  const currentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[currentPlayerIndex]
  const isGameOver = state.game_over

  if (!yourPlayer || !currentPlayer) {
    return <div className="error">Player data not available</div>
  }

  const getPlayerSafe = (index: number) => {
    return state.players[index] ?? { name: "Player", hand: [], is_cpu: false }
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
    if (state?.current_player !== state?.players.findIndex((p) => p?.name === playerName)) {
      setShowDeckHighlight(false)
      setHasShownPrompt(false)
      setSelectedCardIndex(null)
    }
  }, [state])

  return (
    <div className="poker-table">
      {/* Top Player (opponent across the table) */}
      {state.players.length > 1 && (
        <div className={`player-seat top ${currentPlayerIndex === 1 ? "active" : ""}`}>
          <h3>
            {getPlayerSafe(1).name}
            {getPlayerSafe(1).is_cpu && " (CPU)"}
          </h3>
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

      {/* Left Player (to the left in portrait) */}
      {state.players.length > 2 && (
        <div className={`player-seat left ${currentPlayerIndex === 2 ? "active" : ""}`}>
          <h3>
            {getPlayerSafe(2).name}
            {getPlayerSafe(2).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal">
            {getPlayerSafe(2).hand.map((card, i) => (
              <Card
                key={`left-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(getPlayerSafe(2))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Right Player (to the right in portrait) */}
      {state.players.length > 3 && (
        <div className={`player-seat right ${currentPlayerIndex === 3 ? "active" : ""}`}>
          <h3>
            {getPlayerSafe(3).name}
            {getPlayerSafe(3).is_cpu && " (CPU)"}
          </h3>
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
      <div
        className={`player-seat bottom ${currentPlayerIndex === state.players.findIndex((p) => p?.name === playerName) ? "active" : ""}`}
      >
        <h2>Your Hand ({yourPlayer.name})</h2>
        <div className="hand">
          {yourPlayer.hand?.map((card, i) => (
            <Card
              key={`you-${i}`}
              {...card}
              onClick={() => handleCardClick(i)}
              disabled={
                !state.has_drawn ||
                currentPlayer.is_cpu ||
                currentPlayer.name !== yourPlayer.name ||
                loadingStates.discarding
              }
              className={loadingStates.discarding ? "card-discarding" : ""}
              highlight={isWinner(yourPlayer)}
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
  const [gameMode, setGameMode] = useState<"cpu" | "multiplayer">("cpu")
  const [cpuCount, setCpuCount] = useState(1)
  const [playerName, setPlayerName] = useState("Player")
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [joinGameId, setJoinGameId] = useState("")
  const [lobby, setLobby] = useState<LobbyGame | null>(null)
  const [lobbies, setLobbies] = useState<LobbyGame[]>([])
  const [showLobbyList, setShowLobbyList] = useState(false)

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

  useEffect(() => {
    const checkConnection = async () => {
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
    }
    checkConnection()
  }, [])

  useEffect(() => {
    if (!gameId || !backendAvailable) return

    let retries = 3
    let intervalId: NodeJS.Timeout

    const fetchGameState = async () => {
      try {
        const res = await fetch(`${API}/game/${gameId}`)
        if (!res.ok) throw new Error("Network response was not ok")
        const latestState = await res.json()
        setState(latestState)
        retries = 3
      } catch (err) {
        console.error("Failed to fetch game state:", err)
        retries--
        if (retries <= 0) {
          setError("Connection lost. Trying to reconnect...")
          setTimeout(() => {
            checkConnection()
            retries = 3
          }, 5000)
        }
      }
    }

    const checkConnection = async () => {
      const isHealthy = await apiService.checkHealth()
      setBackendAvailable(isHealthy)
      if (isHealthy) {
        setError(null)
        intervalId = setInterval(fetchGameState, 5000)
        fetchGameState()
      }
    }

    intervalId = setInterval(fetchGameState, 2000)
    fetchGameState()

    return () => clearInterval(intervalId)
  }, [gameId, backendAvailable])

  useEffect(() => {
    if (!state || state.game_over || !backendAvailable) return

    const currentPlayer = state.players[state.current_player]
    if (currentPlayer?.is_cpu && currentPlayer.name !== playerName) {
      setLoadingStates((prev) => ({ ...prev, cpuMoving: true }))

      const makeCpuMove = async () => {
        try {
          const afterDrawState = await apiService.drawCard(state.id)

          if (afterDrawState.has_drawn && afterDrawState.players[state.current_player].hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * afterDrawState.players[state.current_player].hand.length)
            await apiService.discardCard(state.id, randomIndex)
          }

          const updatedState = await apiService
            .checkHealth()
            .then(() => fetch(`${API}/game/${state.id}`))
            .then((res) => res.json())
          setState(updatedState)
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

      const timer = setTimeout(makeCpuMove, 1500)
      return () => {
        clearTimeout(timer)
        setLoadingStates((prev) => ({ ...prev, cpuMoving: false }))
      }
    }
  }, [state, playerName, backendAvailable])

  // Temporary test in your frontend
  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => console.log("Backend connection:", res.ok))
      .catch((err) => console.error("Connection failed:", err))
  }, [])

  useEffect(() => {
    if (!showLobbyList || !backendAvailable) return

    const interval = setInterval(() => {
      apiService
        .listLobbies()
        .then(setLobbies)
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  }, [showLobbyList, backendAvailable])

  // New useEffect for polling lobby details when in a lobby
  useEffect(() => {
    if (!lobby || !backendAvailable) return

    const fetchLobbyDetails = async () => {
      try {
        const updatedLobby = await apiService.getLobbyDetails(lobby.id)
        if (updatedLobby === null) {
          // Lobby no longer exists, it might have been cleaned up or game started
          console.log("Lobby no longer exists. Checking if game started...")
          // If the lobby is gone, and we were in a lobby, try to join the game with the same ID
          // This assumes the game ID will be the same as the lobby ID, which is not true with current backend.
          // We need to rely on the `game_id` field in the lobby object.
          // If the lobby is null, it means we missed the update where game_id was set.
          // For now, if lobby is null, we just exit the lobby view.
          setLobby(null)
          setError("Lobby disappeared. It might have started or expired. Please check available games.")
        } else if (updatedLobby.started && updatedLobby.game_id) {
          // Lobby has started and has a game_id, join the game
          console.log(`Lobby started. Joining game with ID: ${updatedLobby.game_id}`)
          try {
            const game = await apiService.joinGame(updatedLobby.game_id, playerName)
            setLobby(null) // Exit lobby view
            setGameId(game.id)
            setState(game) // Transition to game view
          } catch (joinErr: any) {
            setError(joinErr.message || "Failed to join game after lobby started.")
            console.error("Failed to join game after lobby started:", joinErr)
            setLobby(null) // Ensure we exit the lobby view even if game join fails
          }
        } else {
          // Lobby still exists and hasn't started, update state
          setLobby(updatedLobby)
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while fetching lobby details.")
        console.error("Error fetching lobby details:", err)
      }
    }

    const intervalId = setInterval(fetchLobbyDetails, 3000) // Poll every 3 seconds

    return () => clearInterval(intervalId) // Clean up on unmount or lobby change
  }, [lobby, backendAvailable, playerName]) // Add playerName to dependencies

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
        <h1>Njuka King</h1>
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

  const createLobby = async () => {
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)
    try {
      const newLobby = await apiService.createLobby(playerName, 4)
      setLobby(newLobby)
    } catch (err: any) {
      setError(err.message || "Failed to create lobby")
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const joinLobby = async (lobbyId: string) => {
    setLoadingStates((prev) => ({ ...prev, joining: true }))
    setError(null)
    try {
      const joinedLobby = await apiService.joinLobby(lobbyId, playerName)
      setLobby(joinedLobby)
      setShowLobbyList(false)
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
      const gameState = await apiService.startLobbyGame(lobby.id, playerName) // Pass playerName as host_name
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

  const leaveLobby = () => {
    setLobby(null)
    setShowLobbyList(false)
  }

  return (
    <div className="App">
      <h1>Njuka King</h1>

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
                setState(null)
                setGameId(null)
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
                <button
                  onClick={() => {
                    setState(null)
                    setGameId(null)
                  }}
                >
                  New Game
                </button>
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
      ) : showLobbyList ? (
        <div className="new-game-form">
          <h2>Available Games</h2>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <button onClick={() => setShowLobbyList(false)}>Back to Menu</button>
            <button
              onClick={() => {
                apiService
                  .listLobbies()
                  .then(setLobbies)
                  .catch((err) => setError(err.message))
              }}
            >
              Refresh List
            </button>
          </div>

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
                    onClick={() => joinLobby(lobby.id)}
                    disabled={lobby.players.length >= lobby.max_players || loadingStates.joining}
                  >
                    {loadingStates.joining ? "Joining..." : "Join Game"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="new-game-form">
          <h2>Start or Join a Game</h2>
          <label>
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
                onChange={(e) => setJoinGameId(e.target.value)}
                placeholder="Enter game ID"
              />
            </label>
            <button
              disabled={loadingStates.joining || !playerName.trim() || !joinGameId.trim()}
              onClick={async () => {
                setLoadingStates((prev) => ({ ...prev, joining: true }))
                setError(null)
                try {
                  const game = await apiService.joinGame(joinGameId, playerName)
                  setGameId(game.id)
                  setState(game)
                } catch (err: any) {
                  setError(err.message || "Failed to join game")
                } finally {
                  setLoadingStates((prev) => ({ ...prev, joining: false }))
                }
              }}
              className="join-btn"
            >
              {loadingStates.joining ? "Joining..." : "Join Game"}
            </button>
          </div>

          <div className="divider">OR</div>

          <h3>Create New Game</h3>
          <label>
            Game Mode:
            <select value={gameMode} onChange={(e) => setGameMode(e.target.value as "cpu" | "multiplayer")}>
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
                onChange={(e) => setCpuCount(Number(e.target.value))}
              />
            </label>
          )}
          {gameMode === "multiplayer" && (
            <label>
              Max Players:
              <input
                type="number"
                min={2}
                max={6}
                value={cpuCount}
                onChange={(e) => setCpuCount(Number(e.target.value))}
              />
            </label>
          )}
          <button
            disabled={loadingStates.starting || !playerName.trim()}
            onClick={async () => {
              if (gameMode === "multiplayer") {
                await createLobby()
              } else {
                setLoadingStates((prev) => ({ ...prev, starting: true }))
                setError(null)
                try {
                  const game = await apiService.createNewGame(gameMode, playerName, cpuCount)
                  setGameId(game.id)
                  setState(game)
                } catch (err: any) {
                  setError(err.message || "Failed to create game")
                } finally {
                  setLoadingStates((prev) => ({ ...prev, starting: false }))
                }
              }
            }}
            className="new-game-btn"
          >
            {loadingStates.starting
              ? "Creating..."
              : gameMode === "multiplayer"
                ? "Create Multiplayer Lobby"
                : "Start New Game"}
          </button>

          <div className="divider">OR</div>

          <button
            onClick={() => {
              setShowLobbyList(true)
              apiService
                .listLobbies()
                .then(setLobbies)
                .catch((err) => setError(err.message))
            }}
          >
            Browse Multiplayer Games
          </button>
        </div>
      )}
    </div>
  )
}

export default App
