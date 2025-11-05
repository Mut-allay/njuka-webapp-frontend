import { Users, Bot } from 'lucide-react';

interface HomePageProps {
  onSelectMode: (mode: 'multiplayer' | 'cpu') => void;
  playerName: string;
}

export const HomePage = ({ onSelectMode }: HomePageProps) => {
  return (
    <div className="page-container">
      <div className="welcome-section">
        <h2>Welcome to Njuka King!</h2>
        <p>Choose your game mode to start playing</p>
      </div>
      
      <div className="game-mode-section">
        <div className="game-mode-buttons">
          <button
            className="mode-button multiplayer-button"
            onClick={() => onSelectMode('multiplayer')}
          >
            <Users size={32} />
            <span>Multiplayer</span>
            <p>Play with friends online</p>
          </button>
          
          <button
            className="mode-button cpu-button"
            onClick={() => onSelectMode('cpu')}
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