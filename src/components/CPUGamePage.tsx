import { ArrowLeft } from 'lucide-react';
import type { LoadingStates } from '../types/game';

interface CPUGamePageProps {
  onBack: () => void;
  onStartGame: () => void;
  numCPU: number;
  setNumCPU: (num: number) => void;
  entryFee: number;
  setEntryFee: (fee: number) => void;
  loadingStates: LoadingStates;
  playerWallet: number | null;
}

export const CPUGamePage = ({ 
  onBack, 
  onStartGame, 
  numCPU, 
  setNumCPU, 
  entryFee,
  setEntryFee,
  loadingStates,
  playerWallet 
}: CPUGamePageProps) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-top">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back
          </button>
          <h2>Play vs CPU</h2>
          {playerWallet !== null && (
            <div className="global-wallet-pill">
              <span className="wallet-label">WALLET:</span>
              <span className="wallet-amount">K{playerWallet.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="cpu-game-content">
        <div className="cpu-options">
          <h3>Game Setup</h3>
          
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

          <div className="cpu-selection">
            <label>Entry Fee:</label>
            <div className="fee-buttons">
              {[100, 500, 1000, 5000].map(fee => (
                <button
                  key={fee}
                  onClick={() => setEntryFee(fee)}
                  className={`fee-btn ${entryFee === fee ? 'selected' : ''}`}
                >
                  K{fee.toLocaleString()}
                </button>
              ))}
            </div>
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