import React from 'react'
import Modal from './Modal'
import './TutorialModal.css'

export interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Play Njuka King"
      closeButtonText="Got it! 🎉"
      className="tutorial-modal"
      contentClassName="tutorial-content"
      announceOnOpen={true}
      announcementMessage="Tutorial opened. Learn how to play Njuka King."
    >
      <div className="tutorial-steps">
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">🎯</div>
          <div className="tutorial-text">
            <h3>Objective</h3>
            <p>Be the first to get a winning hand of 4 cards</p>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">🃏</div>
          <div className="tutorial-text">
            <h3>Winning Hand</h3>
            <p>One pair + two cards in sequence (followers)</p>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">👆</div>
          <div className="tutorial-text">
            <h3>Draw a card</h3>
            <p>Tap the deck to draw a card</p>
            <div className="gesture-hint">
              <span aria-hidden="true">📱</span>
              <em>Feel the vibration when you draw!</em>
            </div>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">👆</div>
          <div className="tutorial-text">
            <h3>Select a card</h3>
            <p>Tap a card in your hand to select it</p>
            <div className="gesture-hint">
              <span aria-hidden="true">📱</span>
              <em>Gentle vibration confirms selection</em>
            </div>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">👆</div>
          <div className="tutorial-text">
            <h3>Discard</h3>
            <p>Tap the selected card again to discard it</p>
            <div className="gesture-hint">
              <span aria-hidden="true">📱</span>
              <em>Strong vibration confirms discard</em>
            </div>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">📱</div>
          <div className="tutorial-text">
            <h3>Mobile Gestures</h3>
            <div className="gesture-hint">
              <ul>
                <li><strong>Swipe left/right</strong> on cards to discard quickly</li>
                <li><strong>Long press</strong> for card details</li>
                <li><strong>Pinch to zoom</strong> for better card visibility</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">🎵</div>
          <div className="tutorial-text">
            <h3>Audio & Haptics</h3>
            <div className="gesture-hint">
              <ul>
                <li>Sound effects play for all actions</li>
                <li>Haptic feedback on every touch</li>
                <li>Toggle sounds with 🔊 button</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="tutorial-step">
          <div className="tutorial-icon" aria-hidden="true">💡</div>
          <div className="tutorial-text">
            <h3>Pro Tips</h3>
            <div className="gesture-hint">
              <ul>
                <li>You can win with 3 cards + the top discard pile card!</li>
                <li>Watch for opponent moves with sound cues</li>
                <li>Use the Info button to see this tutorial anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="tutorial-actions">
        <button 
          className="tutorial-close-button"
          onClick={onClose}
          autoFocus
        >
          Got it! 🎉
        </button>
      </div>
    </Modal>
  )
}

export default TutorialModal
