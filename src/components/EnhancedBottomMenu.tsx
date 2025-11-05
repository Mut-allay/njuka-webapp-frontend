import { useState } from 'react';
import { Settings, Info, Home, Volume2, VolumeX, BookOpen } from 'lucide-react';

interface EnhancedBottomMenuProps {
  quitGameToMenu?: () => void;
  soundsEnabled: boolean;
  toggleSounds: () => void;
  playSound: (soundType: 'button') => void;
  onShowRules: () => void;
  onGoHome: () => void;
}

export const EnhancedBottomMenu = ({
  quitGameToMenu,
  soundsEnabled,
  toggleSounds,
  playSound,
  onShowRules,
  onGoHome
}: EnhancedBottomMenuProps) => {
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  const handleButtonClick = (action: () => void) => {
    playSound('button');
    if (navigator.vibrate) {
      navigator.vibrate([40, 20, 40]);
    }
    action();
  };

  const toggleSettings = () => {
    setSettingsExpanded(!settingsExpanded);
    setInfoExpanded(false);
  };

  const toggleInfo = () => {
    setInfoExpanded(!infoExpanded);
    setSettingsExpanded(false);
  };

  return (
    <div className="enhanced-bottom-menu">
      {settingsExpanded && (
        <div className="expanded-panel settings-panel">
          <button 
            onClick={() => handleButtonClick(toggleSounds)}
            className="panel-button"
          >
            {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            Sound {soundsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {infoExpanded && (
        <div className="expanded-panel info-panel">
          <button 
            onClick={() => handleButtonClick(onShowRules)}
            className="panel-button"
          >
            <BookOpen size={20} />
            Rules
          </button>
        </div>
      )}

      <div className="main-menu-bar">
        <button 
          onClick={() => handleButtonClick(onGoHome)}
          className="menu-button"
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button 
          onClick={() => handleButtonClick(toggleSettings)}
          className={`menu-button ${settingsExpanded ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>

        <button 
          onClick={() => handleButtonClick(toggleInfo)}
          className={`menu-button ${infoExpanded ? 'active' : ''}`}
        >
          <Info size={20} />
          <span>Info</span>
        </button>

        {quitGameToMenu && (
          <button 
            onClick={() => handleButtonClick(quitGameToMenu)}
            className="menu-button quit-button"
          >
            <span>Quit</span>
          </button>
        )}
      </div>
    </div>
  );
};