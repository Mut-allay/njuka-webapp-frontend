import React, { useState, useEffect } from 'react'
import Card from './Card'
import './GameTable.css'

// Types (copied from App.tsx for now - in a real app these would be in a shared types file)
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

export interface GameTableProps {
  state: GameState
  playerName: string
  onDiscard: (index: number) => void
  onDraw: () => void
  loadingStates: {
    drawing: boolean
    discarding: boolean
    cpuMoving: boolean
  }
  playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void
  showTutorial: boolean
  onCloseTutorial: () => void
}

export const GameTable: React.FC<GameTableProps> = ({
  state,
  playerName,
  onDiscard,
  onDraw,
  loadingStates,
  playSound
}) => {
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
      playSound('shuffle')
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
  }, [state?.id, isGameOver, state, yourPlayer?.hand.length, playSound])

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
        
        // Play discard sound
        playSound('discard')
        
        // Enhanced haptic feedback for card discard
        if (navigator.vibrate) {
          // Stronger vibration pattern for discard action
          navigator.vibrate([100, 50, 100]) // Strong-short-strong pattern
        }
        
        // Create animated overlay card positioned exactly where the original card is
        setAnimatingCard({
          card,
          position: { x: rect.left, y: rect.top }
        })
        
        // Mark this card as discarding to prevent layout shift
        setDiscardingCardIndex(index)
        
        // Mobile-first optimized animation duration
        const animationDuration = window.innerWidth <= 768 ? 1800 : 1200;
        setTimeout(() => {
          onDiscard(index)
          setDiscardingCardIndex(null)
          setAnimatingCard(null)
        }, animationDuration)
      }
      setSelectedCardIndex(null)
    } else {
      setSelectedCardIndex(index)
      
      // Enhanced haptic feedback for card selection
      if (navigator.vibrate) {
        // Gentle vibration for selection
        navigator.vibrate([30, 20, 30]) // Gentle-short-gentle pattern
      }
    }
  }

  // Enhanced draw animation handling
  const handleDraw = () => {
    // Play draw sound
    playSound('draw')
    
    // Enhanced haptic feedback for card draw
    if (navigator.vibrate) {
      // Satisfying vibration pattern for draw action
      navigator.vibrate([80, 30, 80]) // Medium-short-medium pattern
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
    </div>
  )
}

export default GameTable
