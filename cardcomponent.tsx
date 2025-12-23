import React from 'react';

interface CardProps {
  value: string;
  suit: string;
  facedown?: boolean;
  small?: boolean;
  highlight?: boolean;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  [key: string]: any; // for data attributes
}

const Card: React.FC<CardProps> = ({
  value,
  suit,
  facedown,
  small,
  highlight,
  selected,
  disabled,
  className = '',
  style,
  onClick,
  ...rest
}) => {
  // Normalize suit to symbol if needed, or determining color
  const isRed = ['♥', '♦', 'hearts', 'diamonds', 'h', 'd'].includes(suit?.toLowerCase());
  
  // Simple suit mapping for display if words are passed
  const getSuitSymbol = (s: string) => {
    if (!s) return '';
    const map: {[key: string]: string} = {
      'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠',
      'h': '♥', 'd': '♦', 'c': '♣', 's': '♠'
    };
    return map[s.toLowerCase()] || s;
  };

  const displaySuit = getSuitSymbol(suit);
  
  const combinedClassName = `
    card 
    ${small ? 'small-card' : ''} 
    ${highlight ? 'highlight-card' : ''} 
    ${selected ? 'card-selected' : ''} 
    ${facedown ? 'facedown' : isRed ? 'red' : 'black'} 
    ${className}
  `.trim();

  return (
    <div 
      className={combinedClassName}
      style={style}
      onClick={!disabled ? onClick : undefined}
      {...rest}
    >
      {!facedown && (
        <div className="card-inner">
          <div className="card-value">{value}</div>
          <div className="card-suit">{displaySuit}</div>
        </div>
      )}
      {/* The CSS handles the background image for facedown, but we add this div for the pattern if needed */}
      {facedown && <div className="card-back"></div>}
    </div>
  );
};

export default Card;