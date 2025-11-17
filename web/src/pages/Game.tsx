import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { HexoneClient, GameAccount } from '../lib/hexone';
import Phaser from 'phaser';
import { MainScene } from '../components/game/MainScene';
import { HexTile } from '../components/game/HexTile';
import { UI } from '../components/game/UI';
import { AttackPopup } from '../components/game/AttackPopup';
import { INITIAL_RESOURCES, RESOURCE_REFRESH_RATE, RESOURCES_PER_REFRESH, GRID_CONFIG } from '../components/game/constants';

const Game: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [game, setGame] = useState<GameAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [playerColorIndex, setPlayerColorIndex] = useState(0);
  const [moveAllResources, setMoveAllResources] = useState(false);
  const [buttonStates, setButtonStates] = useState({
    addResources: false
  });
  const [availableResources, setAvailableResources] = useState(INITIAL_RESOURCES);
  const [countdownSeconds, setCountdownSeconds] = useState(RESOURCE_REFRESH_RATE);
  const [joiningGame, setJoiningGame] = useState(false);
  
  // Attack popup state
  const [attackPopupOpen, setAttackPopupOpen] = useState(false);
  const [attackData, setAttackData] = useState<{
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
    attackStartedAt: number;
  } | null>(null);
  const [attackResolved, setAttackResolved] = useState(false);
  const [attackResult, setAttackResult] = useState<{
    attackerWon: boolean;
    newAttackerResources: number;
    newDefenderResources: number;
  } | null>(null);
  
  // Set up HexoneClient - same pattern as SiclubClient
  const client = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }
    try {
      return new HexoneClient(wallet);
    } catch (err) {
      console.error('Error creating HexoneClient:', err);
      return null;
    }
  }, [wallet]);

  useEffect(() => {
    if (!gameId) return;
    fetchGame();
  }, [connection, gameId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setAvailableResources(prev => prev + RESOURCES_PER_REFRESH);
          return RESOURCE_REFRESH_RATE;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleButtonClick = (buttonName: keyof typeof buttonStates) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonName]: !prev[buttonName]
    }));
  };

  const handleAddResources = () => {
    if (HexTile.selectedTile && availableResources > 0) {
      HexTile.selectedTile.addResources(1);
      setAvailableResources(prev => prev - 1);
    }
  };

  const fetchGame = async () => {
    if (!gameId) return;
    try {
      setLoading(true);
      
      // Find the PDA using the game ID
      const gamePda = new PublicKey(gameId);
      console.log('Game PDA:', gamePda.toString());

      // Get game account data
      const gameAccountInfo = await connection.getAccountInfo(gamePda);
      if (!gameAccountInfo) {
        throw new Error('Game account not found');
      }

      console.log('Game account data length:', gameAccountInfo.data.length);
      
      // Skip 8 bytes for Anchor discriminator
      const data = gameAccountInfo.data.slice(8);
      console.log('Data after discriminator length:', data.length);
      
      // Read pubkeys (32 bytes each)
      const admin = new PublicKey(data.slice(0, 32));
      const player1 = new PublicKey(data.slice(32, 64));
      const player2 = new PublicKey(data.slice(64, 96));
      const player3 = new PublicKey(data.slice(96, 128));
      const player4 = new PublicKey(data.slice(128, 160));
      
      // Read resources_per_minute (4 bytes)
      const resourcesPerMinute = data.readUInt32LE(160);
      
      // Read tile_data (144 * 4 bytes)
      // Each TileData is: color (u8) + _pad (u8) + resource_count (u16) = 4 bytes
      const tileData: Array<{ color: number; resourceCount: number }> = [];
      for (let i = 0; i < 144; i++) {
          const offset = 164 + (i * 4);
          const color = data.readUInt8(offset);
          const resourceCount = data.readUInt16LE(offset + 2);
          tileData.push({ color, resourceCount });
      }
      
      // Read game state and other fields (5 bytes)
      const gameStateOffset = 164 + (144 * 4);
      const gameState = data.readUInt8(gameStateOffset);
      const rows = data.readUInt8(gameStateOffset + 1);
      const columns = data.readUInt8(gameStateOffset + 2);
      
      // Map game state to string representation
      let gameStateStr = 'Unknown';
      switch (gameState) {
        case 0:
          gameStateStr = 'Waiting';
          break;
        case 1:
          gameStateStr = 'In Progress';
          break;
        case 2:
          gameStateStr = 'Completed';
          break;
        default:
          gameStateStr = `Unknown (${gameState})`;
      }
      
      const tilesCovered = tileData.filter(tile => tile.color !== 0).length;

      const gameData: GameAccount = {
        publicKey: gamePda,
        status: gameStateStr,
        players: [player1, player2, player3, player4].filter(pk => !pk.equals(PublicKey.default)),
        tilesCovered,
        totalTiles: rows * columns || 0,
        tilesCoveredPercent: rows * columns ? (tilesCovered / (rows * columns)) * 100 : 0,
        cost: 0, // Cost is not stored in the game account
        tileData,
        rows,
        columns,
        resourcesPerMinute
      };

      // Map players to their color indices based on position
      // player1 = Red (0), player2 = Yellow (1), player3 = Green (2), player4 = Blue (3)
      const gamePlayers = [
        !player1.equals(PublicKey.default) ? { publicKey: player1.toString(), colorIndex: 0 } : null,
        !player2.equals(PublicKey.default) ? { publicKey: player2.toString(), colorIndex: 1 } : null,
        !player3.equals(PublicKey.default) ? { publicKey: player3.toString(), colorIndex: 2 } : null,
        !player4.equals(PublicKey.default) ? { publicKey: player4.toString(), colorIndex: 3 } : null,
      ];
      
      // Store game players for UI
      (gameData as any).gamePlayers = gamePlayers;

      console.log('Parsed game:', gameData);
      setGame(gameData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch game');
      console.error('Error fetching game:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (wallet.publicKey && connection) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          setBalance(balance / 1e9); // Convert lamports to SOL
        } catch (err) {
          console.error('Error fetching balance:', err);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    // Refresh balance every 5 seconds
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection]);

  const handleBack = () => {
    navigate('/');
  };

  const handleJoinGame = async () => {
    if (!client || !wallet.publicKey || !game) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setJoiningGame(true);
      setError(null);

      // Use client method (similar to client.createClub in siclub)
      // Note: We'll need to add a joinGame method to HexoneClient
      // For now, using program directly but should be moved to client
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), wallet.publicKey.toBuffer()],
        client.getProgram().programId
      );

      const tx = await client.getProgram().methods
        .joinGame()
        .accounts({
          wallet: wallet.publicKey,
          player: playerPda,
          game: game.publicKey,
        })
        .rpc();

      console.log('Join game transaction:', tx);
      setError(null);
      alert('Successfully joined the game!');
      
      // Refresh game data
      setTimeout(() => {
        fetchGame();
      }, 2000);
    } catch (err) {
      console.error('Error joining game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
    } finally {
      setJoiningGame(false);
    }
  };

  const initGame = useCallback(() => {
    if (gameRef.current || !game) return;
    
    // Wait for the game container to be available
    const container = document.getElementById('game-container');
    if (!container) {
      // Retry after a short delay if container isn't ready
      setTimeout(initGame, 100);
      return;
    }

    // Set the player's color index in the HexTile class
    HexTile.setPlayerColorIndex(playerColorIndex);

    // Determine which player is the current user (the one with "YOU" label)
    // by finding which game player has the current wallet
    const gamePlayers = (game as any).gamePlayers || [];
    const currentWallet = wallet.publicKey?.toString() || null;
    let currentUserColorIndex: number | null = null;
    
    if (currentWallet && gamePlayers.length > 0) {
      const currentUserPlayer = gamePlayers.find(
        (p: { publicKey: string; colorIndex: number } | null) => 
          p && p.publicKey === currentWallet
      );
      if (currentUserPlayer) {
        currentUserColorIndex = currentUserPlayer.colorIndex;
      }
    }
    
    // Set the current user's color index in HexTile
    HexTile.setCurrentUserColorIndex(currentUserColorIndex);

    // Calculate game dimensions to match MainScene's world bounds
    // This ensures all 11 rows and 13 columns are visible
    const hexWidth = GRID_CONFIG.HEX_SIZE * 2;
    const hexHeight = GRID_CONFIG.HEX_SIZE * Math.sqrt(3);
    
    // Calculate max pixel positions (same as MainScene)
    const maxPixelX = (GRID_CONFIG.GRID_SIZE_COLUMNS - 1) * (hexWidth * 0.5 + GRID_CONFIG.GAP);
    const maxPixelY = (GRID_CONFIG.GRID_SIZE_ROWS - 1) * (hexHeight * 0.75 + GRID_CONFIG.GAP);
    
    // Calculate world dimensions accounting for *2 multiplier in tile positioning
    const gameWidth = (GRID_CONFIG.OFFSET_WIDTH + maxPixelX) * 2 + hexWidth;
    const gameHeight = (GRID_CONFIG.OFFSET_HEIGHT + maxPixelY) * 2 + hexHeight;

    // Set game data in MainScene static variable before creating the game
    MainScene.gameData = game;

    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: gameWidth,
      height: gameHeight,
      scene: MainScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: gameWidth,
        height: gameHeight
      },
      backgroundColor: '#000000',
      powerPreference: 'high-performance',
      antialias: true,
      roundPixels: true,
      audio: {
        disableWebAudio: true
      },
      moveAllResources: moveAllResources
    } as Phaser.Types.Core.GameConfig & { moveAllResources: boolean };

    gameRef.current = new Phaser.Game(config);
  }, [playerColorIndex, game, wallet.publicKey]); // Depend on game data and wallet

  // Update current user color index and set up move resources callback when game or wallet changes
  useEffect(() => {
    if (game) {
      const gamePlayers = (game as any).gamePlayers || [];
      const currentWallet = wallet.publicKey?.toString() || null;
      let currentUserColorIndex: number | null = null;
      
      if (currentWallet && gamePlayers.length > 0) {
        const currentUserPlayer = gamePlayers.find(
          (p: { publicKey: string; colorIndex: number } | null) => 
            p && p.publicKey === currentWallet
        );
        if (currentUserPlayer) {
          currentUserColorIndex = currentUserPlayer.colorIndex;
        }
      }
      
      // Update the current user's color index in HexTile
      HexTile.setCurrentUserColorIndex(currentUserColorIndex);

      // Update the moveAllResources setting in HexTile
      HexTile.setMoveAllResources(moveAllResources);

      // Set up the move resources callback
      HexTile.setOnMoveResources(async (sourceTileIndex: number, destinationTileIndex: number, resourcesToMove: number) => {
        if (!client || !wallet.publicKey || !game) {
          throw new Error('Wallet not connected or game not loaded');
        }

        // Explicitly log the values being passed to the transaction
        console.log('Sending moveResources transaction with explicit values:', {
          sourceTileIndex,
          destinationTileIndex,
          resourcesToMove,
          sourceTileIndexType: typeof sourceTileIndex,
          destinationTileIndexType: typeof destinationTileIndex,
          resourcesToMoveType: typeof resourcesToMove,
          gameColumns: game.columns,
          gameRows: game.rows
        });

        // Validate indices are numbers and not NaN
        if (typeof sourceTileIndex !== 'number' || isNaN(sourceTileIndex)) {
          throw new Error(`Invalid sourceTileIndex: ${sourceTileIndex} (type: ${typeof sourceTileIndex})`);
        }
        if (typeof destinationTileIndex !== 'number' || isNaN(destinationTileIndex)) {
          throw new Error(`Invalid destinationTileIndex: ${destinationTileIndex} (type: ${typeof destinationTileIndex})`);
        }
        if (typeof resourcesToMove !== 'number' || isNaN(resourcesToMove)) {
          throw new Error(`Invalid resourcesToMove: ${resourcesToMove} (type: ${typeof resourcesToMove})`);
        }

        try {
          if (!client) {
            throw new Error('Client not initialized');
          }

          // Use client method instead of program.methods directly
          const tx = await client.moveResources(
            game.publicKey,
            sourceTileIndex,
            destinationTileIndex,
            resourcesToMove
          );

          // Wait for transaction confirmation
          await connection.confirmTransaction(tx);

          // Refresh game data after successful transaction
          setTimeout(() => {
            fetchGame();
          }, 1000);
        } catch (err) {
          console.error('Error in move resources transaction:', err);
          throw err;
        }
      });

      // Set up the attack tile callback
      HexTile.setOnAttackTile(async (attackerTileIndex: number, defenderTileIndex: number) => {
        if (!client || !wallet.publicKey || !game) {
          throw new Error('Wallet not connected or game not loaded');
        }

        console.log('Checking for existing attack:', {
          attackerTileIndex,
          defenderTileIndex,
          gameColumns: game.columns,
          gameRows: game.rows
        });

        // Validate indices
        if (typeof attackerTileIndex !== 'number' || isNaN(attackerTileIndex)) {
          throw new Error(`Invalid attackerTileIndex: ${attackerTileIndex}`);
        }
        if (typeof defenderTileIndex !== 'number' || isNaN(defenderTileIndex)) {
          throw new Error(`Invalid defenderTileIndex: ${defenderTileIndex}`);
        }

        try {
          if (!client) {
            throw new Error('Client not initialized');
          }

          // Get tile data
          const attackerTile = game.tileData[attackerTileIndex];
          const defenderTile = game.tileData[defenderTileIndex];
          
          if (!attackerTile || !defenderTile) {
            throw new Error('Invalid tile indices');
          }

          // Convert color from 1-4 to 0-3 index
          const attackerColor = attackerTile.color - 1;
          const defenderColor = defenderTile.color - 1;

          // Check if there's an existing defender account (ongoing attack)
          // This MUST happen before attempting to create a new attack
          // Use the exact same PDA calculation method as hexone.ts
          console.log('Checking for existing defender account for tile:', defenderTileIndex);
          
          let existingDefender = null;
          try {
            // Use the exact same PDA calculation as in hexone.ts attackTile method
            const defenderTileBuffer = Buffer.alloc(2);
            defenderTileBuffer.writeUInt16LE(defenderTileIndex, 0);
            const [defenderPda] = await PublicKey.findProgramAddress(
              [
                Buffer.from('defender'),
                game.publicKey.toBuffer(),
                defenderTileBuffer
              ],
              client.getProgram().programId
            );

            console.log('Defender PDA calculated (using hexone.ts method):', defenderPda.toString());

            // Check if account data is not null using connection directly
            const accountInfo = await connection.getAccountInfo(defenderPda);
            console.log('Account info *************  :', accountInfo);

            if (accountInfo && accountInfo.data !== null) {
              console.log('✅ Defender account exists! Account data is not null. Fetching...');
              // Account exists, fetch it
              const defenderData = await client.getProgram().account.defender.fetch(defenderPda);
              existingDefender = defenderData as any;
              console.log('✅ Defender account fetched successfully:', {
                attackerTileIndex: existingDefender.attackerTileIndex,
                defenderTileIndex: existingDefender.defenderTileIndex,
                isAttackResolved: existingDefender.isAttackResolved,
                attackStartedAt: existingDefender.attackStartedAt,
                attackerTileColor: existingDefender.attackerTileColor,
                defenderTileColor: existingDefender.defenderTileColor
              });
            } else {
              console.log('❌ Defender account does not exist or data is null at PDA:', defenderPda.toString());
            }
          } catch (error: any) {
            console.error('❌ Error checking defender account:', error?.message || error);
            // Account doesn't exist or error - continue with new attack
          }
          
          console.log('Defender account check result:', {
            exists: !!existingDefender,
            isResolved: existingDefender?.isAttackResolved,
            checkingTileIndex: defenderTileIndex,
            attackerTileIndex: existingDefender?.attackerTileIndex,
            defenderTileIndex: existingDefender?.defenderTileIndex,
            attackStartedAt: existingDefender?.attackStartedAt
          });

          // If defender account exists, show popup and do NOT send another attack tx
          if (existingDefender) {
            if (existingDefender.isAttackResolved) {
              console.log('Defender account exists but is already resolved - proceeding with new attack');
              // If resolved, we can proceed with a new attack
            } else {
              console.log('✅ Existing unresolved attack found - showing popup, NOT sending new attack transaction');
              
              // Type assert to ensure we have the right types
              const defender = existingDefender as {
                attackerTileIndex: number;
                defenderTileIndex: number;
                attackerTileColor: number;
                defenderTileColor: number;
                attackStartedAt: number;
                isAttackResolved: boolean;
              };

              // Calculate tile coordinates
              const attackerX = defender.attackerTileIndex % game.columns;
              const attackerY = Math.floor(defender.attackerTileIndex / game.columns);
              const defenderX = defender.defenderTileIndex % game.columns;
              const defenderY = Math.floor(defender.defenderTileIndex / game.columns);

              // Get current tile data (resources may have changed)
              const currentAttackerTile = game.tileData[defender.attackerTileIndex];
              const currentDefenderTile = game.tileData[defender.defenderTileIndex];

              if (!currentAttackerTile || !currentDefenderTile) {
                console.error('Could not find tile data for existing attack:', {
                  attackerTileIndex: defender.attackerTileIndex,
                  defenderTileIndex: defender.defenderTileIndex
                });
                // Still show popup even if tile data is missing
              }

              // Convert colors from 1-4 to 0-3 index
              const existingAttackerColor = defender.attackerTileColor - 1;
              const existingDefenderColor = defender.defenderTileColor - 1;

              // Set up attack popup data with existing attack
              const popupData = {
                attackerTileIndex: defender.attackerTileIndex,
                defenderTileIndex: defender.defenderTileIndex,
                attackerColor: existingAttackerColor,
                defenderColor: existingDefenderColor,
                attackerResources: currentAttackerTile?.resourceCount || 0,
                defenderResources: currentDefenderTile?.resourceCount || 0,
                attackerTileX: attackerX,
                attackerTileY: attackerY,
                defenderTileX: defenderX,
                defenderTileY: defenderY,
                attackStartedAt: defender.attackStartedAt
              };

              console.log('Setting attack popup data:', popupData);
              setAttackData(popupData);
              setAttackPopupOpen(true);
              setAttackResolved(false);
              setAttackResult(null);
              
              console.log('✅ Popup should now be visible - returning early to prevent new attack transaction');
              return; // Do NOT send another attack transaction
            }
          } else {
            console.log('No existing defender account found - proceeding with new attack');
          }

          // No existing attack or attack was resolved - proceed with new attack
          console.log('Sending attackTile transaction:', {
            attackerTileIndex,
            defenderTileIndex
          });

          // Calculate tile coordinates
          const attackerX = attackerTileIndex % game.columns;
          const attackerY = Math.floor(attackerTileIndex / game.columns);
          const defenderX = defenderTileIndex % game.columns;
          const defenderY = Math.floor(defenderTileIndex / game.columns);

          // Send attack transaction
          const tx = await client.attackTile(
            game.publicKey,
            attackerTileIndex,
            defenderTileIndex
          );

          // Wait for transaction confirmation
          await connection.confirmTransaction(tx);

          // Fetch defender account to get attack start time
          let attackStartedAt = Math.floor(Date.now() / 1000);
          try {
            const defender = await client.fetchDefender(game.publicKey, defenderTileIndex);
            if (defender && defender.attackStartedAt) {
              attackStartedAt = defender.attackStartedAt;
            }
          } catch (error) {
            console.error('Error fetching defender account:', error);
          }

          // Set up attack popup data
          setAttackData({
            attackerTileIndex,
            defenderTileIndex,
            attackerColor,
            defenderColor,
            attackerResources: attackerTile.resourceCount,
            defenderResources: defenderTile.resourceCount,
            attackerTileX: attackerX,
            attackerTileY: attackerY,
            defenderTileX: defenderX,
            defenderTileY: defenderY,
            attackStartedAt
          });
          setAttackPopupOpen(true);
          setAttackResolved(false);
          setAttackResult(null);
        } catch (err) {
          console.error('Error in attack tile transaction:', err);
          throw err;
        }
      });
    } else {
      // Clear callbacks if no game
      HexTile.setOnMoveResources(null);
      HexTile.setOnAttackTile(null);
    }
  }, [game, wallet.publicKey, connection, client, fetchGame, moveAllResources]);

  // Update moveAllResources setting in HexTile whenever it changes
  useEffect(() => {
    HexTile.setMoveAllResources(moveAllResources);
  }, [moveAllResources]);

  useEffect(() => {
    // Initialize game immediately when component mounts and game data is loaded
    if (!loading && game) {
      initGame();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [loading, game]); // Initialize when game data is loaded

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <p>Loading game details...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <p>{error || 'Game not found'}</p>
                  <button
                    onClick={handleBack}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Back to Games
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ height: '64px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #000000' }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ flex: 1 }}></div>
          <h1 
            onClick={() => navigate('/')}
            style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              margin: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            HEX<span style={{ color: '#f97316' }}>ONE</span>
          </h1>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
            {wallet.connected && balance !== null && (
              <span style={{ color: '#ffffff', fontSize: '14px' }}>
                {balance.toFixed(4)} SOL
              </span>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        width: '100%', 
        height: 'calc(100vh - 64px)',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden'
      }}>
        <div id="game-container" style={{ 
          width: '55%', 
          height: '100%',
          borderRight: '1px solid #333',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000000',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <style>{`
            #game-container canvas {
              display: block;
              margin: 0 auto;
              max-width: 100%;
              max-height: 100%;
            }
          `}</style>
        </div>
        <UI
          playerColorIndex={playerColorIndex}
          moveAllResources={moveAllResources}
          setMoveAllResources={setMoveAllResources}
          buttonStates={buttonStates}
          handleButtonClick={handleButtonClick}
          handleAddResources={handleAddResources}
          availableResources={availableResources}
          countdownSeconds={countdownSeconds}
          gamePlayers={game ? (game as any).gamePlayers : []}
          currentWallet={wallet.publicKey?.toString() || null}
          onJoinGame={handleJoinGame}
          joiningGame={joiningGame}
        />
      </div>

      {/* Attack Popup */}
      {attackPopupOpen && attackData && (
        <AttackPopup
          isOpen={attackPopupOpen}
          onClose={() => {
            setAttackPopupOpen(false);
            setAttackData(null);
            setAttackResolved(false);
            setAttackResult(null);
            // Refresh game data after closing
            fetchGame();
          }}
          attackerTileIndex={attackData.attackerTileIndex}
          defenderTileIndex={attackData.defenderTileIndex}
          attackerColor={attackData.attackerColor}
          defenderColor={attackData.defenderColor}
          attackerResources={attackData.attackerResources}
          defenderResources={attackData.defenderResources}
          attackerTileX={attackData.attackerTileX}
          attackerTileY={attackData.attackerTileY}
          defenderTileX={attackData.defenderTileX}
          defenderTileY={attackData.defenderTileY}
          attackStartedAt={attackData.attackStartedAt}
          isResolved={attackResolved}
          attackerWon={attackResult?.attackerWon}
          newAttackerResources={
            attackResult && game
              ? game.tileData[attackData.attackerTileIndex]?.resourceCount
              : undefined
          }
          newDefenderResources={
            attackResult && game
              ? game.tileData[attackData.defenderTileIndex]?.resourceCount
              : undefined
          }
          onResolveAttack={async () => {
            if (!client || !wallet.publicKey || !game || !attackData) {
              throw new Error('Wallet not connected or game not loaded');
            }

            try {
              // Resolve attack - use wallet as destination for rent
              const tx = await client.resolveAttack(
                game.publicKey,
                attackData.defenderTileIndex,
                wallet.publicKey
              );

              // Wait for transaction confirmation
              await connection.confirmTransaction(tx);

              // Fetch updated game data to get new resource counts
              await fetchGame();

              // Update attack result
              const updatedGame = await client.fetchGame(game.publicKey.toString());
              if (updatedGame) {
                const newAttackerResources = updatedGame.tileData[attackData.attackerTileIndex]?.resourceCount || 0;
                const newDefenderResources = updatedGame.tileData[attackData.defenderTileIndex]?.resourceCount || 0;
                const newDefenderColor = updatedGame.tileData[attackData.defenderTileIndex]?.color || 0;
                
                // Determine winner based on game state changes:
                // 1. If defender tile color changed to attacker's color, attacker won
                // 2. If defender resources decreased, attacker won
                // 3. Otherwise, defender won (attacker resources decreased)
                let attackerWon = false;
                const attackerColorValue = attackData.attackerColor + 1; // Convert 0-3 to 1-4
                if (newDefenderColor === attackerColorValue && newDefenderColor !== (attackData.defenderColor + 1)) {
                  // Defender tile was taken by attacker
                  attackerWon = true;
                } else if (newDefenderResources < attackData.defenderResources) {
                  // Defender lost resources
                  attackerWon = true;
                } else if (newAttackerResources < attackData.attackerResources) {
                  // Attacker lost resources
                  attackerWon = false;
                } else {
                  // Default: check if defender resources decreased (shouldn't happen, but fallback)
                  attackerWon = newDefenderResources < attackData.defenderResources;
                }

                setAttackResolved(true);
                setAttackResult({
                  attackerWon,
                  newAttackerResources,
                  newDefenderResources
                });
              }
            } catch (err) {
              console.error('Error resolving attack:', err);
              throw err;
            }
          }}
          onAttackAgain={async () => {
            if (!client || !wallet.publicKey || !game || !attackData) {
              throw new Error('Wallet not connected or game not loaded');
            }

            try {
              // Send new attack transaction with same tiles
              const tx = await client.attackTile(
                game.publicKey,
                attackData.attackerTileIndex,
                attackData.defenderTileIndex
              );

              // Wait for transaction confirmation
              await connection.confirmTransaction(tx);

              // Fetch updated game data
              await fetchGame();

              // Fetch defender account to get new attack start time
              let newAttackStartedAt = Math.floor(Date.now() / 1000);
              try {
                const defender = await client.fetchDefender(game.publicKey, attackData.defenderTileIndex);
                if (defender && defender.attackStartedAt) {
                  newAttackStartedAt = defender.attackStartedAt;
                }
              } catch (error) {
                console.error('Error fetching defender account:', error);
              }

              // Get updated tile data
              const updatedGame = await client.fetchGame(game.publicKey.toString());
              if (updatedGame) {
                const updatedAttackerTile = updatedGame.tileData[attackData.attackerTileIndex];
                const updatedDefenderTile = updatedGame.tileData[attackData.defenderTileIndex];

                // Update attack data with new attack
                setAttackData({
                  ...attackData,
                  attackerResources: updatedAttackerTile?.resourceCount || 0,
                  defenderResources: updatedDefenderTile?.resourceCount || 0,
                  attackStartedAt: newAttackStartedAt
                });

                // Clear resolved status and result
                setAttackResolved(false);
                setAttackResult(null);
              }
            } catch (err) {
              console.error('Error attacking again:', err);
              throw err;
            }
          }}
        />
      )}
    </div>
  );
};

export default Game; 