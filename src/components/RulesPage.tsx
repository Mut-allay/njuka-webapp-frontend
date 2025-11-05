import { ArrowLeft } from 'lucide-react';

interface RulesPageProps {
  onBack: () => void;
}

export const RulesPage = ({ onBack }: RulesPageProps) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>How to Play Njuka King</h2>
      </div>

      <div className="rules-content">
        <section className="rules-section">
          <h3>🎯 Objective</h3>
          <p>Be the first player to create a winning hand of exactly 4 cards.</p>
        </section>

        <section className="rules-section">
          <h3>🃏 Winning Hand</h3>
          <p>A winning hand consists of:</p>
          <ul>
            <li><strong>One Pair</strong> - Two cards of the same rank (e.g., two 8s)</li>
            <li><strong>Two Followers</strong> - Two cards in sequential order (e.g., 9 and 10)</li>
          </ul>
          <p><strong>Example:</strong> 8♥, 8♠, 9♣, 10♦ (pair of 8s + 9,10 sequence)</p>
        </section>

        <section className="rules-section">
          <h3>🎮 How to Play</h3>
          <ol>
            <li><strong>Draw Phase:</strong> On your turn, draw one card from the deck</li>
            <li><strong>Discard Phase:</strong> Choose one card from your hand to discard</li>
            <li><strong>Win Check:</strong> If you have a winning hand, the game ends and you win!</li>
            <li><strong>Continue:</strong> Play passes to the next player</li>
          </ol>
        </section>
      </div>
    </div>
  );
};