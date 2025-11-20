import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, Keypair } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { HexoneClient, GameAccount, PROGRAM_ID } from '../lib/hexone';
import { Buffer } from 'buffer';

export function longToByteArray(long: number): number[] {
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index += 1) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return byteArray;
}

// Helper functions for hotwallet management
const getHotwalletKey = (walletPubkey: string) => `hexone_hotwallet_${walletPubkey}`;

const getOrCreateHotwallet = (walletPubkey: string): Keypair => {
  const storageKey = getHotwalletKey(walletPubkey);
  const stored = localStorage.getItem(storageKey);
  
  if (stored) {
    try {
      const secretKey = JSON.parse(stored);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch (err) {
      console.error('Error parsing stored hotwallet:', err);
    }
  }
  
  // Generate new hotwallet
  const hotwallet = Keypair.generate();
  localStorage.setItem(storageKey, JSON.stringify(Array.from(hotwallet.secretKey)));
  return hotwallet;
};

const Games: React.FC = () => {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [platformPda, setPlatformPda] = useState<PublicKey | null>(null);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [games, setGames] = useState<GameAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [playerAccount, setPlayerAccount] = useState<any | null>(null);
  const [checkingPlayer, setCheckingPlayer] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [treasuryBalances, setTreasuryBalances] = useState<Map<string, number>>(new Map());
  const [hotwalletBalance, setHotwalletBalance] = useState<number | null>(null);
  const [transferringToHotwallet, setTransferringToHotwallet] = useState(false);

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
    fetchPlatformInfo();
  }, [connection]);

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

  // Check if player account exists
  useEffect(() => {
    const checkPlayerAccount = async () => {
      if (!wallet.publicKey || !connection) {
        setPlayerAccount(null);
        return;
      }

      try {
        setCheckingPlayer(true);
        if (!client) {
          setPlayerAccount(null);
          return;
        }
        // Find player PDA
        const [playerPda] = await PublicKey.findProgramAddress(
          [Buffer.from('player'), wallet.publicKey.toBuffer()],
          client.getProgram().programId
        );

        // Use Anchor's account decoding to fetch player account
        let playerAccount: any;
        try {
          playerAccount = await client.getProgram().account.player.fetch(playerPda);
        } catch (err) {
          // Account doesn't exist or failed to decode
          setPlayerAccount(null);
          return;
        }

        // Parse name from bytes
        const nameBytes = playerAccount.name;
        const name = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim() || wallet.publicKey.toString().slice(0, 8);

        const playerData = {
          publicKey: playerPda,
          wallet: playerAccount.wallet,
          name,
          gamesPlayed: playerAccount.gamesPlayed || 0,
          gamesWon: playerAccount.gamesWon || 0,
          lastGame: playerAccount.lastGame || null,
          createdAt: playerAccount.createdAt ? Number(playerAccount.createdAt) : 0,
          playerStatus: playerAccount.playerStatus,
          version: playerAccount.version,
          bump: playerAccount.bump,
          hotwallet: playerAccount.hotwallet,
        };

        // Debug: log the hotwallet
        console.log('Player account hotwallet:', playerAccount.hotwallet?.toString());
        console.log('Is default pubkey?', playerAccount.hotwallet?.equals(PublicKey.default));

        setPlayerAccount(playerData);
      } catch (err) {
        console.error('Error checking player account:', err);
        setPlayerAccount(null);
      } finally {
        setCheckingPlayer(false);
      }
    };

    checkPlayerAccount();
  }, [wallet.publicKey, connection, client]);

  // Function to fetch hotwallet balance
    const fetchHotwalletBalance = async () => {
      if (!playerAccount?.hotwallet || !connection) {
        setHotwalletBalance(null);
        return;
      }

      try {
        const balanceLamports = await connection.getBalance(playerAccount.hotwallet);
        // Convert lamports to SOL - store as number but we'll format on display
        // Divide by 1e9 to get SOL, keeping full precision
        const balanceSOL = balanceLamports / 1e9;
        setHotwalletBalance(balanceSOL);
      } catch (err) {
        console.error('Error fetching hotwallet balance:', err);
        setHotwalletBalance(null);
      }
    };

  // Fetch hotwallet balance when player account is loaded
  useEffect(() => {
    // Fetch immediately on load
    if (playerAccount?.hotwallet) {
      fetchHotwalletBalance();
    }
    // Refresh balance every 5 seconds
    const interval = setInterval(fetchHotwalletBalance, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerAccount?.hotwallet, connection]);

  // Transfer 0.05 SOL to hotwallet
  const handleTransferToHotwallet = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction || !playerAccount?.hotwallet || !connection) {
      setError('Wallet not connected or hotwallet not available');
      return;
    }

    setTransferringToHotwallet(true);
    setError(null);

    try {
      const transferAmount = 0.05; // SOL
      const lamports = transferAmount * 1e9; // Convert to lamports

      // Create transfer instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: playerAccount.hotwallet,
          lamports: lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Send and confirm transaction
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log(`[TRANSFER] Successfully transferred ${transferAmount} SOL to hotwallet:`, signature);

      // Refresh balances
      await fetchHotwalletBalance();
      if (wallet.publicKey) {
        const newBalance = await connection.getBalance(wallet.publicKey);
        setBalance(newBalance / 1e9);
      }
    } catch (err) {
      console.error('Error transferring SOL to hotwallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer SOL to hotwallet';
      setError(errorMessage);
    } finally {
      setTransferringToHotwallet(false);
    }
  };

  const fetchPlatformInfo = async () => {
    try {
      setLoading(true);
      // Use read-only client for fetching platform info
      const readOnlyClient = HexoneClient.createReadOnly();
      // Get platform account
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        readOnlyClient.getProgram().programId
      );
      setPlatformPda(pda);

      // Get platform account data
      const platformAccountInfo = await connection.getAccountInfo(pda);
      if (!platformAccountInfo) {
        throw new Error('Platform account not found');
      }

      // Read game count from platform account data
      // Platform structure: 8 bytes discriminator + 32 bytes admin + 8 bytes game_count (u64)
      const count = Number(platformAccountInfo.data.readBigUInt64LE(40));
      console.log('Game count from platform:', count);
      setGameCount(count);

      if (count === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      // Fetch all games
      const allGames: GameAccount[] = [];
      for (let i = 0; i < count; i++) {
        // Convert game count to 8-byte little-endian buffer (as per test file)
        const gameCountBuffer = Buffer.alloc(8);
        gameCountBuffer.writeBigUInt64LE(BigInt(i), 0);

        // Use read-only client for fetching games
        const readOnlyClient = HexoneClient.createReadOnly();
        // Find the PDA using the correct seed format
        const [gamePda] = await PublicKey.findProgramAddress(
          [Buffer.from('GAME-'), gameCountBuffer],
          readOnlyClient.getProgram().programId
        );
        
        console.log(`Fetching game ${i}, PDA: ${gamePda.toString()}`);

        try {
          // Get game account data
          const gameAccountInfo = await connection.getAccountInfo(gamePda);
          if (!gameAccountInfo) {
            continue; // Skip if game doesn't exist
          }

          // Skip 8 bytes for Anchor discriminator
          const data = gameAccountInfo.data.slice(8);
          
          // Read pubkeys (32 bytes each)
          const admin = new PublicKey(data.slice(0, 32));
          const player1 = new PublicKey(data.slice(32, 64));
          const player2 = new PublicKey(data.slice(64, 96));
          const player3 = new PublicKey(data.slice(96, 128));
          const player4 = new PublicKey(data.slice(128, 160));
          
          // Read game_id (8 bytes)
          const gameId = data.readBigUInt64LE(160);
          
          // Read available_resources_timestamp (i64, 8 bytes)
          const availableResourcesTimestamp = Number(data.readBigInt64LE(168));
          
          // Read xp_timestamp_player1-4 (i64 each, 8 bytes each)
          const xpTimestampPlayer1 = Number(data.readBigInt64LE(176));
          const xpTimestampPlayer2 = Number(data.readBigInt64LE(184));
          const xpTimestampPlayer3 = Number(data.readBigInt64LE(192));
          const xpTimestampPlayer4 = Number(data.readBigInt64LE(200));
          
          // Read resources_per_minute (u32, 4 bytes)
          const resourcesPerMinute = data.readUInt32LE(208);
          
          // Read total_resources_available (u32, 4 bytes)
          const totalResourcesAvailable = data.readUInt32LE(212);
          
          // Read resources_spent_player1-4 (u32 each, 4 bytes each)
          const resourcesSpentPlayer1 = data.readUInt32LE(216);
          const resourcesSpentPlayer2 = data.readUInt32LE(220);
          const resourcesSpentPlayer3 = data.readUInt32LE(224);
          const resourcesSpentPlayer4 = data.readUInt32LE(228);
          
          // Read xp_per_minute_per_tile (u32, 4 bytes)
          const xpPerMinutePerTile = data.readUInt32LE(232);
          
          // Read xp_player1-4 (u32 each, 4 bytes each)
          const xpPlayer1 = data.readUInt32LE(236);
          const xpPlayer2 = data.readUInt32LE(240);
          const xpPlayer3 = data.readUInt32LE(244);
          const xpPlayer4 = data.readUInt32LE(248);
          
          // Read tile_count_color1-4 (u32 each, 4 bytes each)
          const tileCountColor1 = data.readUInt32LE(252);
          const tileCountColor2 = data.readUInt32LE(256);
          const tileCountColor3 = data.readUInt32LE(260);
          const tileCountColor4 = data.readUInt32LE(264);
          
          // Skip _padding_u32 (4 bytes)
          
          // Read tile_data (144 * 4 bytes) - starts at offset 272
          // Each TileData is: color (u8) + _pad (u8) + resource_count (u16) = 4 bytes
          const parsedTileData: Array<{ color: number; resourceCount: number }> = [];
          for (let j = 0; j < 144; j++) {
            const offset = 272 + (j * 4);
            const color = data.readUInt8(offset);
            const resourceCount = data.readUInt16LE(offset + 2);
            parsedTileData.push({ color, resourceCount });
          }
          
          // Read tier counts (16 u8s = 16 bytes) - starts after tileData
          const tierCountsOffset = 272 + (144 * 4);
          
          // Read tier bonus XP per minute (4 u8s = 4 bytes)
          const tierBonusXpOffset = tierCountsOffset + 16;
          
          // Skip padding (4 bytes) + winning_player_pubkey (32 bytes) + winning_xp_limit (8 bytes)
          const paddingOffset = tierBonusXpOffset + 4;
          const winningPlayerPubkeyOffset = paddingOffset + 4;
          const winningXpLimitOffset = winningPlayerPubkeyOffset + 32;
          
          // Read game state and other fields - game_state is at winningXpLimitOffset + 8
          const gameStateOffset = winningXpLimitOffset + 8;
          const gameState = data.length > gameStateOffset ? data.readUInt8(gameStateOffset) : 0;
          const rows = data.length > gameStateOffset + 1 ? data.readUInt8(gameStateOffset + 1) : 11;
          const columns = data.length > gameStateOffset + 2 ? data.readUInt8(gameStateOffset + 2) : 13;
          
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
            case 3:
              gameStateStr = 'Winner Found (Not Paid Out)';
              break;
            default:
              gameStateStr = `Unknown (${gameState})`;
          }

          const tilesCovered = parsedTileData.filter(tile => tile.color !== 0).length;
          const totalTiles = 137; // Fixed total tiles for the game board

          const game: GameAccount = {
            publicKey: gamePda,
            status: gameStateStr,
            players: [player1, player2, player3, player4].filter(pk => !pk.equals(PublicKey.default)),
            tilesCovered,
            totalTiles,
            tilesCoveredPercent: totalTiles ? (tilesCovered / totalTiles) * 100 : 0,
            cost: 0, // Cost is not stored in the game account
            tileData: parsedTileData,
            rows,
            columns,
            resourcesPerMinute
          };
          
          // Store game ID for display
          (game as any).gameId = Number(gameId);

          allGames.push(game);
          console.log(`Successfully fetched game ${i}`);
        } catch (error) {
          console.error(`Error fetching game ${i}:`, error);
          // Continue to next game
        }
      }

      console.log(`Fetched ${allGames.length} games out of ${count} total`);
      setGames(allGames);
      setError(null);
      
      // Fetch treasury balances for all games
      await fetchTreasuryBalances(allGames);
    } catch (err) {
      console.error('Error in fetchPlatformInfo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch platform info';
      setError(errorMessage);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryBalances = async (gamesList: GameAccount[]) => {
    if (!connection) return;
    
    const balances = new Map<string, number>();
    
    for (const game of gamesList) {
      try {
        // Derive treasury PDA
        const [treasuryPda] = await PublicKey.findProgramAddress(
          [Buffer.from('game_treasury'), game.publicKey.toBuffer()],
          PROGRAM_ID
        );
        
        // Fetch balance
        const balance = await connection.getBalance(treasuryPda);
        balances.set(game.publicKey.toString(), balance / 1e9); // Convert lamports to SOL
      } catch (err) {
        console.error(`Error fetching treasury balance for game ${game.publicKey.toString()}:`, err);
        balances.set(game.publicKey.toString(), 0);
      }
    }
    
    setTreasuryBalances(balances);
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const handleCreatePlayer = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setCreatingPlayer(true);
      setError(null);

      // Find player PDA
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), wallet.publicKey.toBuffer()],
        client.getProgram().programId
      );

      // Find platform PDA
      const [platformPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        client.getProgram().programId
      );

      // Get or create hotwallet for this specific wallet address
      const hotwallet = getOrCreateHotwallet(wallet.publicKey.toString());
      console.log('Hotwallet pubkey to save:', hotwallet.publicKey.toString());
      console.log('Hotwallet keypair secret key length:', hotwallet.secretKey.length);
      
      // Verify hotwallet is not default
      if (hotwallet.publicKey.equals(PublicKey.default)) {
        throw new Error('Generated hotwallet is invalid (default pubkey)');
      }

      // Create name buffer (32 bytes)
      const name = Buffer.alloc(32);
      const playerName = wallet.publicKey.toString().slice(0, 31);
      Buffer.from(playerName).copy(name);

      // Call create_player instruction using client
      const createPlayerTx = await client.getProgram().methods
        .createPlayer(Array.from(name), hotwallet.publicKey)
        .accounts({
          wallet: wallet.publicKey,
          platform: platformPda,
          player: playerPda,
          system_program: SystemProgram.programId,
        })
        .rpc();

      console.log('Create player transaction:', createPlayerTx);

      // Transfer 0.05 SOL to hotwallet for transaction fees
      const transferAmount = 0.05 * 1e9; // Convert to lamports
      const transferIx = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: hotwallet.publicKey,
        lamports: transferAmount,
      });

      const transferTx = new Transaction().add(transferIx);
      const { blockhash } = await connection.getLatestBlockhash();
      transferTx.recentBlockhash = blockhash;
      transferTx.feePayer = wallet.publicKey;

      const signedTransferTx = await wallet.signTransaction!(transferTx);
      const transferTxSignature = await connection.sendRawTransaction(signedTransferTx.serialize());
      await connection.confirmTransaction(transferTxSignature, 'confirmed');

      console.log('Hotwallet funding transaction:', transferTxSignature);
      setError(null);
      alert('Player created successfully and hotwallet funded with 0.05 SOL!');
      // Wait a bit for the account to be created, then re-check
      setTimeout(() => {
        // Trigger re-check by updating wallet dependency (force re-run of useEffect)
        const checkPlayerAccount = async () => {
          if (!wallet.publicKey || !connection) return;
          
          try {
            if (!client) return;
            setCheckingPlayer(true);
            const [playerPda] = await PublicKey.findProgramAddress(
              [Buffer.from('player'), wallet.publicKey.toBuffer()],
              client.getProgram().programId
            );
            
            // Use Anchor's account decoding
            let playerAccount: any;
            try {
              playerAccount = await client.getProgram().account.player.fetch(playerPda);
            } catch (err) {
              setPlayerAccount(null);
              return;
            }

            // Parse name from bytes
            const nameBytes = playerAccount.name;
            const name = Buffer.from(nameBytes).toString('utf8').replace(/\0/g, '').trim() || wallet.publicKey.toString().slice(0, 8);

            setPlayerAccount({
              publicKey: playerPda,
              wallet: playerAccount.wallet,
              name,
              gamesPlayed: playerAccount.gamesPlayed || 0,
              gamesWon: playerAccount.gamesWon || 0,
              lastGame: playerAccount.lastGame || null,
              createdAt: playerAccount.createdAt ? Number(playerAccount.createdAt) : 0,
              playerStatus: playerAccount.playerStatus,
              version: playerAccount.version,
              bump: playerAccount.bump,
              hotwallet: playerAccount.hotwallet,
            });
          } catch (err) {
            console.error('Error checking player account:', err);
            setPlayerAccount(null);
          } finally {
            setCheckingPlayer(false);
          }
        };
        
        checkPlayerAccount();
      }, 2000);
    } catch (err) {
      console.error('Error creating player:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create player';
      setError(errorMessage);
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleCreateGame = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setCreatingGame(true);
      setError(null);

      // Find platform PDA
      const [platformPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        client.getProgram().programId
      );

      // Get platform account to get current game count
      const platformAccountInfo = await connection.getAccountInfo(platformPda);
      if (!platformAccountInfo) {
        throw new Error('Platform account not found');
      }

      // Read game count from platform account data
      // Platform structure: 8 bytes discriminator + 32 bytes admin + 8 bytes game_count (u64)
      const gameCount = Number(platformAccountInfo.data.readBigUInt64LE(40));

      // Convert game count to 8-byte little-endian buffer
      const gameCountBuffer = Buffer.alloc(8);
      gameCountBuffer.writeBigUInt64LE(BigInt(gameCount), 0);

      // Find game PDA using platform game count
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('GAME-'), gameCountBuffer],
        client.getProgram().programId
      );

      // Find player PDA for join_game
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), wallet.publicKey.toBuffer()],
        client.getProgram().programId
      );

      // Derive game treasury PDA
      const [gameTreasuryPda] = await PublicKey.findProgramAddress(
        [Buffer.from('game_treasury'), gamePda.toBuffer()],
        client.getProgram().programId
      );

      // Build both instructions in a single transaction using client
      const createGameIx = await client.getProgram().methods
        .createGame()
        .accounts({
          admin: wallet.publicKey,
          platform: platformPda,
          game: gamePda,
          system_program: SystemProgram.programId,
        })
        .instruction();

      // Convert game count to BN for joinGame
      const gameIdBN = new BN(gameCount);

      const joinGameIx = await client.getProgram().methods
        .joinGame(gameIdBN)
        .accounts({
          wallet: wallet.publicKey,
          player: playerPda,
          platform: platformPda,
          game: gamePda,
          gameTreasury: gameTreasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Combine instructions in a single transaction
      const transaction = new Transaction().add(createGameIx, joinGameIx);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      
      // Sign and send the transaction
      const signedTx = await wallet.signTransaction!(transaction);
      const tx = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
      
      console.log('Create and join game transaction:', tx);
      setError(null);
      alert('Game created and joined successfully!');
      
      // Refresh games list
      setTimeout(() => {
        fetchPlatformInfo();
      }, 2000);
    } catch (err) {
      console.error('Error creating game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create game';
      setError(errorMessage);
    } finally {
      setCreatingGame(false);
    }
  };

  return (
    <div>
      <div style={{ height: '64px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #000000' }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ flex: 1 }}></div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
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

      <div 
        className="games-scroll-container"
        style={{ 
          width: '100%', 
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#1a1a1a',
          padding: '40px 20px',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)'
        }}>
        {/* Player Account Section */}
        {wallet.connected && (
          <div style={{ marginBottom: '30px' }}>
            {checkingPlayer ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                color: '#888',
                fontSize: '14px'
              }}>
                Checking player account...
              </div>
            ) : playerAccount ? (
              <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px'
              }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: '#ffffff',
                  margin: 0
                }}>
                  My Player
                </h3>
                  {playerAccount?.hotwallet && (
                    <button
                      onClick={handleTransferToHotwallet}
                      disabled={!wallet.connected || transferringToHotwallet || !playerAccount?.hotwallet}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: transferringToHotwallet ? '#666' : '#f97316',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: (!wallet.connected || transferringToHotwallet || !playerAccount?.hotwallet) ? 'not-allowed' : 'pointer',
                        opacity: (!wallet.connected || transferringToHotwallet || !playerAccount?.hotwallet) ? 0.6 : 1
                      }}
                    >
                      {transferringToHotwallet ? 'Transferring...' : 'Add 0.05 SOL to Hotwallet'}
                    </button>
                  )}
                </div>
                <div style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                  padding: '24px',
                  border: '1px solid #333',
                  color: '#ffffff'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    {playerAccount?.hotwallet && (
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#f97316',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        marginBottom: '4px'
                      }}>
                        Hotwallet: {playerAccount.hotwallet.toString()} ({hotwalletBalance !== null ? hotwalletBalance.toFixed(4) : '0.0000'} SOL)
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#888',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      marginTop: '8px'
                    }}>
                      Player account: {playerAccount.publicKey.toString()}
                    </div>
                  </div>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    fontSize: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Games Played:</span>
                      <span style={{ color: '#ffa500' }}>{playerAccount.gamesPlayed}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Games Won:</span>
                      <span style={{ color: '#00ff00' }}>{playerAccount.gamesWon}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Status:</span>
                      <span style={{ 
                        color: playerAccount.playerStatus === 1 ? '#00ff00' : '#ffa500'
                      }}>
                        {playerAccount.playerStatus === 1 ? 'Ready' : 'Playing'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Win Rate:</span>
                      <span style={{ color: '#ffa500' }}>
                        {playerAccount.gamesPlayed > 0 
                          ? ((playerAccount.gamesWon / playerAccount.gamesPlayed) * 100).toFixed(1)
                          : '0'
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '20px' 
              }}>
                <button
                  onClick={handleCreatePlayer}
                  disabled={!wallet.connected || creatingPlayer}
                  style={{
                    backgroundColor: wallet.connected ? '#f97316' : '#666',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: wallet.connected && !creatingPlayer ? 'pointer' : 'not-allowed',
                    opacity: wallet.connected && !creatingPlayer ? 1 : 0.6,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (wallet.connected && !creatingPlayer) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallet.connected && !creatingPlayer) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {creatingPlayer ? 'Creating Player...' : 'Create Player'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Games Title and Create Game Button */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          maxWidth: '1400px',
          margin: '0 auto 30px auto'
        }}>
          <div style={{ flex: 1 }}></div>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#ffffff',
            margin: 0
          }}>
            Games
          </h2>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {wallet.connected && (
              <button
                onClick={handleCreateGame}
                disabled={creatingGame}
                style={{
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: !creatingGame ? 'pointer' : 'not-allowed',
                  opacity: !creatingGame ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!creatingGame) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingGame) {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {creatingGame ? 'Creating Game...' : 'Create Game'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            backgroundColor: '#330000', 
            border: '1px solid #ff0000', 
            color: '#ff6666', 
            borderRadius: '4px' 
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#ffffff',
            fontSize: '18px'
          }}>
            Loading games...
          </div>
        ) : (
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {games.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px'
              }}>
                {games.map((game) => (
                  <div
                    key={game.publicKey.toString()}
                    onClick={() => handleGameClick(game.publicKey.toString())}
                    style={{
                      backgroundColor: '#2a2a2a',
                      borderRadius: '8px',
                      padding: '24px',
                      cursor: 'pointer',
                      border: '1px solid #333',
                      transition: 'all 0.2s ease',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#333';
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        marginBottom: '8px',
                        color: '#f97316'
                      }}>
                        Game # {String((game as any).gameId ?? 0).padStart(6, '0')}
                      </h3>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#888',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {game.publicKey.toString()}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Status:</span>
                        <span style={{ 
                          color: game.status === 'In Progress' ? '#00ff00' : 
                                 game.status === 'Completed' ? '#ffa500' :
                                 game.status === 'Winner Found (Not Paid Out)' ? '#ff8800' : '#888'
                        }}>
                          {game.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Players:</span>
                        <span style={{ color: '#ffa500' }}>{game.players.length}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Tiles Covered:</span>
                        <span style={{ color: '#ffa500' }}>
                          {game.tilesCovered} / {game.totalTiles} ({game.tilesCoveredPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Game Prize:</span>
                        <span style={{ color: '#ffa500' }}>
                          {treasuryBalances.has(game.publicKey.toString()) 
                            ? `${treasuryBalances.get(game.publicKey.toString())!.toFixed(5)} SOL`
                            : 'Loading...'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#888',
                fontSize: '18px'
              }}>
                No games found
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .games-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .games-scroll-container::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .games-scroll-container::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        .games-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        /* Firefox */
        .games-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #444 #1a1a1a;
        }
      `}</style>
    </div>
  );
};

export default Games; 