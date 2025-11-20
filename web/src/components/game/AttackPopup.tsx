import React, { useState, useEffect } from 'react';
import { PLAYER_COLORS, COLORS } from './constants';

interface AttackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  attackerTileIndex: number;
  defenderTileIndex: number;
  attackerColor: number;
  defenderColor: number;
  attackerResources: number;
  defenderResources: number;
  attackerTileX: number;
  attackerTileY: number;
  defenderTileX: number;
  defenderTileY: number;
  onResolveAttack: () => Promise<void>;
  onAttackAgain?: () => Promise<void>;
  attackStartedAt: number; // Unix timestamp
  isResolved?: boolean;
  attackerWon?: boolean;
  newAttackerResources?: number;
  newDefenderResources?: number;
  attackerRollResult?: number; // 0-999
  defenderRollResult?: number; // 0-999
  hitResourceCount?: number; // Number of resources lost
}

const getColorName = (colorIndex: number): string => {
  const names = ['Red', 'Yellow', 'Green', 'Blue'];
  return names[colorIndex] || 'Unknown';
};

const getColorHex = (colorIndex: number): string => {
  const color = PLAYER_COLORS[colorIndex];
  return `#${color.toString(16).padStart(6, '0')}`;
};

// Simple hex tile SVG component
const HexTileSVG: React.FC<{ color: string; resources: number; size?: number }> = ({ 
  color, 
  resources, 
  size = 60 
}) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = size + size * Math.cos(angle);
    const y = size + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  const pointsString = points.join(' ');

  return (
    <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`}>
      <polygon
        points={pointsString}
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <text
        x={size}
        y={size}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color === '#ffff00' ? '#000000' : '#ffffff'}
        fontSize="16"
        fontWeight="bold"
      >
        {resources}
      </text>
    </svg>
  );
};

export const AttackPopup: React.FC<AttackPopupProps> = ({
  isOpen,
  onClose,
  attackerTileIndex,
  defenderTileIndex,
  attackerColor,
  defenderColor,
  attackerResources,
  defenderResources,
  attackerTileX,
  attackerTileY,
  defenderTileX,
  defenderTileY,
  onResolveAttack,
  onAttackAgain,
  attackStartedAt,
  isResolved = false,
  attackerWon = false,
  newAttackerResources,
  newDefenderResources,
  attackerRollResult,
  defenderRollResult,
  hitResourceCount
}) => {
  const [timeRemaining, setTimeRemaining] = useState(3);
  const [canResolve, setCanResolve] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showResult, setShowResult] = useState(isResolved);
  const [isAttackingAgain, setIsAttackingAgain] = useState(false);

  useEffect(() => {
    if (!isOpen || isResolved) {
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - attackStartedAt;
      const remaining = Math.max(0, 3 - elapsed);
      setTimeRemaining(Math.ceil(remaining));
      setCanResolve(remaining <= 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [isOpen, attackStartedAt, isResolved]);

  useEffect(() => {
    if (isResolved) {
      setShowResult(true);
      setCanResolve(false);
    } else {
      // Reset when attack is started again
      setShowResult(false);
      setTimeRemaining(3);
      setCanResolve(false);
    }
  }, [isResolved]);

  // Reset showResult when popup is opened with a new attack
  useEffect(() => {
    if (isOpen && !isResolved) {
      setShowResult(false);
    }
  }, [isOpen, isResolved]);

  const handleResolve = async () => {
    if (!canResolve || isResolving) return;
    
    setIsResolving(true);
    try {
      await onResolveAttack();
    } catch (error) {
      console.error('Error resolving attack:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleAttackAgain = async () => {
    if (!onAttackAgain || isAttackingAgain) return;
    
    setIsAttackingAgain(true);
    try {
      // Clear the result state before attacking again
      setShowResult(false);
      await onAttackAgain();
    } catch (error) {
      console.error('Error attacking again:', error);
    } finally {
      setIsAttackingAgain(false);
    }
  };

  if (!isOpen) return null;

  const attackerColorName = getColorName(attackerColor);
  const defenderColorName = getColorName(defenderColor);
  const attackerColorHex = getColorHex(attackerColor);
  const defenderColorHex = getColorHex(defenderColor);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isResolved) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '30px',
          minWidth: '600px',
          maxWidth: '800px',
          color: '#ffffff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#ffa500' }}>
            {showResult ? 'Attack Result' : 'Attacking ' + defenderColorName + ' Team'}
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginBottom: '30px'
          }}
        >
          {/* Attacker Tile */}
          <div style={{ textAlign: 'center', position: 'relative', minHeight: '200px' }}>
            <div style={{ marginBottom: '10px' }}>
              <HexTileSVG
                color={attackerColorHex}
                resources={showResult && newAttackerResources !== undefined ? newAttackerResources : attackerResources}
              />
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              {attackerColorName} Team
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Tile ({attackerTileX}, {attackerTileY})
            </div>
            {showResult && attackerRollResult !== undefined && (
              <div
                style={{
                  color: '#ffa500',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginTop: '8px',
                  animation: 'fadeIn 0.5s'
                }}
              >
                Roll: {attackerRollResult}
              </div>
            )}
            <div style={{ minHeight: '26px', marginTop: '4px' }}>
              {showResult && attackerWon === false && newAttackerResources !== undefined && (
                (() => {
                  const actualLoss = attackerResources - (newAttackerResources ?? attackerResources);
                  return actualLoss > 0 ? (
                <div
                  style={{
                    color: '#ff0000',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    animation: 'fadeIn 0.5s'
                  }}
                >
                      -{actualLoss}
                </div>
                  ) : null;
                })()
              )}
            </div>
          </div>

          <div style={{ fontSize: '24px', color: '#ffa500' }}>VS</div>

          {/* Defender Tile */}
          <div style={{ textAlign: 'center', position: 'relative', minHeight: '200px' }}>
            <div style={{ marginBottom: '10px' }}>
              <HexTileSVG
                color={defenderColorHex}
                resources={showResult && newDefenderResources !== undefined ? newDefenderResources : defenderResources}
              />
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              {defenderColorName} Team
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Tile ({defenderTileX}, {defenderTileY})
            </div>
            {showResult && defenderRollResult !== undefined && (
              <div
                style={{
                  color: '#ffa500',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginTop: '8px',
                  animation: 'fadeIn 0.5s'
                }}
              >
                Roll: {defenderRollResult}
              </div>
            )}
            <div style={{ minHeight: '26px', marginTop: '4px' }}>
              {showResult && attackerWon === true && newDefenderResources !== undefined && (
                (() => {
                  const actualLoss = defenderResources - (newDefenderResources ?? defenderResources);
                  return actualLoss > 0 ? (
                <div
                  style={{
                    color: '#ff0000',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    animation: 'fadeIn 0.5s'
                  }}
                >
                      -{actualLoss}
                </div>
                  ) : null;
                })()
              )}
            </div>
          </div>
        </div>

        {!showResult && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', color: '#ffa500', marginBottom: '10px' }}>
              Time remaining: {timeRemaining}s
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#333',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${((3 - timeRemaining) / 3) * 100}%`,
                  height: '100%',
                  backgroundColor: '#ffa500',
                  transition: 'width 0.1s linear'
                }}
              />
            </div>
          </div>
        )}

        {showResult && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '20px',
                color: attackerWon ? '#00ff00' : '#ff0000',
                fontWeight: 'bold'
              }}
            >
              {attackerWon ? `${attackerColorName} Team Wins!` : `${defenderColorName} Team Wins!`}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {!showResult && (
            <button
              onClick={handleResolve}
              disabled={!canResolve || isResolving}
              style={{
                padding: '12px 24px',
                backgroundColor: canResolve && !isResolving ? '#f97316' : '#666',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: canResolve && !isResolving ? 'pointer' : 'not-allowed',
                opacity: canResolve && !isResolving ? 1 : 0.6
              }}
            >
              {isResolving ? 'Resolving...' : 'Resolve Attack'}
            </button>
          )}
          {showResult && (
            <>
              {onAttackAgain && (
                <button
                  onClick={handleAttackAgain}
                  disabled={isAttackingAgain}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isAttackingAgain ? '#666' : '#f97316',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isAttackingAgain ? 'not-allowed' : 'pointer',
                    opacity: isAttackingAgain ? 0.6 : 1
                  }}
                >
                  {isAttackingAgain ? 'Attacking...' : 'Attack Again'}
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

