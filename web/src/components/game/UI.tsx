import React, { useEffect, useState } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
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
  handleAddResources: (amount: number) => void;
  availableResources: number;
  simulatedTotalResources: number;
  countdownSeconds: number;
  gamePlayers?: Array<{ publicKey: string; colorIndex: number } | null>;
  currentWallet?: string | null;
  onJoinGame?: () => void;
  joiningGame?: boolean;
  gameIdValue?: bigint;
  gamePda?: PublicKey;
  connection?: Connection;
  programId?: PublicKey;
  game?: any;
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
  simulatedTotalResources,
  countdownSeconds,
  gamePlayers = [],
  currentWallet = null,
  onJoinGame,
  joiningGame = false,
  gameIdValue,
  gamePda,
  connection,
  programId,
  game
}) => {
  const [resourcesToAdd, setResourcesToAdd] = useState(availableResources);

  // Update resourcesToAdd when availableResources changes
  useEffect(() => {
    setResourcesToAdd(availableResources);
  }, [availableResources]);
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
  const [treasuryPubkey, setTreasuryPubkey] = useState<string | null>(null);

  useEffect(() => {
    const fetchTreasuryBalance = async () => {
      if (!gamePda || !connection || !programId) return;

      try {
        // Derive treasury PDA
        const [treasuryPda] = await PublicKey.findProgramAddress(
          [Buffer.from('game_treasury'), gamePda.toBuffer()],
          programId
        );

        setTreasuryPubkey(treasuryPda.toString());

        // Fetch balance
        const balance = await connection.getBalance(treasuryPda);
        setTreasuryBalance(balance / 1e9); // Convert lamports to SOL
      } catch (err) {
        console.error('Error fetching treasury balance:', err);
        setTreasuryBalance(null);
        setTreasuryPubkey(null);
      }
    };

    fetchTreasuryBalance();
    // Refresh balance every 5 seconds
    const interval = setInterval(fetchTreasuryBalance, 5000);
    return () => clearInterval(interval);
  }, [gamePda, connection, programId]);

  // Format game ID as padded 6-digit number
  const formatGameId = () => {
    if (gameIdValue === undefined) return 'N/A';
    const gameIdNum = Number(gameIdValue);
    return `Game # ${String(gameIdNum).padStart(6, '0')}`;
  };

  // Format game ID display with pubkey
  const formatGameIdDisplay = () => {
    if (!gamePda) return 'N/A';
    const gameIdStr = formatGameId();
    return `${gameIdStr} (ID: ${gameIdValue !== undefined ? Number(gameIdValue) : 'N/A'}, ${shortenPubkey(gamePda.toString())})`;
  };
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min="1"
              max={availableResources}
              value={resourcesToAdd}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= availableResources) {
                  setResourcesToAdd(value);
                } else if (e.target.value === '') {
                  setResourcesToAdd(0);
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value, 10) < 1) {
                  setResourcesToAdd(Math.min(1, availableResources));
                } else if (parseInt(e.target.value, 10) > availableResources) {
                  setResourcesToAdd(availableResources);
                }
              }}
              disabled={!HexTile.selectedTile || availableResources === 0}
              style={{
                width: '60px',
                padding: '8px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '14px',
                textAlign: 'center',
                opacity: !HexTile.selectedTile || availableResources === 0 ? 0.5 : 1
              }}
            />
            <button 
              onClick={() => {
                if (resourcesToAdd > 0 && resourcesToAdd <= availableResources) {
                  handleButtonClick('addResources');
                  handleAddResources(resourcesToAdd);
                }
              }}
              disabled={!HexTile.selectedTile || availableResources === 0 || resourcesToAdd <= 0 || resourcesToAdd > availableResources}
              style={{
                padding: '10px',
                backgroundColor: !HexTile.selectedTile || availableResources === 0 || resourcesToAdd <= 0 || resourcesToAdd > availableResources ? '#666' : 
                  buttonStates.addResources ? '#008000' : '#006400',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '4px',
                cursor: !HexTile.selectedTile || availableResources === 0 || resourcesToAdd <= 0 || resourcesToAdd > availableResources ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                transform: buttonStates.addResources ? 'scale(0.98)' : 'scale(1)',
                opacity: !HexTile.selectedTile || availableResources === 0 || resourcesToAdd <= 0 || resourcesToAdd > availableResources ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0 && resourcesToAdd > 0 && resourcesToAdd <= availableResources) {
                  e.currentTarget.style.backgroundColor = '#008000';
                }
              }}
              onMouseLeave={(e) => {
                if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0 && resourcesToAdd > 0 && resourcesToAdd <= availableResources) {
                  e.currentTarget.style.backgroundColor = '#006400';
                }
              }}
            >
              Add Resources
            </button>
          </div>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Resources</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Total Resources:</span>
              <span style={{ color: '#ffa500' }}>{simulatedTotalResources}</span>
            </div>
            {currentWallet && gamePlayers.some(player => player && player.publicKey === currentWallet) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888' }}>My Available:</span>
                <span style={{ color: '#ffa500' }}>{availableResources}</span>
              </div>
            )}
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
              <span style={{ color: '#ffa500' }}>{formatGameIdDisplay()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game Prize Total:</span>
              <span style={{ color: '#ffa500' }}>
                {treasuryBalance !== null ? `${treasuryBalance.toFixed(5)} SOL` : 'Loading...'}
                {treasuryPubkey && (
                  <span style={{ color: '#888', fontSize: '12px' }}>
                    {' '}({shortenPubkey(treasuryPubkey)})
                  </span>
                )}
              </span>
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