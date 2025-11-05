import { ArrowLeft } from 'lucide-react';
import type { LoadingStates } from '../types/game';

interface CPUGamePageProps {
  onBack: () => void;
  onStartGame: () => void;
  numCPU: number;
  setNumCPU: (num: number) => void;
  loadingStates: LoadingStates;
}

export const CPUGamePage = ({ 
  onBack, 
  onStartGame, 
  numCPU, 
  setNumCPU, 
  loadingStates 
}: CPUGamePageProps) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>Play vs CPU</h2>
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