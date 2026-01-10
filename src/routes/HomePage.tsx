import { useNavigate } from 'react-router-dom';
import { HomePage as HomePageComponent } from '../components/HomePage';
import { useGame } from '../contexts/GameContext';


export const HomePage = () => {
    const navigate = useNavigate();
    const { playerName, setPlayerName, playerWallet } = useGame();

    const handleSelectMode = (mode: 'multiplayer' | 'cpu') => {
        if (mode === 'multiplayer') {
            navigate('/multiplayer');
        } else {
            navigate('/cpu');
        }
    };

    return <HomePageComponent 
        onSelectMode={handleSelectMode} 
        playerName={playerName} 
        setPlayerName={setPlayerName}
        playerWallet={playerWallet}
    />;
};
