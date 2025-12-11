import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CPUGamePage } from '../components/CPUGamePage';
import { useGame } from '../contexts/GameContext';

export const CPUGameSetupPage = () => {
    const navigate = useNavigate();
    const { startCPUGame, loadingStates, gameId } = useGame();
    const [numCPU, setNumCPU] = useState(1);

    // Navigate to game when game is created
    useEffect(() => {
        if (gameId) {
            navigate(`/game/${gameId}`);
        }
    }, [gameId, navigate]);

    const handleStartGame = async () => {
        try {
            await startCPUGame(numCPU);
            // Navigation happens via useEffect above
        } catch (error) {
            console.error('Failed to start CPU game:', error);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <CPUGamePage
            onBack={handleBack}
            onStartGame={handleStartGame}
            numCPU={numCPU}
            setNumCPU={setNumCPU}
            loadingStates={loadingStates}
        />
    );
};
