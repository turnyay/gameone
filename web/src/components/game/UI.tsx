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
  const [refreshKey, setRefreshKey] = useState(0);
  const [countdown, setCountdown] = useState(60);
  
  // Calculate countdown based on game account XP timestamp
  useEffect(() => {
    if (!game) return;
    
    const gameData = game as any;
    // Get the earliest XP timestamp (when the last update happened)
    const xpTimestamps = [
      gameData?.xpTimestampPlayer1 || 0,
      gameData?.xpTimestampPlayer2 || 0,
      gameData?.xpTimestampPlayer3 || 0,
      gameData?.xpTimestampPlayer4 || 0
    ].filter(ts => ts > 0);
    
    if (xpTimestamps.length === 0) {
      setCountdown(60);
      return;
    }
    
    const updateCountdown = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      // Find the earliest timestamp (most recent update)
      const earliestTimestamp = Math.min(...xpTimestamps);
      // Calculate seconds since last update
      const secondsSinceLastUpdate = currentTime - earliestTimestamp;
      // Calculate seconds remaining in the current 60-second cycle
      const secondsInCurrentCycle = secondsSinceLastUpdate % 60;
      const secondsUntilNextUpdate = 60 - secondsInCurrentCycle;
      setCountdown(secondsUntilNextUpdate);
    };
    
    // Update immediately
    updateCountdown();
    
    // Update every second
    const countdownTimer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(countdownTimer);
  }, [game, refreshKey]);
  
  // Force re-render every minute to update simulated XP display
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ marginBottom: '0' }}>Scoreboard</h2>
            <span style={{ 
              fontSize: '12px', 
              color: '#888', 
              fontFamily: 'monospace',
              marginLeft: '10px'
            }}>
              Update in: {countdown}s
            </span>
          </div>
          {/* Column headers */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '4px 8px',
            marginBottom: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#888',
            borderBottom: '1px solid #333'
          }}>
            <div style={{ width: '16px' }} /> {/* Spacer for color square */}
            <div style={{ flex: 1 }} /> {/* Spacer for player name */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              minWidth: '80px',
              gap: '2px'
            }}>
              <span>XP</span>
            </div>
            <span style={{ minWidth: '80px', textAlign: 'right' }}>Tiles</span>
            <span style={{ minWidth: '80px', textAlign: 'right' }}>Bonus</span>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {(() => {
              // Check if current user is already in the game
              const isUserInGame = currentWallet && gamePlayers.some(
                p => p && p.publicKey === currentWallet
              );
              
              // Get XP and tile count data from game
              const gameData = game as any;
              
              // Log game data to debug tier counts
              console.log('Game data:', gameData);
              console.log('Player 3 (Green) tier counts:', {
                gold: gameData?.goldTileCountPlayer3,
                silver: gameData?.silverTileCountPlayer3,
                bronze: gameData?.bronzeTileCountPlayer3,
                iron: gameData?.ironTileCountPlayer3
              });
              
              const savedXpValues = [
                gameData?.xpPlayer1 || 0,
                gameData?.xpPlayer2 || 0,
                gameData?.xpPlayer3 || 0,
                gameData?.xpPlayer4 || 0
              ];
              const xpTimestamps = [
                gameData?.xpTimestampPlayer1 || 0,
                gameData?.xpTimestampPlayer2 || 0,
                gameData?.xpTimestampPlayer3 || 0,
                gameData?.xpTimestampPlayer4 || 0
              ];
              const tileCounts = [
                gameData?.tileCountColor1 || 0,
                gameData?.tileCountColor2 || 0,
                gameData?.tileCountColor3 || 0,
                gameData?.tileCountColor4 || 0
              ];
              const xpPerMinutePerTile = gameData?.xpPerMinutePerTile || 1;
              
              // Get tier counts for each player - try both camelCase and snake_case
              const tierCounts = [
                {
                  gold: gameData?.goldTileCountPlayer1 ?? gameData?.gold_tile_count_player1 ?? 0,
                  silver: gameData?.silverTileCountPlayer1 ?? gameData?.silver_tile_count_player1 ?? 0,
                  bronze: gameData?.bronzeTileCountPlayer1 ?? gameData?.bronze_tile_count_player1 ?? 0,
                  iron: gameData?.ironTileCountPlayer1 ?? gameData?.iron_tile_count_player1 ?? 0
                },
                {
                  gold: gameData?.goldTileCountPlayer2 ?? gameData?.gold_tile_count_player2 ?? 0,
                  silver: gameData?.silverTileCountPlayer2 ?? gameData?.silver_tile_count_player2 ?? 0,
                  bronze: gameData?.bronzeTileCountPlayer2 ?? gameData?.bronze_tile_count_player2 ?? 0,
                  iron: gameData?.ironTileCountPlayer2 ?? gameData?.iron_tile_count_player2 ?? 0
                },
                {
                  gold: gameData?.goldTileCountPlayer3 ?? gameData?.gold_tile_count_player3 ?? 0,
                  silver: gameData?.silverTileCountPlayer3 ?? gameData?.silver_tile_count_player3 ?? 0,
                  bronze: gameData?.bronzeTileCountPlayer3 ?? gameData?.bronze_tile_count_player3 ?? 0,
                  iron: gameData?.ironTileCountPlayer3 ?? gameData?.iron_tile_count_player3 ?? 0
                },
                {
                  gold: gameData?.goldTileCountPlayer4 ?? gameData?.gold_tile_count_player4 ?? 0,
                  silver: gameData?.silverTileCountPlayer4 ?? gameData?.silver_tile_count_player4 ?? 0,
                  bronze: gameData?.bronzeTileCountPlayer4 ?? gameData?.bronze_tile_count_player4 ?? 0,
                  iron: gameData?.ironTileCountPlayer4 ?? gameData?.iron_tile_count_player4 ?? 0
                }
              ];
              
              // Log tier counts for all players
              console.log('Tier counts for all players:', tierCounts);
              
              // Get tier bonus XP per minute values - try both camelCase and snake_case
              const goldXpPerMin = gameData?.goldTierBonusXpPerMin ?? gameData?.gold_tier_bonus_xp_per_min ?? 100;
              const silverXpPerMin = gameData?.silverTierBonusXpPerMin ?? gameData?.silver_tier_bonus_xp_per_min ?? 50;
              const bronzeXpPerMin = gameData?.bronzeTierBonusXpPerMin ?? gameData?.bronze_tier_bonus_xp_per_min ?? 10;
              const ironXpPerMin = gameData?.ironTierBonusXpPerMin ?? gameData?.iron_tier_bonus_xp_per_min ?? 5;
              
              console.log('Tier bonus XP per min:', { goldXpPerMin, silverXpPerMin, bronzeXpPerMin, ironXpPerMin });
              
              // Calculate bonus XP per minute for each player
              const calculateBonusXpPerMin = (tierCount: { gold: number; silver: number; bronze: number; iron: number }, playerIndex: number) => {
                const bonus = (tierCount.gold * goldXpPerMin) +
                       (tierCount.silver * silverXpPerMin) +
                       (tierCount.bronze * bronzeXpPerMin) +
                       (tierCount.iron * ironXpPerMin);
                console.log(`Player ${playerIndex + 1} bonus calculation:`, {
                  gold: `${tierCount.gold} * ${goldXpPerMin} = ${tierCount.gold * goldXpPerMin}`,
                  silver: `${tierCount.silver} * ${silverXpPerMin} = ${tierCount.silver * silverXpPerMin}`,
                  bronze: `${tierCount.bronze} * ${bronzeXpPerMin} = ${tierCount.bronze * bronzeXpPerMin}`,
                  iron: `${tierCount.iron} * ${ironXpPerMin} = ${tierCount.iron * ironXpPerMin}`,
                  total: bonus
                });
                return bonus;
              };
              
              const bonusXpPerMinValues = tierCounts.map((tc, idx) => calculateBonusXpPerMin(tc, idx));
              console.log('Final bonus XP per min values:', bonusXpPerMinValues);
              
              // Calculate simulated XP for each player on-the-fly
              const calculateSimulatedXP = (savedXP: number, timestamp: number, tileCount: number, bonusXpPerMin: number) => {
                const currentTime = Math.floor(Date.now() / 1000);
                const timeDiff = currentTime - timestamp;
                if (timeDiff > 60) {
                  const minutesElapsed = Math.floor(timeDiff / 60);
                  const xpGained = minutesElapsed * xpPerMinutePerTile * tileCount;
                  const bonusXpGained = minutesElapsed * bonusXpPerMin;
                  return {
                    total: savedXP + xpGained + bonusXpGained,
                    baseXpGained: xpGained,
                    bonusXpGained: bonusXpGained
                  };
                }
                return {
                  total: savedXP,
                  baseXpGained: 0,
                  bonusXpGained: 0
                };
              };
              
              const simulatedXpData = [
                calculateSimulatedXP(savedXpValues[0], xpTimestamps[0], tileCounts[0], bonusXpPerMinValues[0]),
                calculateSimulatedXP(savedXpValues[1], xpTimestamps[1], tileCounts[1], bonusXpPerMinValues[1]),
                calculateSimulatedXP(savedXpValues[2], xpTimestamps[2], tileCounts[2], bonusXpPerMinValues[2]),
                calculateSimulatedXP(savedXpValues[3], xpTimestamps[3], tileCounts[3], bonusXpPerMinValues[3])
              ];
              
              // Create player data array with XP and tile counts
              const playerData = [0, 1, 2, 3].map((playerIndex) => {
                const player = HexTile.players[playerIndex];
                const tileCount = tileCounts[playerIndex];
                const savedXp = savedXpValues[playerIndex];
                const simulatedXpDataItem = simulatedXpData[playerIndex];
                const simulatedXp = simulatedXpDataItem.total;
                const color = PLAYER_COLORS[playerIndex];
                const colorHex = `#${color.toString(16).padStart(6, '0')}`;
                const playerNames = ['Red', 'Yellow', 'Green', 'Blue'];
                
                // Find player pubkey for this color index
                const gamePlayer = gamePlayers.find(p => p && p.colorIndex === playerIndex);
                const playerPubkey = gamePlayer ? gamePlayer.publicKey : null;
                const isCurrentUser = currentWallet && playerPubkey && playerPubkey === currentWallet;
                const isEmpty = !playerPubkey;
                
                const tierCount = tierCounts[playerIndex];
                
                return {
                  playerIndex,
                  tileCount,
                  savedXp,
                  simulatedXp,
                  baseXpGained: simulatedXpDataItem.baseXpGained,
                  bonusXpGained: simulatedXpDataItem.bonusXpGained,
                  bonusXpPerMin: bonusXpPerMinValues[playerIndex],
                  tierCount,
                  goldXpPerMin,
                  silverXpPerMin,
                  bronzeXpPerMin,
                  ironXpPerMin,
                  color,
                  colorHex,
                  playerName: playerNames[playerIndex],
                  playerPubkey,
                  isCurrentUser,
                  isEmpty
                };
              });
              
              // Sort by simulated XP (highest first), then by tile count if XP is equal
              const sortedPlayers = [...playerData].sort((a, b) => {
                if (b.simulatedXp !== a.simulatedXp) {
                  return b.simulatedXp - a.simulatedXp;
                }
                return b.tileCount - a.tileCount;
              });
              
              return sortedPlayers.map((player) => {
                return (
                  <div key={player.playerIndex} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '6px 8px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: player.colorHex,
                      borderRadius: '2px'
                    }} />
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      flex: 1,
                      gap: '2px',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        position: 'relative'
                      }}>
                        <span style={{ color: '#888', fontSize: '12px' }}>{player.playerName}</span>
                        {player.isCurrentUser && (
                          <button
                            style={{
                              backgroundColor: '#f97316',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'default',
                              position: 'absolute',
                              left: '50px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            YOU
                          </button>
                        )}
                        {player.isEmpty && currentWallet && onJoinGame && !isUserInGame && (
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
                              transition: 'opacity 0.2s ease',
                              position: 'absolute',
                              left: '50px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {joiningGame ? 'JOINING...' : 'JOIN'}
                          </button>
                        )}
                      </div>
                      {player.playerPubkey && (
                        <span style={{ color: '#666', fontSize: '10px', fontFamily: 'monospace' }}>
                          {shortenPubkey(player.playerPubkey)}
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-end',
                      minWidth: '80px',
                      gap: '2px'
                    }}>
                      <span style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '14px' }}>
                        {player.simulatedXp}
                      </span>
                    </div>
                    <div style={{ 
                      position: 'relative',
                      display: 'inline-block',
                      minWidth: '80px',
                      textAlign: 'right'
                    }}>
                      <span 
                        style={{ 
                          color: '#ffa500',
                          cursor: 'help'
                        }}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                          if (tooltip) tooltip.style.display = 'block';
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                          if (tooltip) tooltip.style.display = 'none';
                        }}
                      >
                      {player.tileCount}
                    </span>
                      <div
                        style={{
                          display: 'none',
                          position: 'absolute',
                          bottom: '100%',
                          right: 0,
                          marginBottom: '5px',
                          padding: '8px 12px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#ffa500' }}>Base XP/min</div>
                        <div style={{ color: '#ffa500' }}>
                          {player.tileCount} tiles × {xpPerMinutePerTile} = +{player.tileCount * xpPerMinutePerTile} XP/min
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      position: 'relative',
                      display: 'inline-block',
                      minWidth: '80px',
                      textAlign: 'right'
                    }}>
                      <span 
                        style={{ 
                          color: '#ffd700', 
                          fontWeight: 'bold',
                          cursor: 'help'
                        }}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                          if (tooltip) tooltip.style.display = 'block';
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                          if (tooltip) tooltip.style.display = 'none';
                        }}
                      >
                        {player.bonusXpPerMin}
                      </span>
                      <div
                        style={{
                          display: 'none',
                          position: 'absolute',
                          bottom: '100%',
                          right: 0,
                          marginBottom: '5px',
                          padding: '8px 12px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#ffd700' }}>Tier Bonus XP/min</div>
                        {player.tierCount.gold > 0 && (
                          <div style={{ color: '#ffd700' }}>
                            {player.tierCount.gold} gold × {player.goldXpPerMin} = +{player.tierCount.gold * player.goldXpPerMin}
                          </div>
                        )}
                        {player.tierCount.silver > 0 && (
                          <div style={{ color: '#c0c0c0' }}>
                            {player.tierCount.silver} silver × {player.silverXpPerMin} = +{player.tierCount.silver * player.silverXpPerMin}
                          </div>
                        )}
                        {player.tierCount.bronze > 0 && (
                          <div style={{ color: '#8b4513' }}>
                            {player.tierCount.bronze} bronze × {player.bronzeXpPerMin} = +{player.tierCount.bronze * player.bronzeXpPerMin}
                          </div>
                        )}
                        {player.tierCount.iron > 0 && (
                          <div style={{ color: '#708090' }}>
                            {player.tierCount.iron} iron × {player.ironXpPerMin} = +{player.tierCount.iron * player.ironXpPerMin}
                          </div>
                        )}
                        {(player.tierCount.gold === 0 && player.tierCount.silver === 0 && player.tierCount.bronze === 0 && player.tierCount.iron === 0) && (
                          <div style={{ color: '#888' }}>No tier tiles</div>
                        )}
                      </div>
                    </div>
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