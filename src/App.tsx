"use client"

import React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Howl } from "howler"
import "./App.css"

const API = "https://njuka-webapp-backend.onrender.com"

// 🎵 SOUND MANAGER HOOK - Handles all game audio
const useSoundManager = () => {
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  
  // 🎵 Programmatic fallback sound generator
  const createFallbackSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
        oscillator.type = type
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
        
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

  const playSound = useCallback((soundType: keyof typeof sounds) => {
    if (soundsEnabled) {
      try {
        const sound = sounds[soundType]
        if (sound.state() === 'loaded') {
          sound.play()
        } else {
          // Use programmatic fallback sounds for better cross-device compatibility
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
        }
      } catch (error) {
        console.log(`Failed to play ${soundType} sound:`, error)
        // Always try fallback even if main sound fails
        try {
          switch (soundType) {
            case 'draw':
              createFallbackSound(800, 0.2, 'sine')
              break
            case 'discard':
              createFallbackSound(400, 0.3, 'sawtooth')
              break
            case 'shuffle':
              setTimeout(() => createFallbackSound(300, 0.1, 'square'), 0)
              setTimeout(() => createFallbackSound(350, 0.1, 'square'), 100)
              setTimeout(() => createFallbackSound(320, 0.1, 'square'), 200)
              break
            case 'win':
              createFallbackSound(523, 0.4, 'sine')
              setTimeout(() => createFallbackSound(659, 0.4, 'sine'), 200)
              setTimeout(() => createFallbackSound(784, 0.6, 'sine'), 400)
              break
            case 'button':
              createFallbackSound(1000, 0.1, 'square')
              break
          }
        } catch (fallbackError) {
          console.log(`Fallback sound also failed for ${soundType}:`, fallbackError)
        }
      }
    }
  }, [soundsEnabled, sounds, createFallbackSound])

  const toggleSounds = useCallback(() => {
    setSoundsEnabled(prev => !prev)
  }, [])

  return { playSound, soundsEnabled, toggleSounds }
}

