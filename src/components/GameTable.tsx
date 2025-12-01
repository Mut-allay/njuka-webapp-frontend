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
  
  // ⬇️ MODIFIED: This state will hold coordinates for the discard animation
  const [animatingDiscard, setAnimatingDiscard] = useState<{
    card: CardType,
    start: { x: number, y: number, width: number, height: number },
    destination: { x: number, y: number }
  } | null>(null)
  
  // ⬇️ ADDED: New state for the draw animation overlay
  const [animatingDraw, setAnimatingDraw] = useState<{
    start: { x: number, y: number, width: number, height: number },
    destination: { x: number, y: number },
    cardIndex: number // Track which card index is being drawn
  } | null>(null)

  const [isShuffling, setIsShuffling] = useState(false)
  const [dealingCards, setDealingCards] = useState<boolean[]>([])
  // const [drawingCard, setDrawingCard] = useState(false) // ⬅️ REMOVED: We now use animatingDraw

  const yourPlayer = state.players.find((p) => p?.name === playerName)
  const gameCurrentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[gameCurrentPlayerIndex]
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
      setAnimatingDiscard(null)
      setAnimatingDraw(null)
      // setDrawingCard(false) // ⬅️ REMOVED
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

  // Get the current player's index in the players array
  const currentPlayerIndex = state.players.findIndex((p) => p?.name === playerName)
  
  // Create seat mapping: current player is always bottom, others positioned relative to them
  const getSeatPlayers = () => {
    const players = state.players
    const currentIndex = currentPlayerIndex
    
    if (currentIndex === -1) return { top: null, left: null, right: null, bottom: null }
    
    const bottom = players[currentIndex] // Current player always on bottom
    
    // Other players positioned relative to current player
    const otherPlayers = players.filter((_, index) => index !== currentIndex)
    
    return {
      top: otherPlayers[0] || null,      // First other player on top
      left: otherPlayers[1] || null,     // Second other player on left  
      right: otherPlayers[2] || null,    // Third other player on right
      bottom: bottom
    }
  }

  const seatPlayers = getSeatPlayers()

  const isWinner = (player: Player) => isGameOver && state.winner === player.name

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name
    // Show prompt when it's the player's turn and they haven't drawn yet
    return playerId === playerName && !state.has_drawn && !isGameOver
  }

  // ⬇️ REPLACED: Updated handleCardClick for precise animation
  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      const cardElement = document.querySelector(`[data-card-index="${index}"]`) as HTMLElement;
      
      // Find the destination element (the discard pile)
      const discardPileEl = document.querySelector('.discard-area .discard-top') 
                         || document.querySelector('.discard-area .discard-empty');

      if (cardElement && yourPlayer && discardPileEl) {
        const startRect = cardElement.getBoundingClientRect(); // START
        const discardRect = discardPileEl.getBoundingClientRect(); // END

        // Calculate the difference (delta) to travel
        // We aim for the center of the elements for a smoother look
        const deltaX = (discardRect.left + discardRect.width / 2) - (startRect.left + startRect.width / 2);
        const deltaY = (discardRect.top + discardRect.height / 2) - (startRect.top + startRect.height / 2);
        
        const card = yourPlayer.hand[index];
        
        playSound('discard');
        
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // Set the state with start position AND destination deltas
        setAnimatingDiscard({
          card,
          start: { 
            x: startRect.left, 
            y: startRect.top,
            width: startRect.width,
            height: startRect.height
          },
          destination: { x: deltaX, y: deltaY } // ⬅️ SET THE DELTAS
        });
        
        // Mark this card as discarding to prevent layout shift
        setDiscardingCardIndex(index);
        
        // Mobile-first optimized animation duration
        const animationDuration = window.innerWidth <= 768 ? 1800 : 1200;
        setTimeout(() => {
          onDiscard(index);
          setDiscardingCardIndex(null);
          setAnimatingDiscard(null);
        }, animationDuration);
      }
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(index);
      
      // Enhanced haptic feedback for card selection
      if (navigator.vibrate) {
        // Gentle vibration for selection
        navigator.vibrate([30, 20, 30]); // Gentle-short-gentle pattern
      }
    }
  }

  // ⬇️ REPLACED: Enhanced draw animation handling with overlay
  const handleDraw = () => {
    playSound('draw');
    
    if (navigator.vibrate) {
      navigator.vibrate([80, 30, 80]);
    }
    
    // Get the current hand size to know where the new card will appear
    const currentHandSize = yourPlayer?.hand?.length || 0;
    const newCardIndex = currentHandSize; // The new card will be at this index
    
    // Get START (deck) position
    const deckEl = document.querySelector('.deck-area .card');
    
    if (deckEl) {
      const deckRect = deckEl.getBoundingClientRect();
      
      // Call the game logic first to add the card to the hand
      onDraw();
      
      // Use requestAnimationFrame to ensure DOM has updated, then get actual card position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newCardEl = document.querySelector(`[data-card-index="${newCardIndex}"]`) as HTMLElement;
          
          if (newCardEl) {
            const newCardRect = newCardEl.getBoundingClientRect();
            
            // Calculate deltas from deck center to new card center
            const deckCenterX = deckRect.left + deckRect.width / 2;
            const deckCenterY = deckRect.top + deckRect.height / 2;
            const cardCenterX = newCardRect.left + newCardRect.width / 2;
            const cardCenterY = newCardRect.top + newCardRect.height / 2;
            
            const deltaX = cardCenterX - deckCenterX;
            const deltaY = cardCenterY - deckCenterY;

            // Set the overlay state to trigger the animation
            setAnimatingDraw({
              start: { 
                x: deckRect.left, 
                y: deckRect.top,
                width: deckRect.width,
                height: deckRect.height
              },
              destination: { x: deltaX, y: deltaY },
              cardIndex: newCardIndex
            });
          } else {
            // Fallback: estimate position if card element not found
            const handEl = document.querySelector('.player-seat.bottom .hand');
            if (handEl) {
              const handRect = handEl.getBoundingClientRect();
              // Cards overlap by 20px (negative margin), so effective spacing is 50px
              const cardWidth = 70;
              const overlap = 20; // -10px margin on each side
              const effectiveSpacing = cardWidth - overlap;
              const estimatedCardLeft = handRect.left + (newCardIndex * effectiveSpacing);
              const estimatedCardTop = handRect.top + (handRect.height / 2) - 50;
              
              const deckCenterX = deckRect.left + deckRect.width / 2;
              const deckCenterY = deckRect.top + deckRect.height / 2;
              
              setAnimatingDraw({
                start: { 
                  x: deckRect.left, 
                  y: deckRect.top,
                  width: deckRect.width,
                  height: deckRect.height
                },
                destination: { 
                  x: (estimatedCardLeft + cardWidth / 2) - deckCenterX, 
                  y: estimatedCardTop - deckCenterY 
                },
                cardIndex: newCardIndex
              });
            }
          }
        });
      });
    } else {
      // If we can't find deck, just call onDraw without animation
      onDraw();
    }
    
    // Reset drawing state after mobile-optimized animation completes
    const animationDuration = window.innerWidth <= 768 ? 1800 : 1400;
    setTimeout(() => {
      setAnimatingDraw(null);
    }, animationDuration);
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
      {seatPlayers.top && (
        <div 
          className={`player-seat top ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.top?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.top.name}${seatPlayers.top.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.top?.name) ? ", current turn" : ""}`}
        >
          <h3>
            {seatPlayers.top.name}
            {seatPlayers.top.is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${seatPlayers.top.name}'s hand with ${seatPlayers.top.hand.length} cards`}>
            {seatPlayers.top.hand.map((card, i) => (
              <Card
                key={`top-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(seatPlayers.top)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Left Player */}
      {seatPlayers.left && (
        <div 
          className={`player-seat left ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.left?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.left.name}${seatPlayers.left.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.left?.name) ? ", current turn" : ""}`}
        >
          <h3>
            {seatPlayers.left.name}
            {seatPlayers.left.is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${seatPlayers.left.name}'s hand with ${seatPlayers.left.hand.length} cards`}>
            {seatPlayers.left.hand.map((card, i) => (
              <Card
                key={`left-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(seatPlayers.left)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Right Player */}
      {seatPlayers.right && (
        <div 
          className={`player-seat right ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.right?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.right.name}${seatPlayers.right.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.right?.name) ? ", current turn" : ""}`}
        >
          <h3>
            {seatPlayers.right.name}
            {seatPlayers.right.is_cpu && " (CPU)"}
          </h3>
          <div className="hand horizontal" aria-label={`${seatPlayers.right.name}'s hand with ${seatPlayers.right.hand.length} cards`}>
            {seatPlayers.right.hand.map((card, i) => (
              <Card
                key={`right-${i}`}
                facedown={!isGameOver}
                value={card.value}
                suit={card.suit}
                small={true}
                highlight={isWinner(seatPlayers.right)}
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
            // ⬇️ REMOVED: No longer need the drawing class on the deck itself
            className={`${isShuffling ? "card-shuffling" : ""}`}
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
        className={`player-seat bottom ${gameCurrentPlayerIndex === currentPlayerIndex ? "active" : ""}`}
        role="region"
        aria-label={`Your hand${state.current_player === currentPlayerIndex ? ", current turn" : ""}`}
      >
        <h4 className="player-name">{yourPlayer.name}</h4>
        <div className="hand" aria-label={`Your hand with ${yourPlayer.hand?.length || 0} cards`}>
          {yourPlayer.hand?.map((card, i) => {
            const isDealing = dealingCards[i] || false
            const delayClass = isDealing ? `deal-delay-${Math.min(i + 1, 7)}` : ""
            const isDrawing = animatingDraw?.cardIndex === i // Hide card being drawn
            
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
                  isDealing ||
                  isDrawing
                }
                // ⬇️ MODIFIED: We now use `discardingCardIndex` and `isDrawing` to hide the card
                className={`${isDealing ? `card-dealing ${delayClass}` : ""}`}
                highlight={isWinner(yourPlayer)}
                selected={selectedCardIndex === i}
                style={{
                  // ⬇️ ADDED: Hide card while discard or draw animation is playing
                  visibility: (discardingCardIndex === i || isDrawing) ? 'hidden' : 'visible'
                }}
                data-card-index={i}
              />
            )
          })}
        </div>
      </div>
      
      {/* ⬇️ MODIFIED: Animated overlay card for discard effect */}
      {animatingDiscard && (
        <Card
          {...animatingDiscard.card}
          className="discard-animation-overlay"
          style={{
            left: animatingDiscard.start.x,
            top: animatingDiscard.start.y,
            width: animatingDiscard.start.width,
            height: animatingDiscard.start.height,
            // ⬇️ ADDED: Pass coordinate deltas as CSS variables
            '--dest-x': `${animatingDiscard.destination.x}px`,
            '--dest-y': `${animatingDiscard.destination.y}px`,
          } as React.CSSProperties & { [key: `--${string}`]: string }}
        />
      )}

      {/* ⬇️ ADDED: Animated overlay card for draw effect */}
      {animatingDraw && (
        <Card
          facedown
          value=""
          suit=""
          className="draw-animation-overlay"
          style={{
            left: animatingDraw.start.x,
            top: animatingDraw.start.y,
            width: animatingDraw.start.width,
            height: animatingDraw.start.height,
            '--dest-x': `${animatingDraw.destination.x}px`,
            '--dest-y': `${animatingDraw.destination.y}px`,
          } as React.CSSProperties & { [key: `--${string}`]: string }}
        />
      )}
    </div>
  )
}

export default GameTable