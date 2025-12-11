import { useNavigate } from 'react-router-dom';
import { HomePage as HomePageComponent } from '../components/HomePage';
import { useGame } from '../contexts/GameContext';
import { useEffect, useState } from 'react';

export const HomePage = () => {
    const navigate = useNavigate();
    const { playerName, setPlayerName } = useGame();
    const [localName, setLocalName] = useState(playerName);

    useEffect(() => {
        setLocalName(playerName);
    }, [playerName]);

    const handleSelectMode = (mode: 'multiplayer' | 'cpu') => {
        if (mode === 'multiplayer') {
            navigate('/multiplayer');
        } else {
            navigate('/cpu');
        }
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localName.trim()) {
            setPlayerName(localName.trim());
        }
    };

    // Show name input if no player name is set
    if (!playerName) {
        return (
            <div className="page-container">
                <div className="welcome-section">
                    <h2>Welcome to Njuka King!</h2>
                    <p>Please enter your name to start playing</p>
                </div>
                <form onSubmit={handleNameSubmit} className="name-input-section">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        placeholder="Enter your name"
                        className="name-input"
                        autoFocus
                        maxLength={20}
                    />
                    <button type="submit" disabled={!localName.trim()} className="submit-name-btn">
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    return <HomePageComponent onSelectMode={handleSelectMode} playerName={playerName} />;
};
