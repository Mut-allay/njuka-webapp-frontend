import { Users, Bot } from 'lucide-react';

interface HomePageProps {
  onSelectMode: (mode: 'multiplayer' | 'cpu') => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const HomePage = ({ onSelectMode, playerName, setPlayerName }: HomePageProps) => {
  return (
    <div className="page-container">
      <div className="welcome-section">
        <h2>Welcome to Njuka King!</h2>
        <p>Choose your game mode to start playing</p>
      </div>
      
      <div className="new-game-form">
        <label>
          Your Name:
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              const name = e.target.value;
              if (name.length <= 20) {
                setPlayerName(name);
              }
            }}
            placeholder="Enter your name (2-20 chars)"
            maxLength={20}
            required
          />
        </label>
        
        <div className="game-mode-buttons">
          <button
            className="mode-button multiplayer-button"
            onClick={() => onSelectMode('multiplayer')}
            disabled={!playerName.trim()}
          >
            <Users size={32} />
            <span>Multiplayer</span>
            <p>Play with friends online</p>
          </button>
          
          <button
            className="mode-button cpu-button"
            onClick={() => onSelectMode('cpu')}
            disabled={!playerName.trim()}
          >
            <Bot size={32} />
            <span>VS CPU</span>
            <p>Play against computer opponents</p>
          </button>
        </div>
      </div>
    </div>
  );
};
