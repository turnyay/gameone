import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';
import IDL_JSON from '../idl/hexone.json';
import { GameAccount } from '../lib/hexone';
import Phaser from 'phaser';
import { MainScene } from '../components/game/MainScene';
import { HexTile } from '../components/game/HexTile';
import { UI } from '../components/game/UI';
import { INITIAL_RESOURCES, RESOURCE_REFRESH_RATE, RESOURCES_PER_REFRESH, GRID_CONFIG } from '../components/game/constants';

const PROGRAM_ID = new PublicKey('G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD');

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
  
  // Set up Anchor program for join game
  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    const provider = new AnchorProvider(connection, wallet as any, {});
    
    // Helper function to transform type definitions
    const transformType = (type: any): any => {
      if (typeof type === 'string') {
        if (type === 'pubkey') {
          return 'publicKey';
        }
        return type;
      }
      if (type && typeof type === 'object') {
        if (type.array) {
          return {
            array: Array.isArray(type.array) 
              ? [transformType(type.array[0]), type.array[1]]
              : transformType(type.array)
          };
        }
        if (type.defined) {
          return {
            defined: typeof type.defined === 'string' 
              ? type.defined 
              : type.defined.name
          };
        }
        if (type.option) {
          return {
            option: transformType(type.option)
          };
        }
        if (type.vec) {
          return {
            vec: transformType(type.vec)
          };
        }
      }
      return type;
    };

    const toCamelCase = (str: string): string => {
      return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    };

    const transformedIdl: Idl = {
      version: IDL_JSON.metadata.version,
      name: IDL_JSON.metadata.name,
      instructions: IDL_JSON.instructions.map((ix: any) => ({
        name: ix.name,
        accounts: ix.accounts.map((acc: any) => ({
          name: toCamelCase(acc.name),
          isMut: acc.writable || false,
          isSigner: acc.signer || false,
        })),
        args: (ix.args || []).map((arg: any) => ({
          name: arg.name,
          type: transformType(arg.type),
        })),
      })),
      accounts: (IDL_JSON.accounts || []).map((acc: any) => ({
        name: acc.name,
        type: {
          kind: 'struct' as const,
          fields: (acc.type?.fields || []).map((field: any) => ({
            name: field.name,
            type: transformType(field.type),
          })),
        },
      })),
      types: (IDL_JSON.types || []).map((type: any) => ({
        name: type.name,
        type: {
          kind: type.type?.kind || 'struct',
          fields: (type.type?.fields || []).map((field: any) => ({
            name: field.name,
            type: transformType(field.type),
          })),
        },
      })),
      errors: IDL_JSON.errors || [],
    };
    
    return new Program(transformedIdl, PROGRAM_ID, provider);
  }, [connection, wallet]);

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
    if (!program || !wallet.publicKey || !game) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setJoiningGame(true);
      setError(null);

      // Find player PDA
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Call join_game instruction
      const tx = await program.methods
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
  }, [playerColorIndex, game]); // Depend on game data as well

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
    </div>
  );
};

export default Game; 