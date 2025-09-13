import React from 'react'
import Modal from './Modal'
// Simple card display component for winning hand
const SimpleCard: React.FC<{ value: string; suit: string; highlight?: boolean }> = ({ 
  value, 
  suit, 
  highlight = false 
}) => {
  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black"
  
  return (
    <div 
      className={`simple-card ${suitColor} ${highlight ? "highlight-card" : ""}`}
      role="img"
      aria-label={`${value} of ${suit}`}
    >
      <div className="card-inner">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suit}</span>
      </div>
    </div>
  )
}
import './GameOverModal.css'

export interface GameOverModalProps {
  isOpen: boolean
  onClose: () => void
  winner: string
  winnerHand?: Array<{ value: string; suit: string }>
  onNewGame: () => void
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  winner,
  winnerHand,
  onNewGame
}) => {
  const handleNewGame = () => {
    onNewGame()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Game Over!"
      closeButtonText="Close"
      className="game-over-modal"
      contentClassName="game-over-content"
      announceOnOpen={true}
      announcementMessage={`Game over! ${winner} wins!`}
    >
      <div className="game-over-message">
        <div className="winner-announcement">
          <div className="winner-icon" aria-hidden="true">🏆</div>
          <h3>Winner: <strong>{winner}</strong></h3>
        </div>
        
        {winnerHand && winnerHand.length > 0 && (
          <div className="winning-hand-section">
            <h4>Winning Hand:</h4>
            <div className="winning-hand" role="img" aria-label={`Winning hand: ${winnerHand.map(card => `${card.value} of ${card.suit}`).join(', ')}`}>
              {winnerHand.map((card, i) => (
                <SimpleCard
                  key={`winner-${i}`}
                  value={card.value}
                  suit={card.suit}
                  highlight={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="game-over-actions">
        <button 
          className="new-game-button"
          onClick={handleNewGame}
          autoFocus
        >
          New Game
        </button>
        <button 
          className="close-button"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default GameOverModal
