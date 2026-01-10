import { ArrowLeft } from 'lucide-react';
import type { LoadingStates } from '../types/game';

interface CPUGamePageProps {
  onBack: () => void;
  onStartGame: () => void;
  numCPU: number;
  setNumCPU: (num: number) => void;
  loadingStates: LoadingStates;
  entryFee: number;
  setEntryFee: (fee: number) => void;
  playerWallet: number;
}

export const CPUGamePage = ({ 
  onBack, 
  onStartGame, 
  numCPU, 
  setNumCPU, 
  loadingStates,
  entryFee,
  setEntryFee,
  playerWallet
}: CPUGamePageProps) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>Play vs CPU</h2>
        <div className="wallet-badge">Wallet: K{playerWallet.toLocaleString()}</div>
      </div>

      <div className="cpu-game-content">
        <div className="cpu-options">
          <h3>Choose Your Opponents</h3>
          <p>Select how many CPU players you want to face</p>
          
          <div className="cpu-selection">
            <label>Number of CPU Players:</label>
            <div className="cpu-buttons">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setNumCPU(num)}
                  className={`cpu-count-btn ${numCPU === num ? 'selected' : ''}`}
                >
                  {num} CPU
                </button>
              ))}
            </div>
          </div>

          <div className="entry-fee-selection no-margin-top">
            <label>
              Bet Amount (K5 - K5000):
              <div className="fee-input-container">
                <span className="currency-prefix">K</span>
                <input
                  type="number"
                  min="5"
                  max="5000"
                  value={entryFee}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setEntryFee(Math.min(5000, Math.max(0, val)));
                    else if (e.target.value === '') setEntryFee(0);
                  }}
                  className="fee-number-input"
                />
              </div>
              <div className="fee-presets">
                {[100, 500, 1000, 2500, 5000].map(fee => (
                  <button 
                    key={fee} 
                    type="button"
                    className={entryFee === fee ? "active" : ""}
                    onClick={() => setEntryFee(fee)}
                  >
                    K{fee}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="difficulty-info">
            <h4>CPU Difficulty: Smart</h4>
            <p>CPU players will make strategic decisions and try to win!</p>
          </div>

          <button
            onClick={onStartGame}
            disabled={loadingStates.starting}
            className="start-cpu-game-btn"
          >
            {loadingStates.starting ? "Starting Game..." : `Start Game vs ${numCPU} CPU`}
          </button>
        </div>
      </div>
    </div>
  );
};