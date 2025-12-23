import React, { useState, useEffect, useRef } from 'react'
import Card from './cardcomponent'
import './gametablestyle.css'

// Types
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
  const tableRef = useRef<HTMLDivElement>(null); // Reference to the main table container
  
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [showDeckHighlight, setShowDeckHighlight] = useState(false)
  const [discardingCardIndex, setDiscardingCardIndex] = useState<number | null>(null)
  const [drawingCardIndex, setDrawingCardIndex] = useState<number | null>(null)

  // Animation States
  const [animatingDiscard, setAnimatingDiscard] = useState<{
    card: CardType,
    style: React.CSSProperties
  } | null>(null)
  
  const [animatingDraw, setAnimatingDraw] = useState<{
    card: CardType,
    style: React.CSSProperties
  } | null>(null)

  const [isShuffling, setIsShuffling] = useState(false)
  const [dealingCards, setDealingCards] = useState<boolean[]>([])

  const yourPlayer = state.players.find((p) => p?.name === playerName)
  const gameCurrentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[gameCurrentPlayerIndex]
  const isGameOver = state.game_over

  // --- COORDINATE SYSTEM HELPER ---
  // Calculates exact X/Y relative to the Table container, not the window
  const getRelativePos = (element: Element) => {
    if (!tableRef.current) return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    
    const elRect = element.getBoundingClientRect();
    const tableRect = tableRef.current.getBoundingClientRect();

    return {
      x: elRect.left - tableRect.left,
      y: elRect.top - tableRect.top,
      width: elRect.width,
      height: elRect.height,
      centerX: (elRect.left - tableRect.left) + (elRect.width / 2),
      centerY: (elRect.top - tableRect.top) + (elRect.height / 2)
    };
  };

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
    }
  }, [state, playerName])

  // Trigger shuffle animation at game start
  useEffect(() => {
    if (state && !isGameOver && state.deck.length > 0 && yourPlayer?.hand.length === 0) {
      setIsShuffling(true)
      playSound('shuffle')
      setTimeout(() => {
        setIsShuffling(false)
        const handSize = yourPlayer?.hand.length || 0
        if (handSize > 0) {
          setDealingCards(new Array(handSize).fill(true))
          setTimeout(() => setDealingCards([]), handSize * 250 + 2200)
        }
      }, window.innerWidth <= 768 ? 2000 : 2000)
    }
  }, [state?.id, isGameOver, state, yourPlayer?.hand.length, playSound])

  if (!yourPlayer || !currentPlayer) {
    return <div className="error">Player data not available</div>
  }

  const currentPlayerIndex = state.players.findIndex((p) => p?.name === playerName)
  
  const getSeatPlayers = () => {
    const players = state.players
    const currentIndex = currentPlayerIndex
    
    if (currentIndex === -1) return { top: null, left: null, right: null, bottom: null }
    
    const bottom = players[currentIndex]
    const otherPlayers = players.filter((_, index) => index !== currentIndex)
    
    return {
      top: otherPlayers[0] || null,
      left: otherPlayers[1] || null,
      right: otherPlayers[2] || null,
      bottom: bottom
    }
  }

  const seatPlayers = getSeatPlayers()
  const isWinner = (player: Player) => isGameOver && state.winner === player.name

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name
    return playerId === playerName && !state.has_drawn && !isGameOver
  }

  // --- HANDLERS ---

  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      // 1. Identify Elements
      const cardElement = document.querySelector(`[data-card-index="${index}"]`);
      const discardPileEl = document.querySelector('.discard-area');

      if (cardElement && yourPlayer && discardPileEl) {
        // 2. Get Exact Grid Positions
        const startPos = getRelativePos(cardElement);
        const endPos = getRelativePos(discardPileEl);

        // 3. Calculate Travel Distance (Delta)
        // We center the card on the discard pile
        const deltaX = endPos.centerX - startPos.centerX;
        const deltaY = endPos.centerY - startPos.centerY;
        
        const card = yourPlayer.hand[index];
        
        playSound('discard');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // 4. Trigger Animation State
        setAnimatingDiscard({
          card,
          style: {
            left: `${startPos.x}px`,
            top: `${startPos.y}px`,
            width: `${startPos.width}px`,
            height: `${startPos.height}px`,
            '--dest-x': `${deltaX}px`,
            '--dest-y': `${deltaY}px`,
            '--rotation': `${(Math.random() * 20) - 10}deg` // Random rotation landing
          } as React.CSSProperties
        });
        
        setDiscardingCardIndex(index);
        
        // 5. Cleanup after animation
        const animationDuration = window.innerWidth <= 768 ? 1200 : 800; // Faster discard
        setTimeout(() => {
          onDiscard(index);
          setDiscardingCardIndex(null);
          setAnimatingDiscard(null);
        }, animationDuration);
      }
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(index);
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    }
  }

  const handleDraw = () => {
    playSound('draw');
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    
    // 1. Capture Deck Position BEFORE anything changes
    const deckEl = document.querySelector('.deck-area .card');
    if (!deckEl) {
      onDraw(); // Fallback if deck not found
      return;
    }
    const startPos = getRelativePos(deckEl);

    // 2. Determine where the new card WILL go (the slot index)
    const newCardIndex = yourPlayer.hand.length; 
    setDrawingCardIndex(newCardIndex); // Reserve the visual slot

    // 3. Trigger Game Logic
    onDraw();
    
    // 4. Wait for React to render the new card slot in the DOM
    // We use a double requestAnimationFrame to ensure layout is recalculated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Find the newly created card slot
        const handEl = document.querySelector('.player-seat.bottom .hand');
        if (!handEl) return;
        
        const handCards = handEl.querySelectorAll('.card');
        const newCardEl = handCards[handCards.length - 1]; // The last one is the new one
        
        if (newCardEl) {
          const endPos = getRelativePos(newCardEl);

          // Calculate Delta relative to the DECK (Start)
          // We want to fly FROM Deck TO Hand
          // The overlay starts at Deck position
          const deltaX = endPos.x - startPos.x;
          const deltaY = endPos.y - startPos.y;
          
          setAnimatingDraw({
            card: { value: '', suit: '' }, // We'll reveal it when it lands or if we know it
            style: {
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${startPos.width}px`,
              height: `${startPos.height}px`,
              '--dest-x': `${deltaX}px`,
              '--dest-y': `${deltaY}px`,
            } as React.CSSProperties
          });
        }
      });
    });
    
    const animationDuration = window.innerWidth <= 768 ? 1000 : 800;
    setTimeout(() => {
      setAnimatingDraw(null);
      setDrawingCardIndex(null);
    }, animationDuration);
  }

  const canDraw = !loadingStates.drawing && currentPlayer.name === playerName && !isGameOver && !state.has_drawn

  return (
    <div className="poker-table" ref={tableRef}>
      {/* Screen Reader & A11y */}
      <div className="sr-only" role="status" aria-live="polite">
        {isGameOver && state.winner && `Game over! ${state.winner} wins!`}
        {!isGameOver && currentPlayer.name === playerName && !state.has_drawn && "Your turn to draw."}
        {!isGameOver && currentPlayer.name === playerName && state.has_drawn && "Select a card to discard."}
      </div>
      
      {/* --- OPPONENTS --- */}
      {[seatPlayers.top, seatPlayers.left, seatPlayers.right].map((player, idx) => {
        if (!player) return null;
        const pos = idx === 0 ? 'top' : idx === 1 ? 'left' : 'right';
        const isActive = gameCurrentPlayerIndex === state.players.findIndex(p => p.name === player.name);
        
        return (
          <div key={pos} className={`player-seat ${pos} ${isActive ? "active" : ""}`}>
            <h3>{player.name} {player.is_cpu && "(CPU)"}</h3>
            <div className="hand horizontal">
              {player.hand.map((card, i) => (
                <Card key={i} facedown={!isGameOver} value={card.value} suit={card.suit} small={true} highlight={isWinner(player)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* --- CENTER AREA --- */}
      <div className="table-center">
        <div
          className={`deck-area ${showDeckHighlight ? "deck-highlight" : ""} ${isShuffling ? "deck-shuffling" : ""}`}
          onClick={canDraw ? handleDraw : undefined}
          role="button"
          tabIndex={canDraw ? 0 : -1}
        >
          <div className="deck-count">{state.deck?.length ?? 0}</div>
          {shouldShowPrompt() && <div className="tutorial-prompt">Pick a card</div>}
          <Card
            facedown
            value=""
            suit=""
            className={`${isShuffling ? "card-shuffling" : ""}`}
            style={{ cursor: canDraw ? "pointer" : "default" }}
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

      {/* --- PLAYER (BOTTOM) --- */}
      <div className={`player-seat bottom ${gameCurrentPlayerIndex === currentPlayerIndex ? "active" : ""}`}>
        <h4 className="player-name">{yourPlayer.name}</h4>
        <div className="hand">
          {yourPlayer.hand?.map((card, i) => {
            const isDealing = dealingCards[i] || false;
            const isDrawing = drawingCardIndex === i;
            const isDiscarding = discardingCardIndex === i;
            
            return (
              <Card
                key={`you-${i}`}
                {...card}
                onClick={() => handleCardClick(i)}
                disabled={!state.has_drawn || currentPlayer.is_cpu || loadingStates.discarding || isDiscarding || isDealing || isDrawing}
                className={`${isDealing ? `card-dealing deal-delay-${Math.min(i + 1, 7)}` : ""}`}
                highlight={isWinner(yourPlayer)}
                selected={selectedCardIndex === i}
                data-card-index={i}
                style={{
                  opacity: (isDrawing && animatingDraw) || isDiscarding ? 0 : 1, // Hide real card while animating
                  visibility: isDiscarding ? 'hidden' : 'visible'
                }}
              />
            )
          })}
        </div>
      </div>
      
      {/* --- ANIMATION LAYERS (The "Grid" Travelers) --- */}
      
      {/* Discard Flyer */}
      {animatingDiscard && (
        <Card
          {...animatingDiscard.card}
          className="discard-animation-overlay"
          style={animatingDiscard.style}
        />
      )}

      {/* Draw Flyer */}
      {animatingDraw && (
        <Card
          // We show the back of the card flying, or the face if you prefer
          facedown={true} 
          value=""
          suit=""
          className="draw-animation-overlay"
          style={animatingDraw.style}
        />
      )}
    </div>
  )
}

export default GameTable