// ⬇️ ADDED A COMPLETE MAP OF ALL CARD IMAGES ⬇️
const cardImageMap: { [key: string]: string } = {
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

const Card = React.memo(function Card({
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
  ...props
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
  [key: string]: unknown
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [touchStart, setTouchStart] = useState(0)

  // ⬇️ REFACTORED LOGIC TO USE THE MAP ⬇️
  const imageUrl = cardImageMap[value + suit];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!onClick || disabled) return
    
    const touchEnd = e.changedTouches[0].clientX
    if (Math.abs(touchStart - touchEnd) > 30) {
      // Swipe detected
      onClick()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!onClick || disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  if (facedown) {
    return (
      <div
        className={`card facedown ${className} ${small ? "small-card" : ""}`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="img"
        aria-label="Facedown card"
        {...props}
      >
        <div className="card-back"></div>
      </div>
    )
  }

  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black"
  const cardLabel = `${value} of ${suit}${selected ? ", selected" : ""}${highlight ? ", winning card" : ""}`
  
  return (
    <div
      className={`card ${suitColor} ${className} ${highlight ? "highlight-card" : ""} ${small ? "small-card" : ""} ${isHovered ? "card-hover" : ""} ${selected ? "card-selected" : ""}`}
      onClick={!disabled ? onClick : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyPress}
      style={disabled ? { opacity: 0.7, cursor: "not-allowed", ...style } : style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={cardLabel}
      aria-pressed={selected}
      aria-disabled={disabled}
      {...props}
    >
      <div className="card-inner">
        {imageUrl ? (
          <img 
            src={imageUrl}
            alt={`${value} of ${suit}`}
            className="card-face-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <>
            <span className="card-value">{value}</span>
            <span className="card-suit">{suit}</span>
          </>
        )}
      </div>
    </div>
  )
})

function Table({
  state,
  playerName,
  onDiscard,
  onDraw,
  loadingStates,
  playSound, // 🎵 NEW: Sound function passed from parent
  showTutorial,
  onCloseTutorial
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
  playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void // 🎵 NEW: Sound prop
  showTutorial: boolean
  onCloseTutorial: () => void
}) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [showDeckHighlight, setShowDeckHighlight] = useState(false)
  const [discardingCardIndex, setDiscardingCardIndex] = useState<number | null>(null)
  const [animatingCard, setAnimatingCard] = useState<{card: CardType, position: {x: number, y: number}} | null>(null)
  const [isShuffling, setIsShuffling] = useState(false)
  const [dealingCards, setDealingCards] = useState<boolean[]>([])
  const [drawingCard, setDrawingCard] = useState(false)

  const yourPlayer = state.players.find((p) => p?.name === playerName)
  const currentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[currentPlayerIndex]
  const isGameOver = state.game_over

  // All useEffect hooks must be called before any early returns
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDeckHighlight(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])


  useEffect(() => {
    if (state?.current_player !== state?.players.findIndex((p) => p?.name === playerName)) {
      setShowDeckHighlight(false)
      setSelectedCardIndex(null)
      setDiscardingCardIndex(null)
      setAnimatingCard(null)
      setDrawingCard(false)
    }
  }, [state, playerName])

  // Trigger shuffle animation at game start
  useEffect(() => {
    if (state && !isGameOver && state.deck.length > 0 && yourPlayer?.hand.length === 0) {
      setIsShuffling(true)
      playSound('shuffle') // 🎵 NEW: Play shuffle sound
      setTimeout(() => {
        setIsShuffling(false)
        // Start dealing animation after shuffle
        const handSize = yourPlayer?.hand.length || 0
        if (handSize > 0) {
          setDealingCards(new Array(handSize).fill(true))
          setTimeout(() => setDealingCards([]), handSize * 250 + 2200)
        }
      }, window.innerWidth <= 768 ? 2000 : 2000)
    }
  }, [state?.id, isGameOver, state, yourPlayer?.hand.length, playSound]) // 🎵 NEW: Added playSound dependency

  // Early return after all hooks
  if (!yourPlayer || !currentPlayer) {
    return <div className="error">Player data not available</div>
  }

  const getPlayerSafe = (index: number) => {
    return state.players[index] ?? { name: "Player", hand: [], is_cpu: false }
  }

  const isWinner = (player: Player) => isGameOver && state.winner === player.name

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name
    // Show prompt when it's the player's turn and they haven't drawn yet
    return playerId === playerName && !state.has_drawn && !isGameOver
  }

  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      const cardElement = document.querySelector(`[data-card-index="${index}"]`) as HTMLElement
      if (cardElement && yourPlayer) {
        const rect = cardElement.getBoundingClientRect()
        const card = yourPlayer.hand[index]
        
        // 🎵 NEW: Play discard sound
        playSound('discard')
        
        // 📱 NEW: Haptic feedback for mobile
        if (navigator.vibrate) {
          navigator.vibrate(50) // Short vibration for card discard
        }
        
        // Create animated overlay card positioned exactly where the original card is
        setAnimatingCard({
          card,
          position: { x: rect.left, y: rect.top }
        })
        
        // Mark this card as discarding to prevent layout shift
        setDiscardingCardIndex(index)
        
        // Mobile-first optimized animation duration
        const animationDuration = window.innerWidth <= 768 ? 1800 : 1200; // Match updated mobile portrait timing
        setTimeout(() => {
          onDiscard(index)
          setDiscardingCardIndex(null)
          setAnimatingCard(null)
        }, animationDuration)
      }
      setSelectedCardIndex(null)
    } else {
      setSelectedCardIndex(index)
      
      // 📱 NEW: Haptic feedback for card selection
      if (navigator.vibrate) {
        navigator.vibrate(25) // Very short vibration for card selection
      }
    }
  }

  // Enhanced draw animation handling
  const handleDraw = () => {
    // 🎵 NEW: Play draw sound
    playSound('draw')
    
    // 📱 NEW: Haptic feedback for card draw
    if (navigator.vibrate) {
      navigator.vibrate(75) // Medium vibration for card draw
    }
    
    setDrawingCard(true)
    onDraw()
    // Reset drawing state after mobile-optimized animation completes
    setTimeout(() => {
      setDrawingCard(false)
    }, window.innerWidth <= 768 ? 1800 : 1400)
  }

  const canDraw = !loadingStates.drawing && currentPlayer.name === playerName && !isGameOver && !state.has_drawn

  return (
    <div className="poker-table">
      {/* Screen reader announcements */}
      <div 
        id="game-announcements" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        {isGameOver && state.winner && `Game over! ${state.winner} wins!`}
        {!isGameOver && currentPlayer.name === playerName && !state.has_drawn && "It's your turn. Draw a card from the deck."}
        {!isGameOver && currentPlayer.name === playerName && state.has_drawn && "Select a card to discard."}
        {!isGameOver && currentPlayer.name !== playerName && `${currentPlayer.name} is playing.`}
      </div>
      
      {/* Top Player */}
      {state.players.length > 1 && (
        <div 
          className={`player-seat top ${currentPlayerIndex === 1 ? "active" : ""}`}
          role="region"
          aria-label={`Player ${getPlayerSafe(1).name}${getPlayerSafe(1).is_cpu ? " (CPU)" : ""}${currentPlayerIndex === 1 ? ", current turn" : ""}`}
        >
          <h3>
            {getPlayerSafe(1).name}
            {getPlayerSafe(1).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${getPlayerSafe(1).name}'s hand with ${getPlayerSafe(1).hand.length} cards`}>
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

      {/* Left Player */}
      {state.players.length > 2 && (
        <div 
          className={`player-seat left ${currentPlayerIndex === 2 ? "active" : ""}`}
          role="region"
          aria-label={`Player ${getPlayerSafe(2).name}${getPlayerSafe(2).is_cpu ? " (CPU)" : ""}${currentPlayerIndex === 2 ? ", current turn" : ""}`}
        >
          <h3>
            {getPlayerSafe(2).name}
            {getPlayerSafe(2).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${getPlayerSafe(2).name}'s hand with ${getPlayerSafe(2).hand.length} cards`}>
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

      {/* Right Player */}
      {state.players.length > 3 && (
        <div 
          className={`player-seat right ${currentPlayerIndex === 3 ? "active" : ""}`}
          role="region"
          aria-label={`Player ${getPlayerSafe(3).name}${getPlayerSafe(3).is_cpu ? " (CPU)" : ""}${currentPlayerIndex === 3 ? ", current turn" : ""}`}
        >
          <h3>
            {getPlayerSafe(3).name}
            {getPlayerSafe(3).is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${getPlayerSafe(3).name}'s hand with ${getPlayerSafe(3).hand.length} cards`}>
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
          className={`deck-area ${showDeckHighlight ? "deck-highlight" : ""} ${isShuffling ? "deck-shuffling" : ""}`}
          onClick={canDraw ? handleDraw : undefined}
          role="button"
          tabIndex={canDraw ? 0 : -1}
          aria-label={`Deck with ${state.deck?.length ?? 0} cards remaining${canDraw ? ", click to draw a card" : ""}`}
          onKeyDown={(e) => {
            if (canDraw && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              handleDraw()
            }
          }}
        >
          <div className="deck-count" aria-hidden="true">{state.deck?.length ?? 0}</div>
          {shouldShowPrompt() && <div className="tutorial-prompt" role="status" aria-live="polite">Pick a card</div>}
          <Card
            facedown
            value=""
            suit=""
            className={`${drawingCard || loadingStates.drawing ? "card-drawing" : ""} ${isShuffling ? "card-shuffling" : ""}`}
            style={{
              cursor: canDraw ? "pointer" : "default",
            }}
          />
        </div>

        <div className="discard-area" role="region" aria-label="Discard pile">
          {state.pot?.length > 0 ? (
            <Card {...state.pot[state.pot.length - 1]} className="discard-top" />
          ) : (
            <div className="discard-empty" aria-label="Empty discard pile">Empty</div>
          )}
        </div>
      </div>

      {/* Bottom Player (current player) */}
      <div
        className={`player-seat bottom ${currentPlayerIndex === state.players.findIndex((p) => p?.name === playerName) ? "active" : ""}`}
        role="region"
        aria-label={`Your hand${currentPlayerIndex === state.players.findIndex((p) => p?.name === playerName) ? ", current turn" : ""}`}
      >
        <h4 className="player-name">{yourPlayer.name}</h4>
        <div className="hand" aria-label={`Your hand with ${yourPlayer.hand?.length || 0} cards`}>
          {yourPlayer.hand?.map((card, i) => {
            const isDealing = dealingCards[i] || false
            const delayClass = isDealing ? `deal-delay-${Math.min(i + 1, 7)}` : ""
            
            return (
              <Card
                key={`you-${i}`}
                {...card}
                onClick={() => handleCardClick(i)}
                disabled={
                  !state.has_drawn ||
                  currentPlayer.is_cpu ||
                  currentPlayer.name !== yourPlayer.name ||
                  loadingStates.discarding ||
                  discardingCardIndex !== null ||
                  isDealing
                }
                className={`${discardingCardIndex === i ? "card-discarding" : ""} ${isDealing ? `card-dealing ${delayClass}` : ""}`}
                highlight={isWinner(yourPlayer)}
                selected={selectedCardIndex === i}
                style={{}}
                data-card-index={i}
              />
            )
          })}
        </div>
      </div>
      
      {/* Animated overlay card for discard effect */}
      {animatingCard && (
        <Card
          {...animatingCard.card}
          className="discard-animation-overlay"
          style={{
            left: animatingCard.position.x,
            top: animatingCard.position.y,
            width: '70px', // Match card width
            height: '100px', // Match card height
          }}
        />
      )}

      {/* Tutorial overlay for first-time users */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-content">
            <h3>How to Play Njuka King</h3>
            <div className="tutorial-steps">
              <div className="tutorial-step">
                <div className="tutorial-icon">🎯</div>
                <p><strong>Objective:</strong> Be the first to get a winning hand of 4 cards</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">🃏</div>
                <p><strong>Winning Hand:</strong> One pair + two cards in sequence (followers)</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">👆</div>
                <p><strong>Draw a card:</strong> Tap the deck to draw a card</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">👆</div>
                <p><strong>Select a card:</strong> Tap a card in your hand to select it</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">👆</div>
                <p><strong>Discard:</strong> Tap the selected card again to discard it</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">📱</div>
                <p><strong>Mobile:</strong> Swipe cards to discard them quickly</p>
              </div>
              <div className="tutorial-step">
                <div className="tutorial-icon">💡</div>
                <p><strong>Tip:</strong> You can win with 3 cards + the top discard pile card!</p>
              </div>
            </div>
            <button 
              onClick={onCloseTutorial}
              className="tutorial-close"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
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
    playSound('button') // 🎵 NEW: Play button sound
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
  const { playSound, soundsEnabled, toggleSounds } = useSoundManager()

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

  // 🎵 NEW: Play win sound when game ends
  useEffect(() => {
    if (state?.game_over && state?.winner) {
      playSound('win')
    }
  }, [state?.game_over, state?.winner, playSound])

  // 🎵 NEW: Play sounds for other players' moves in multiplayer
  useEffect(() => {
    if (!state || state.game_over) return
    
    const currentPlayer = state.players[state.current_player]
    const isMyTurn = currentPlayer.name === playerName
    
    // If it's not my turn and not a CPU, play sounds for other human players
    if (!isMyTurn && !currentPlayer?.is_cpu) {
      // Play draw sound when it becomes another player's turn
      playSound('draw')
    }
  }, [state, playerName, playSound])

  // Show tutorial for first-time users
  useEffect(() => {
    if (!state) return
    const yourPlayer = state.players.find((p) => p?.name === playerName)
    const hasSeenTutorial = localStorage.getItem('njuka-tutorial-seen')
    if (!hasSeenTutorial && yourPlayer?.hand && yourPlayer.hand.length > 0) {
      setShowTutorial(true)
      localStorage.setItem('njuka-tutorial-seen', 'true')
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
          <div>
            
          </div>
          <Table
            state={state}
            playerName={playerName}
            onDiscard={discard}
            onDraw={draw}
            loadingStates={loadingStates}
            playSound={playSound} // 🎵 NEW: Pass sound function to Table
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
  )
}

export default App