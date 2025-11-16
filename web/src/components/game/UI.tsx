import React from 'react';
import { HexTile } from './HexTile';
import { PLAYER_COLORS } from './constants';

interface UIProps {
  playerColorIndex: number;
  moveAllResources: boolean;
  setMoveAllResources: (value: boolean) => void;
  buttonStates: {
    addResources: boolean;
  };
  handleButtonClick: (buttonName: 'addResources') => void;
  handleAddResources: () => void;
  availableResources: number;
  countdownSeconds: number;
  gamePlayers?: Array<{ publicKey: string; colorIndex: number } | null>;
  currentWallet?: string | null;
  onJoinGame?: () => void;
  joiningGame?: boolean;
}

const getColorFromIndex = (index: number) => {
  return PLAYER_COLORS[index];
};

// Helper function to shorten pubkey
const shortenPubkey = (pubkey: string): string => {
  if (!pubkey) return '';
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
};

export const UI: React.FC<UIProps> = ({
  playerColorIndex,
  moveAllResources,
  setMoveAllResources,
  buttonStates,
  handleButtonClick,
  handleAddResources,
  availableResources,
  countdownSeconds,
  gamePlayers = [],
  currentWallet = null,
  onJoinGame,
  joiningGame = false
}) => {
  return (
    <>
      <div style={{ 
        width: '20%', 
        height: '100%',
        padding: '20px',
        color: '#fff',
        borderRight: '1px solid #333'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Actions</h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <input
              type="checkbox"
              checked={moveAllResources}
              onChange={(e) => setMoveAllResources(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span>Move all resources</span>
          </div>
          <button 
            onClick={() => {
              handleButtonClick('addResources');
              handleAddResources();
            }}
            disabled={!HexTile.selectedTile || availableResources === 0}
            style={{
              padding: '10px',
              backgroundColor: !HexTile.selectedTile || availableResources === 0 ? '#666' : 
                buttonStates.addResources ? '#008000' : '#006400',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: '4px',
              cursor: !HexTile.selectedTile || availableResources === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              transform: buttonStates.addResources ? 'scale(0.98)' : 'scale(1)',
              opacity: !HexTile.selectedTile || availableResources === 0 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#008000';
              }
            }}
            onMouseLeave={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#006400';
              }
            }}
          >
            Add Resources
          </button>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Resources Available</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Resources:</span>
              <span style={{ color: '#ffa500' }}>{availableResources}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>More resources in:</span>
              <span style={{ color: '#ffa500' }}>{countdownSeconds} seconds</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Game Info</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game ID:</span>
              <span style={{ color: '#ffa500' }}>9C6Mu...Wn1pG</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game Prize Total:</span>
              <span style={{ color: '#ffa500' }}>4.25345 SOL</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '50px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>My Profile</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Player ID:</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px' 
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: `#${getColorFromIndex(playerColorIndex).toString(16).padStart(6, '0')}`,
                  borderRadius: '2px'
                }} />
                <span style={{ color: '#ffa500' }}>7xK9p...mN2vR</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Percent Gameboard:</span>
              <span style={{ color: '#ffa500' }}>0.73% (1/137)</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ 
        width: '25%',
        height: '100%',
        padding: '20px',
        color: '#fff'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Scoreboard</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {(() => {
              // Check if current user is already in the game
              const isUserInGame = currentWallet && gamePlayers.some(
                p => p && p.publicKey === currentWallet
              );
              
              return [0, 1, 2, 3].map((playerIndex) => {
                // Count tiles for this player from HexTile.players
                const player = HexTile.players[playerIndex];
                const score = player ? player.tiles.size : 0;
                const color = PLAYER_COLORS[playerIndex];
                const colorHex = `#${color.toString(16).padStart(6, '0')}`;
                const playerNames = ['Red', 'Yellow', 'Green', 'Blue'];
                
                // Find player pubkey for this color index
                const gamePlayer = gamePlayers.find(p => p && p.colorIndex === playerIndex);
                const playerPubkey = gamePlayer ? gamePlayer.publicKey : null;
                const isCurrentUser = currentWallet && playerPubkey && playerPubkey === currentWallet;
                const isEmpty = !playerPubkey;
                
                return (
                  <div key={playerIndex} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '8px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: colorHex,
                      borderRadius: '2px'
                    }} />
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    flex: 1,
                    gap: '2px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px' 
                    }}>
                      <span style={{ color: '#888', fontSize: '12px' }}>{playerNames[playerIndex]}</span>
                      {isCurrentUser && (
                        <button
                          style={{
                            backgroundColor: '#f97316',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'default'
                          }}
                        >
                          YOU
                        </button>
                      )}
                      {isEmpty && currentWallet && onJoinGame && !isUserInGame && (
                        <button
                          onClick={onJoinGame}
                          disabled={joiningGame}
                          style={{
                            backgroundColor: '#f97316',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: joiningGame ? 'not-allowed' : 'pointer',
                            opacity: joiningGame ? 0.6 : 1,
                            transition: 'opacity 0.2s ease'
                          }}
                        >
                          {joiningGame ? 'JOINING...' : 'JOIN'}
                        </button>
                      )}
                    </div>
                    {playerPubkey && (
                      <span style={{ color: '#666', fontSize: '10px', fontFamily: 'monospace' }}>
                        {shortenPubkey(playerPubkey)}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#ffa500' }}>{score}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <h2 style={{ marginBottom: '20px' }}>Live Feed</h2>
        <div style={{
          backgroundColor: '#000000',
          borderRadius: '4px',
          padding: '10px 5px',
          height: 'calc(100% - 400px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          {(() => {
            const now = new Date();
            const formatTime = (date: Date) => {
              return date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };
            return (
              <>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Connected to Solana blockchain...
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 1000))}] Loaded game board ok
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 2000))}] Initialized player resources
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 3000))}] Ready for gameplay
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}; 