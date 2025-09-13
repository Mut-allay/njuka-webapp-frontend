"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Howl } from "howler"
import "./App.css"

// Import core components (loaded immediately)
import ErrorModal from "./components/ErrorModal"
import LoadingOverlay from "./components/LoadingOverlay"
import { ConnectionStatus } from "./components/ConnectionStatus"

// Import lazy-loaded components
import LazyGameOverModal from "./components/LazyGameOverModal"
import LazyGameTable from "./components/LazyGameTable"

// Import WebSocket context
import { WebSocketProvider } from "./contexts/WebSocketContext"

const API = "https://njuka-webapp-backend.onrender.com"

// 🎵 SOUND MANAGER HOOK - Handles all game audio
const useSoundManager = () => {
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  
  // 🎵 Programmatic fallback sound generator with mobile compatibility
  const createFallbackSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = new AudioContextClass()
        
        // Resume audio context if suspended (required for mobile)
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }
        
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
        oscillator.type = type
        
        // Lower volume for mobile
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
      } catch (error) {
        console.log('Fallback sound generation failed:', error)
      }
    }
  }, [])
  
  // Sound effect instances - memoized to prevent recreation on every render
  const sounds = useMemo(() => ({
    draw: new Howl({
      src: ['/sounds/draw.mp3', '/sounds/draw.wav'],
      volume: 0.3,
      html5: true,
      onloaderror: () => {
        console.log('Draw sound failed to load, using fallback')
        // Create a simple beep sound programmatically as fallback
      }
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
  }), [])

  const createFallbackSoundForType = useCallback((soundType: keyof typeof sounds) => {
    try {
      switch (soundType) {
        case 'draw':
          createFallbackSound(800, 0.2, 'sine') // High bell-like tone
          break
        case 'discard':
          createFallbackSound(400, 0.3, 'sawtooth') // Swoosh-like sound
          break
        case 'shuffle':
          // Multiple quick tones for shuffle effect
          setTimeout(() => createFallbackSound(300, 0.1, 'square'), 0)
          setTimeout(() => createFallbackSound(350, 0.1, 'square'), 100)
          setTimeout(() => createFallbackSound(320, 0.1, 'square'), 200)
          break
        case 'win':
          // Victory chord progression
          createFallbackSound(523, 0.4, 'sine') // C
          setTimeout(() => createFallbackSound(659, 0.4, 'sine'), 200) // E
          setTimeout(() => createFallbackSound(784, 0.6, 'sine'), 400) // G
          break
        case 'button':
          createFallbackSound(1000, 0.1, 'square') // Quick click
          break
      }
    } catch (fallbackError) {
      console.log(`Fallback sound also failed for ${soundType}:`, fallbackError)
    }
  }, [createFallbackSound])

  const playSound = useCallback((soundType: keyof typeof sounds) => {
    if (soundsEnabled) {
      try {
        const sound = sounds[soundType]
        if (sound.state() === 'loaded') {
          // Try to play the sound
          try {
            sound.play()
          } catch (playError) {
            console.log(`Howl sound failed for ${soundType}, using fallback:`, playError)
            // Use fallback sound
            createFallbackSoundForType(soundType)
          }
        } else {
          // Use programmatic fallback sounds for better cross-device compatibility
          createFallbackSoundForType(soundType)
        }
      } catch (error) {
        console.log(`Failed to play ${soundType} sound:`, error)
        // Always try fallback even if main sound fails
        createFallbackSoundForType(soundType)
      }
    }
  }, [soundsEnabled, sounds, createFallbackSoundForType])

  const toggleSounds = useCallback(() => {
    setSoundsEnabled(prev => !prev)
  }, [])

  // Enable audio on first user interaction (required for mobile)
  const enableAudio = useCallback(() => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = new AudioContextClass()
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }
      } catch (error) {
        console.log('Failed to enable audio:', error)
      }
    }
  }, [])

  return { playSound, soundsEnabled, toggleSounds, enableAudio }
}



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
    } catch {
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
    } catch {
      throw new Error("Failed to connect to server. Please try again.")
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API}/health`)
      return response.ok
    } catch {
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
    } catch (error) {
      console.error("API Error:", error)
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
    } catch (error) {
      console.error("API Error:", error)
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
    } catch (error) {
      console.error("API Error:", error)
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
    } catch (error) {
      console.error("API Error:", error)
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
    } catch (error) {
      console.error("API Error:", error)
      throw new Error("Failed to start game")
    }
  },
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

function BottomMenu({ 
  quitGameToMenu, 
  soundsEnabled, 
  toggleSounds, 
  playSound,
  onShowTutorial
}: { 
  quitGameToMenu: () => void
  soundsEnabled: boolean
  toggleSounds: () => void
  playSound: (soundType: 'button') => void
  onShowTutorial: () => void
}) {
  
  const handleButtonClick = (action: () => void) => {
    playSound('button') // 🎵 Play button sound
    
    // 📱 Haptic feedback for button interactions
    if (navigator.vibrate) {
      navigator.vibrate([40, 20, 40]) // Button press pattern
    }
    
    action()
  }

  return (
    <footer className="bottom-menu">
      <button onClick={() => handleButtonClick(() => console.log("Settings clicked"))}>
        Settings
      </button>
      <button onClick={() => handleButtonClick(toggleSounds)}>
        🔊 {soundsEnabled ? 'ON' : 'OFF'} {/* 🎵 NEW: Sound toggle button */}
      </button>
      <button onClick={() => handleButtonClick(onShowTutorial)}>
        Info
      </button>
      <button onClick={() => handleButtonClick(quitGameToMenu)}>
        Quit
      </button>
    </footer>
  );
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
  const [showTutorial, setShowTutorial] = useState(false)
  
  // 🎵 NEW: Initialize sound manager
  const { playSound, soundsEnabled, toggleSounds, enableAudio } = useSoundManager()

  useEffect(() => {
    const savedGame = localStorage.getItem("njukaGame")
    if (savedGame) {
      try {
        const { id, playerName: savedName } = JSON.parse(savedGame)
        if (id && savedName) {
          setGameId(id)
          setPlayerName(savedName)
        }
      } catch {
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

  // 🎵 Play win sound when game ends + haptic feedback
  useEffect(() => {
    if (state?.game_over && state?.winner) {
      playSound('win')
      
      // 📱 Celebration haptic feedback for game end
      if (navigator.vibrate) {
        // Victory pattern: strong-short-strong-short-strong
        navigator.vibrate([200, 100, 200, 100, 200])
      }
    }
  }, [state?.game_over, state?.winner, playSound])

  // 🎵 NEW: Play sounds for other players' moves in multiplayer
  useEffect(() => {
    if (!state || state.game_over) return
    
    const currentPlayer = state.players[state.current_player]
    const isMyTurn = currentPlayer.name === playerName
    
    // Play sounds for other players' moves (both CPU and human)
    if (!isMyTurn) {
      // Play draw sound when it becomes another player's turn
      playSound('draw')
    }
  }, [state?.current_player, state?.has_drawn, playerName, playSound, state])

  // 🎵 NEW: Play discard sound when other players discard
  useEffect(() => {
    if (!state || state.game_over) return
    
    const currentPlayer = state.players[state.current_player]
    const isMyTurn = currentPlayer.name === playerName
    
    // If it's not my turn and the player has drawn, they might discard soon
    if (!isMyTurn && state.has_drawn) {
      // Play discard sound after a short delay to simulate other player's discard
      const timer = setTimeout(() => {
        playSound('discard')
      }, 1000) // 1 second delay to simulate thinking time
      
      return () => clearTimeout(timer)
    }
  }, [state?.has_drawn, state?.current_player, playerName, playSound, state])

  // Show tutorial for first-time users
  useEffect(() => {
    if (!state) return
    const yourPlayer = state.players.find((p) => p?.name === playerName)
    const hasSeenTutorial = localStorage.getItem('njuka-tutorial-seen')
    if (!hasSeenTutorial && yourPlayer?.hand && yourPlayer.hand.length > 0) {
      // Delay tutorial to ensure game is fully loaded
      setTimeout(() => {
        setShowTutorial(true)
        localStorage.setItem('njuka-tutorial-seen', 'true')
      }, 1000)
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
    } catch {
      setBackendAvailable(false)
      setError("Cannot connect to game server. Please try again later.")
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false, joining: false }))
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Enable audio on first user interaction (mobile requirement)
  useEffect(() => {
    const enableAudioOnInteraction = () => {
      enableAudio()
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', enableAudioOnInteraction)
      document.removeEventListener('click', enableAudioOnInteraction)
    }
    
    document.addEventListener('touchstart', enableAudioOnInteraction, { once: true })
    document.addEventListener('click', enableAudioOnInteraction, { once: true })
    
    return () => {
      document.removeEventListener('touchstart', enableAudioOnInteraction)
      document.removeEventListener('click', enableAudioOnInteraction)
    }
  }, [enableAudio])

  useEffect(() => {
    if (!gameId || !backendAvailable) return

    let intervalId: NodeJS.Timeout
    let currentRetries = 3
    let pollInterval = 2000 // Start with 2 seconds
    const maxInterval = 10000 // Max 10 seconds
    const backoffMultiplier = 1.5

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
        pollInterval = 2000 // Reset to normal interval on success
      } catch (err) {
        console.error("Failed to fetch game state:", err)
        currentRetries--
        
        // Exponential backoff
        pollInterval = Math.min(pollInterval * backoffMultiplier, maxInterval)
        
        if (currentRetries <= 0) {
          setError("Connection lost. Trying to reconnect...")
          clearInterval(intervalId)
          setTimeout(async () => {
            await checkConnection()
            if (backendAvailable) {
              pollInterval = 2000 // Reset on reconnect
              intervalId = setInterval(fetchGameState, pollInterval)
              fetchGameState()
            }
            currentRetries = 3
          }, 5000)
        } else {
          // Update interval with backoff
          clearInterval(intervalId)
          intervalId = setInterval(fetchGameState, pollInterval)
        }
      }
    }

    intervalId = setInterval(fetchGameState, pollInterval)
    fetchGameState()

    return () => clearInterval(intervalId)
  }, [gameId, backendAvailable, checkConnection])

  useEffect(() => {
    if (!state || state.game_over || !backendAvailable) return

    const currentPlayer = state.players[state.current_player]
    const isMyTurn = currentPlayer.name === playerName

    if (currentPlayer?.is_cpu && !isMyTurn && !loadingStates.cpuMoving) {
      setLoadingStates((prev) => ({ ...prev, cpuMoving: true }))

      const makeCpuMove = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          // 🎵 NEW: Play draw sound for CPU move
          playSound('draw')
          const updatedStateAfterDraw = await apiService.drawCard(state.id)
          setState(updatedStateAfterDraw)

          await new Promise((resolve) => setTimeout(resolve, 1000))
          const cpuPlayerAfterDraw = updatedStateAfterDraw.players.find((p) => p.name === currentPlayer.name)
          if (cpuPlayerAfterDraw && cpuPlayerAfterDraw.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * cpuPlayerAfterDraw.hand.length)
            // 🎵 NEW: Play discard sound for CPU move
            playSound('discard')
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
  }, [state, playerName, backendAvailable, loadingStates.cpuMoving, playSound])

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
        } catch (joinError: unknown) {
          const errorMessage = joinError instanceof Error ? joinError.message : "Failed to join game after lobby started."
          setError(errorMessage)
          console.error("Failed to join game after lobby started:", joinError)
            setLobby(null)
            setCurrentMenu("main")
          }
        } else {
          setLobby(updatedLobby)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching lobby details."
        setError(errorMessage)
        console.error("Error fetching lobby details:", error)
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to discard card"
      setError(errorMessage)
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to draw card"
      setError(errorMessage)
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

  const handleCreateLobby = async () => {
    playSound('button') // 🎵 NEW: Button sound
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)
    try {
      const newLobby = await apiService.createLobby(playerName, numPlayersSetting)
      setLobby(newLobby)
      playSound('shuffle') // 🎵 NEW: Lobby creation sound
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create lobby"
      setError(errorMessage)
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const handleJoinLobby = async (lobbyId: string) => {
    playSound('button') // 🎵 NEW: Button sound
    setLoadingStates((prev) => ({ ...prev, joining: true }))
    setError(null)
    try {
      const joinedLobby = await apiService.joinLobby(lobbyId, playerName)
      setLobby(joinedLobby)
      playSound('draw') // 🎵 NEW: Join lobby sound
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to join lobby. Please try again."
      setError(errorMessage)
      console.error("Join lobby error:", error)
    } finally {
      setLoadingStates((prev) => ({ ...prev, joining: false }))
    }
  }

  const startGameFromLobby = async () => {
    if (!lobby) return

    playSound('button') // 🎵 NEW: Button sound
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)

    try {
      const gameState = await apiService.startLobbyGame(lobby.id, playerName)
      setLobby(null)
      setGameId(gameState.id)
      setState(gameState)
      playSound('shuffle') // 🎵 NEW: Game start sound
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start game. Please try again."
      setError(errorMessage)
      console.error("Start game error:", error)
    } finally {
      setLoadingStates((prev) => ({ ...prev, starting: false }))
    }
  }

  const handleStartCpuGame = async () => {
    playSound('button') // 🎵 NEW: Button sound
    setLoadingStates((prev) => ({ ...prev, starting: true }))
    setError(null)
    try {
      const game = await apiService.createNewGame("cpu", playerName, numPlayersSetting)
      setGameId(game.id)
      setState(game)
      playSound('shuffle') // 🎵 NEW: Game start sound
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create game"
      setError(errorMessage)
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

  const handleShowTutorial = () => {
    setShowTutorial(true)
  }

  const handleCloseTutorial = () => {
    setShowTutorial(false)
  }

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

      {state ? (
        <div className="game-container">
          <div>
            
          </div>
          <LazyGameTable
            state={state}
            playerName={playerName}
            onDiscard={discard}
            onDraw={draw}
            loadingStates={loadingStates}
            playSound={playSound} // 🎵 NEW: Pass sound function to GameTable
            showTutorial={showTutorial}
            onCloseTutorial={handleCloseTutorial}
          />
          <BottomMenu 
            quitGameToMenu={quitGameToMenu} 
            soundsEnabled={soundsEnabled}
            toggleSounds={toggleSounds}
            playSound={playSound} // 🎵 NEW: Pass sound props to BottomMenu
            onShowTutorial={handleShowTutorial}
          />
          <LazyGameOverModal
            isOpen={!!state.game_over}
            onClose={quitGameToMenu}
            winner={state.winner || 'Unknown'}
            winnerHand={state.winner_hand}
            onNewGame={quitGameToMenu}
          />
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
                Play vs CPU
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
                      .catch((error) => {
                      const errorMessage = error instanceof Error ? error.message : "Failed to refresh lobbies"
                      setError(errorMessage)
                    })
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
    </WebSocketProvider>
  )
}

export default App