import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hexone } from "../target/types/hexone";
import { PublicKey, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

// Program ID from Anchor.toml
const PROGRAM_ID = new PublicKey("4hCMsw4pRN8VsyPg6USUEyEmnX5VTApEAWyEmMdrrtGj");

// Game constants
const RESOURCES_PER_MINUTE = 10;

describe("hexone", () => {
  // Flag to run devnet-only tests (skip airdrops and game creation)
  const devnetOnly = true;

  // Target wallets (used for airdrops and transfers)
  const targetWallet1 = new PublicKey("9C6MuwjX9wHYp8Rtvn4fksHNtvqD3TnpRcehZbXWn1pG");
  const targetWallet2 = new PublicKey("BHC5zYpPGcfCpo6oUHZsozjA1vE9bRiZCNLprrPasLg7");
  const targetWallet3 = new PublicKey("7MyLbGM3NuJo2EEaqMfS4QAyRhBvKG4tTRQWrtdiDHLM");
  const targetWallet4 = new PublicKey("4a3iJz8nv3ZyPaTzJsugvMSzNvsYC6uQ4NXX5cY33ygb");

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.hexone as Program<Hexone>;
  const provider = anchor.getProvider();

  // Global variables for hotwallets (set in Create Players test)
  let hotwallet1: Keypair;
  let hotwallet2: Keypair;
  let hotwallet3: Keypair;
  let hotwallet4: Keypair;

  // Helper function to log tier counts for all players
  const logTierCounts = async (gamePDA: PublicKey, label: string = "Tier Counts") => {
    try {
      const gameAccount = await program.account.game.fetch(gamePDA);
      const getNumber = (value: any): number => {
        return typeof value === 'number' ? value : value.toNumber();
      };

      console.log(`\n=== ${label} ===`);
      console.log("Player 1 (Red):");
      console.log(`  Gold:   ${getNumber(gameAccount.goldTileCountPlayer1)}`);
      console.log(`  Silver: ${getNumber(gameAccount.silverTileCountPlayer1)}`);
      console.log(`  Bronze: ${getNumber(gameAccount.bronzeTileCountPlayer1)}`);
      console.log(`  Iron:   ${getNumber(gameAccount.ironTileCountPlayer1)}`);
      
      console.log("Player 2 (Yellow):");
      console.log(`  Gold:   ${getNumber(gameAccount.goldTileCountPlayer2)}`);
      console.log(`  Silver: ${getNumber(gameAccount.silverTileCountPlayer2)}`);
      console.log(`  Bronze: ${getNumber(gameAccount.bronzeTileCountPlayer2)}`);
      console.log(`  Iron:   ${getNumber(gameAccount.ironTileCountPlayer2)}`);
      
      console.log("Player 3 (Green):");
      console.log(`  Gold:   ${getNumber(gameAccount.goldTileCountPlayer3)}`);
      console.log(`  Silver: ${getNumber(gameAccount.silverTileCountPlayer3)}`);
      console.log(`  Bronze: ${getNumber(gameAccount.bronzeTileCountPlayer3)}`);
      console.log(`  Iron:   ${getNumber(gameAccount.ironTileCountPlayer3)}`);
      
      console.log("Player 4 (Blue):");
      console.log(`  Gold:   ${getNumber(gameAccount.goldTileCountPlayer4)}`);
      console.log(`  Silver: ${getNumber(gameAccount.silverTileCountPlayer4)}`);
      console.log(`  Bronze: ${getNumber(gameAccount.bronzeTileCountPlayer4)}`);
      console.log(`  Iron:   ${getNumber(gameAccount.ironTileCountPlayer4)}`);
      console.log("==================\n");
    } catch (error) {
      console.error("Error logging tier counts:", error);
    }
  };

  // Test accounts
  // Use saved keypair for admin if devnetOnly, otherwise generate new one
  let admin: Keypair;
  if (devnetOnly) {
    const keypairPath = path.join(process.env.HOME || "/home/mike", ".config", "solana", "id.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    admin = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log(`✓ Using admin keypair from ${keypairPath}: ${admin.publicKey.toBase58()}`);
  } else {
    admin = Keypair.generate();
  }
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();
  const player3 = Keypair.generate();
  const player4 = Keypair.generate();

  // PDAs
  let platformPDA: PublicKey;
  let gamePDA: PublicKey;
  let player1PDA: PublicKey;
  let player2PDA: PublicKey;
  let player3PDA: PublicKey;
  let player4PDA: PublicKey;

  // Wait 1 minute before starting tests to avoid rate limiting (runs first, blocks all tests)
  before(async function() {
    console.log("\n⏳ Waiting 60 seconds before starting tests to avoid RPC rate limiting...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("✓ Wait complete, starting tests...\n");
  });

  before(async () => {
    try {
      // Skip airdrops if devnetOnly flag is set
      if (!devnetOnly) {
        // Airdrop SOL to admin and players (increased amount to 10 SOL)
        const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
        const airdropPromises = [
          provider.connection.requestAirdrop(admin.publicKey, airdropAmount),
          provider.connection.requestAirdrop(player1.publicKey, airdropAmount),
          provider.connection.requestAirdrop(player2.publicKey, airdropAmount),
          provider.connection.requestAirdrop(player3.publicKey, airdropAmount),
          provider.connection.requestAirdrop(player4.publicKey, airdropAmount),
          provider.connection.requestAirdrop(targetWallet1, airdropAmount),
          provider.connection.requestAirdrop(targetWallet2, airdropAmount),
          provider.connection.requestAirdrop(targetWallet3, airdropAmount),
          provider.connection.requestAirdrop(targetWallet4, airdropAmount),
        ];
        await Promise.all(airdropPromises);

        // Wait for airdrops to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log("⚠️  devnetOnly mode: Skipping airdrops");
        
        // Transfer 0.25 SOL to target wallets from admin account
        const transferAmount = 0.25 * anchor.web3.LAMPORTS_PER_SOL;
        
        console.log(`\n💸 Transferring 0.25 SOL to target wallets from admin (${admin.publicKey.toBase58()})...`);
        
        const transferPromises = [
          targetWallet1,
          targetWallet2,
          targetWallet3,
          targetWallet4,
        ].map(async (targetWallet) => {
          try {
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: admin.publicKey,
                toPubkey: targetWallet,
                lamports: transferAmount,
              })
            );
            
            const { blockhash } = await provider.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = admin.publicKey;
            transaction.sign(admin);
            
            const signature = await provider.connection.sendRawTransaction(transaction.serialize());
            await provider.connection.confirmTransaction(signature);
            console.log(`  ✓ Transferred 0.25 SOL to ${targetWallet.toBase58()}`);
            return signature;
          } catch (error) {
            console.error(`  ✗ Failed to transfer to ${targetWallet.toBase58()}:`, error);
            throw error;
          }
        });
        
        await Promise.all(transferPromises);
        console.log("✓ All transfers completed\n");
      }

      // Find PDAs
      [platformPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        PROGRAM_ID
      );

    } catch (error) {
      console.error("Error in before hook:", error);
      throw error;
    }
  });

  // Add 30 second delay after each test to avoid rate limiting
  afterEach(async function() {
    const testName = this.currentTest?.title || "test";
    console.log(`\n⏳ Waiting 30 seconds after "${testName}" to avoid RPC rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log("✓ Wait complete, proceeding to next test...\n");
  });

  it("Create Platform", async () => {
    try {
      const tx = await program.methods
        .createPlatform()
        .accounts({
          admin: admin.publicKey,
          platform: platformPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      console.log("Create Platform tx:", tx);

      // Fetch and verify platform account
      const platform = await program.account.platform.fetch(platformPDA);
      expect(platform.admin.toString()).to.equal(admin.publicKey.toString());
      expect(platform.gameCount.toNumber()).to.equal(0);
      expect(platform.gamesCompleted.toNumber()).to.equal(0);
      expect(platform.totalPlayers.toNumber()).to.equal(0);
      expect(platform.version).to.equal(1);
    } catch (error) {
      console.error("Error creating platform:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Create Game", async () => {
    try {
      // Get platform account to get game count
      const platform = await program.account.platform.fetch(platformPDA);
      const gameCount = platform.gameCount.toNumber();

      // Convert game count to 8-byte little-endian buffer
      const gameCountBuffer = Buffer.alloc(8);
      gameCountBuffer.writeBigUInt64LE(BigInt(gameCount), 0);

      // Find game PDA using platform game count
      [gamePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("GAME-"), gameCountBuffer],
        PROGRAM_ID
      );

      const tx = await program.methods
        .createGame()
        .accounts({
          admin: admin.publicKey,
          platform: platformPDA,
          game: gamePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      console.log("Create Game tx:", tx);

      // Wait for the transaction to be confirmed
      await provider.connection.confirmTransaction(tx);

      // Wait for the game account to be initialized
      let gameAccount;
      for (let i = 0; i < 5; i++) {
        try {
          gameAccount = await program.account.game.fetch(gamePDA);
          if (gameAccount && gameAccount.admin.toString() === admin.publicKey.toString()) {
            break;
          }
        } catch (error) {
          console.log("Waiting for game account to be initialized...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!gameAccount) {
        throw new Error("Game account not initialized");
      }

      // Verify game account
      expect(gameAccount.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(gameAccount.gameId.toNumber()).to.equal(0); // First game has game_id = 0
      expect(gameAccount.rows).to.equal(11);
      expect(gameAccount.columns).to.equal(13);
      expect(gameAccount.gameState).to.equal(0);
      expect(gameAccount.version).to.equal(1);

      // Verify initial tile setup
      expect(gameAccount.tileData[0].color).to.equal(1); // Red
      expect(gameAccount.tileData[12].color).to.equal(2); // Yellow
      expect(gameAccount.tileData[130].color).to.equal(3); // Blue
      expect(gameAccount.tileData[142].color).to.equal(4); // Green
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Create Players", async () => {
    try {
      // Helper function to create a player
      const createPlayer = async (
        wallet: Keypair,
        playerPDA: PublicKey,
        playerName: string,
        hotwallet: PublicKey
      ): Promise<string> => {
        const name = Buffer.alloc(32);
        Buffer.from(playerName).copy(name);

        const tx = await program.methods
          .createPlayer(name, hotwallet)
          .accounts({
            wallet: wallet.publicKey,
            platform: platformPDA,
            player: playerPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([wallet])
          .rpc();

        return tx;
      };

      // Create PDAs for all players
      [player1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("player"), player1.publicKey.toBuffer()],
        PROGRAM_ID
      );
      [player2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("player"), player2.publicKey.toBuffer()],
        PROGRAM_ID
      );
      [player3PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("player"), player3.publicKey.toBuffer()],
        PROGRAM_ID
      );
      [player4PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("player"), player4.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Create hotwallets for each player (client-side hot wallets)
      hotwallet1 = Keypair.generate();
      hotwallet2 = Keypair.generate();
      hotwallet3 = Keypair.generate();
      hotwallet4 = Keypair.generate();

      // Create all players
      const txs = await Promise.all([
        createPlayer(player1, player1PDA, "Player One", hotwallet1.publicKey),
        createPlayer(player2, player2PDA, "Player Two", hotwallet2.publicKey),
        createPlayer(player3, player3PDA, "Player Three", hotwallet3.publicKey),
        createPlayer(player4, player4PDA, "Player Four", hotwallet4.publicKey),
      ]);

      txs.forEach((tx, index) => {
        console.log(`Create Player ${index + 1} tx:`, tx);
      });

      // Wait for all transactions to be confirmed
      await Promise.all(txs.map(tx => provider.connection.confirmTransaction(tx)));

      // Verify player accounts
      const [player1Account, player4Account] = await Promise.all([
        program.account.player.fetch(player1PDA),
        program.account.player.fetch(player4PDA),
      ]);

      // Verify player 1
      expect(player1Account.wallet.toBase58()).to.equal(player1.publicKey.toBase58());
      expect(Buffer.from(player1Account.name).toString().replace(/\0/g, '')).to.equal("Player One");
      expect(player1Account.playerStatus).to.equal(1); // READY
      expect(player1Account.hotwallet.toBase58()).to.equal(hotwallet1.publicKey.toBase58());

      // Verify player 4
      expect(player4Account.wallet.toBase58()).to.equal(player4.publicKey.toBase58());
      expect(Buffer.from(player4Account.name).toString().replace(/\0/g, '')).to.equal("Player Four");
      expect(player4Account.playerStatus).to.equal(1); // READY
      expect(player4Account.hotwallet.toBase58()).to.equal(hotwallet4.publicKey.toBase58());
    } catch (error) {
      console.error("Error creating players:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Hotwallet Signing Test", async () => {
    try {
      // First, create a game and join players so we can test game actions
      const [testGamePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("GAME-"), Buffer.alloc(8)],
        PROGRAM_ID
      );

      // Get platform game count
      const platform = await program.account.platform.fetch(platformPDA);
      const gameCount = Number(platform.gameCount);
      
      const gameCountBuffer = Buffer.alloc(8);
      gameCountBuffer.writeBigUInt64LE(BigInt(gameCount), 0);
      const [newGamePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("GAME-"), gameCountBuffer],
        PROGRAM_ID
      );

      // Create a new game
      await program.methods
        .createGame()
        .accounts({
          admin: player1.publicKey,
          platform: platformPDA,
          game: newGamePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      // Join game with player1
      const [gameTreasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_treasury"), newGamePDA.toBuffer()],
        PROGRAM_ID
      );

      // Join all 4 players so the game goes into IN_PROGRESS state
      await program.methods
        .joinGame(new anchor.BN(gameCount))
        .accounts({
          wallet: player1.publicKey,
          player: player1PDA,
          platform: platformPDA,
          game: newGamePDA,
          gameTreasury: gameTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      await program.methods
        .joinGame(new anchor.BN(gameCount))
        .accounts({
          wallet: player2.publicKey,
          player: player2PDA,
          platform: platformPDA,
          game: newGamePDA,
          gameTreasury: gameTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      await program.methods
        .joinGame(new anchor.BN(gameCount))
        .accounts({
          wallet: player3.publicKey,
          player: player3PDA,
          platform: platformPDA,
          game: newGamePDA,
          gameTreasury: gameTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player3])
        .rpc();

      await program.methods
        .joinGame(new anchor.BN(gameCount))
        .accounts({
          wallet: player4.publicKey,
          player: player4PDA,
          platform: platformPDA,
          game: newGamePDA,
          gameTreasury: gameTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([player4])
        .rpc();

      // Wait a bit for game state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fund hotwallets with SOL so they can sign transactions
      const hotwalletFunding = 1 * anchor.web3.LAMPORTS_PER_SOL;
      await provider.connection.requestAirdrop(hotwallet1.publicKey, hotwalletFunding);
      await provider.connection.requestAirdrop(hotwallet2.publicKey, hotwalletFunding);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get initial game state - player1 starts at tile 0 with 100 resources
      // Player1 (Red) is at tile 0, we'll move resources from tile 0 to an adjacent tile
      // Tile 0 is at (0,0), adjacent tiles are at index 1 (0,1) or 13 (1,0)
      // Let's move from tile 0 to tile 1 (adjacent)
      
      // Test 1: Use player1's hotwallet to sign move_resources (should succeed)
      console.log("Test 1: Using player1's hotwallet to sign move_resources...");
      try {
        await program.methods
          .moveResources(0, 1, 50) // Move 50 resources from tile 0 to tile 1
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: hotwallet1.publicKey,
            player: player1PDA,
            game: newGamePDA,
          })
          .signers([hotwallet1])
          .rpc();
        console.log("✓ Test 1 passed: player1's hotwallet can sign move_resources");
      } catch (error: any) {
        console.error("✗ Test 1 failed:", error.message);
        throw error;
      }

      // Test 2: Try to use player2's hotwallet to sign for player1 (should fail)
      console.log("Test 2: Trying to use player2's hotwallet to sign for player1...");
      try {
        await program.methods
          .moveResources(0, 1, 10)
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: hotwallet2.publicKey,
            player: player1PDA,
            game: newGamePDA,
          })
          .signers([hotwallet2])
          .rpc();
        throw new Error("Test 2 should have failed but didn't");
      } catch (error: any) {
        if (error.message.includes("PlayerNotAuthorized") || error.message.includes("constraint")) {
          console.log("✓ Test 2 passed: player2's hotwallet correctly rejected for player1");
        } else {
          console.error("✗ Test 2 failed with unexpected error:", error.message);
          throw error;
        }
      }

      // Test 3: Use player1's regular wallet (should still work)
      console.log("Test 3: Using player1's regular wallet to sign move_resources...");
      try {
        await program.methods
          .moveResources(0, 1, 10)
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: player1.publicKey,
            player: player1PDA,
            game: newGamePDA,
          })
          .signers([player1])
          .rpc();
        console.log("✓ Test 3 passed: player1's regular wallet can still sign");
      } catch (error: any) {
        console.error("✗ Test 3 failed:", error.message);
        throw error;
      }

      // Test 4: Try to use a random keypair that's not a hotwallet (should fail)
      console.log("Test 4: Trying to use a random keypair to sign for player1...");
      const randomKeypair = Keypair.generate();
      try {
        await program.methods
          .moveResources(0, 1, 10)
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: randomKeypair.publicKey,
            player: player1PDA,
            game: newGamePDA,
          })
          .signers([randomKeypair])
          .rpc();
        throw new Error("Test 4 should have failed but didn't");
      } catch (error: any) {
        if (error.message.includes("PlayerNotAuthorized") || error.message.includes("constraint")) {
          console.log("✓ Test 4 passed: random keypair correctly rejected");
        } else {
          console.error("✗ Test 4 failed with unexpected error:", error.message);
          throw error;
        }
      }

      console.log("\n✓ All hotwallet signing tests passed!");
    } catch (error) {
      console.error("Error in hotwallet signing test:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Join Game", async () => {
    try {
      // Derive game treasury PDA
      const [gameTreasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_treasury"), gamePDA.toBuffer()],
        PROGRAM_ID
      );

      // Helper function to join game
      const joinGame = async (
        wallet: Keypair,
        playerPDA: PublicKey
      ): Promise<string> => {
        const tx = await program.methods
          .joinGame(new anchor.BN(0)) // game_id = 0 for first game
          .accounts({
            wallet: wallet.publicKey,
            player: playerPDA,
            platform: platformPDA,
            game: gamePDA,
            gameTreasury: gameTreasuryPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([wallet])
          .rpc();

        // Wait for transaction to be confirmed
        await provider.connection.confirmTransaction(tx);
        return tx;
      };

      // Join players one at a time
      const tx1 = await joinGame(player1, player1PDA);
      console.log("Player 1 Join tx:", tx1);

      const tx2 = await joinGame(player2, player2PDA);
      console.log("Player 2 Join tx:", tx2);

      const tx3 = await joinGame(player3, player3PDA);
      console.log("Player 3 Join tx:", tx3);

      const tx4 = await joinGame(player4, player4PDA);
      console.log("Player 4 Join tx:", tx4);

      // Verify game state
      const gameAccount = await program.account.game.fetch(gamePDA);
      expect(gameAccount.player1.toBase58()).to.equal(player1.publicKey.toBase58());
      expect(gameAccount.player2.toBase58()).to.equal(player2.publicKey.toBase58());
      expect(gameAccount.player3.toBase58()).to.equal(player3.publicKey.toBase58());
      expect(gameAccount.player4.toBase58()).to.equal(player4.publicKey.toBase58());
      expect(gameAccount.gameState).to.equal(1); // IN_PROGRESS

      // Log initial tier counts (should all be 0)
      await logTierCounts(gamePDA, "Initial Tier Counts (after join)");

      // Verify player states
      const [player1Account, player4Account] = await Promise.all([
        program.account.player.fetch(player1PDA),
        program.account.player.fetch(player4PDA),
      ]);

      expect(player1Account.playerStatus).to.equal(2); // PLAYING
      expect(player1Account.lastGame.toBase58()).to.equal(gamePDA.toBase58());

      expect(player4Account.playerStatus).to.equal(2); // PLAYING
      expect(player4Account.lastGame.toBase58()).to.equal(gamePDA.toBase58());
    } catch (error) {
      console.error("Error joining game:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Move Resources - Player 1 moves all resources from (0,0) to (11,0)", async () => {
    try {
      let gameAccount = await program.account.game.fetch(gamePDA);
      
      // Red starts at tile 0 (row 0, col 0) = (0, 0)
      // Yellow is at tile 12 (row 0, col 12) = (12, 0)
      // We want to move to tile 11 (row 0, col 11) = (11, 0) to be adjacent to yellow
      // Since tiles are not directly adjacent, we need to move step by step
      
      // Tile indices: index = row * columns + column
      // (0,0) = 0, (0,1) = 1, ..., (0,11) = 11
      
      // Move resources step by step from tile 0 to tile 11
      // Each move: move all resources except 1 (to keep the tile)
      let currentTile = 0;
      const targetTile = 11; // (11, 0)
      
      while (currentTile < targetTile) {
        const nextTile = currentTile + 1;
        gameAccount = await program.account.game.fetch(gamePDA);
        const currentResources = gameAccount.tileData[currentTile].resourceCount;
        
        // Move all resources except 1 (must leave at least 1)
        const resourcesToMove = currentResources > 1 ? currentResources - 1 : 0;
        
        if (resourcesToMove > 0) {
          console.log(`Moving ${resourcesToMove} resources from tile ${currentTile} to tile ${nextTile}`);
          
          const tx = await program.methods
            .moveResources(currentTile, nextTile, resourcesToMove)
            .accounts({
              playerWallet: player1.publicKey,
              signerWallet: player1.publicKey,
              player: player1PDA,
              game: gamePDA,
            })
            .signers([player1])
            .rpc();
          
          console.log(`Move from ${currentTile} to ${nextTile} tx:`, tx);
          await provider.connection.confirmTransaction(tx);
        }
        
        currentTile = nextTile;
      }
      
      // Verify final state
      gameAccount = await program.account.game.fetch(gamePDA);
      
      // Tile 0 should have 1 resource left
      expect(gameAccount.tileData[0].color).to.equal(1); // Red
      expect(gameAccount.tileData[0].resourceCount).to.equal(1);
      
      // Tile 11 should have most resources
      // Since we move step by step leaving 1 resource at each tile,
      // tile 11 will have approximately 100 - 11 = 89 resources
      expect(gameAccount.tileData[11].color).to.equal(1); // Red
      expect(gameAccount.tileData[11].resourceCount).to.be.at.least(89); // Should have most resources
      
      console.log("Resources successfully moved to tile 11");
      
      // Log tier counts after territory expansion
      await logTierCounts(gamePDA, "Tier Counts (after territory expansion)");
    } catch (error) {
      console.error("Error moving resources:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Attack 3 Times in Sequence - Player 1 (Red) attacks Player 2 (Yellow)", async () => {
    try {
      // Red is at tile 11 (row 0, col 11) = (11, 0) from previous test
      // Yellow is at tile 12 (row 0, col 12) = (12, 0)
      // Attack from tile 11 to tile 12 (yellow) 3 times
      
      const attackerTileIndex = 11;
      const defenderTileIndex = 12;
      
      // Find defender PDA (based on defender tile index only)
      const defenderTileBuffer = Buffer.alloc(2);
      defenderTileBuffer.writeUInt16LE(defenderTileIndex, 0);
      
      const [defenderPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("defender"),
          gamePDA.toBuffer(),
          defenderTileBuffer,
        ],
        PROGRAM_ID
      );
      
      console.log("Defender PDA:", defenderPDA.toBase58());
      
      const colorNames: { [key: number]: string } = { 1: "Red", 2: "Yellow", 3: "Green", 4: "Blue" };
      
      // Perform 3 attacks
      for (let attackRound = 1; attackRound <= 3; attackRound++) {
        console.log(`\n=== Attack Round ${attackRound} ===`);
        
        // Get current game state
        let gameAccount = await program.account.game.fetch(gamePDA);
        
        const attackerResources = gameAccount.tileData[attackerTileIndex].resourceCount;
        const defenderResources = gameAccount.tileData[defenderTileIndex].resourceCount;
        const defenderColor = gameAccount.tileData[defenderTileIndex].color;
        
        console.log(`Tile ${attackerTileIndex} (attacker) resources:`, attackerResources);
        console.log(`Tile ${defenderTileIndex} (defender) resources:`, defenderResources);
        console.log(`Tile ${defenderTileIndex} color:`, defenderColor);
        
        // Check if attacker can still attack (needs at least 2 resources)
        if (attackerResources < 2) {
          console.log("Attacker doesn't have enough resources to attack (need at least 2)");
          break;
        }
        
        // Verify defender account doesn't exist before attack (should be deleted from previous round)
        if (attackRound > 1) {
          try {
            await program.account.defender.fetch(defenderPDA);
            throw new Error("Defender account should not exist before new attack!");
          } catch (e: any) {
            if (e.message.includes("should not exist")) {
              throw e;
            }
            // Account doesn't exist, which is expected
            console.log("✓ Confirmed: Defender account deleted from previous round");
          }
        }
        
        // Create attack (account will be created fresh each time since it's closed on resolve)
        const attackTx = await program.methods
          .attackTile(attackerTileIndex, defenderTileIndex)
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: player1.publicKey,
            player: player1PDA,
            game: gamePDA,
            defender: defenderPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        console.log(`Attack round ${attackRound} tx:`, attackTx);
        await provider.connection.confirmTransaction(attackTx);
        
        // Verify defender account now exists
        const defenderAccount = await program.account.defender.fetch(defenderPDA);
        console.log("✓ Confirmed: Defender account created");
        expect(defenderAccount.isAttackResolved).to.equal(false);
        
        // Try to attack again before resolving - should fail
        console.log("Attempting to attack again before resolve (should fail)...");
        try {
          await program.methods
            .attackTile(attackerTileIndex, defenderTileIndex)
            .accounts({
              wallet: player1.publicKey,
              player: player1PDA,
              game: gamePDA,
              defender: defenderPDA,
              systemProgram: SystemProgram.programId,
            })
            .signers([player1])
            .rpc();
          throw new Error("Should not be able to attack twice before resolve!");
        } catch (e: any) {
          if (e.message.includes("Should not be able")) {
            throw e;
          }
          // Expected error - can't create account that already exists
          console.log("✓ Confirmed: Cannot attack twice before resolve (account already exists)");
        }
        
        // Wait 3.5 seconds before resolving
        console.log("Waiting 3.5 seconds before resolving...");
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        // Resolve the attack (defender account will be closed after resolution)
        // Use game account as destination for rent
        const resolveTx = await program.methods
          .resolveAttack()
          .accounts({
            playerWallet: player1.publicKey,
            signerWallet: player1.publicKey,
            player: player1PDA,
            game: gamePDA,
            defender: defenderPDA,
            destination: gamePDA, // Rent goes back to game account
          })
          .signers([player1])
          .rpc();
        
        console.log(`Resolve round ${attackRound} tx:`, resolveTx);
        await provider.connection.confirmTransaction(resolveTx);
        
        // Get transaction logs to see the program output
        try {
          const tx = await provider.connection.getTransaction(resolveTx, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          
          if (tx && tx.meta && tx.meta.logMessages) {
            console.log("\n--- Transaction Logs ---");
            tx.meta.logMessages.forEach((log: string) => {
              // Filter for program logs (skip system logs)
              if (log.includes("Program log:") || log.includes("Program data:")) {
                const logMessage = log.replace("Program log: ", "").replace("Program data: ", "");
                console.log(logMessage);
              }
            });
            console.log("--- End Transaction Logs ---\n");
          }
        } catch (e) {
          console.log("Could not fetch transaction logs:", e);
        }
        
        // Verify defender account is deleted after resolution
        try {
          await program.account.defender.fetch(defenderPDA);
          throw new Error("Defender account should be deleted after resolution!");
        } catch (e: any) {
          if (e.message.includes("should be deleted")) {
            throw e;
          }
          // Account doesn't exist, which is expected
          console.log("✓ Confirmed: Defender account deleted after resolution");
        }
        
        // Check game state after resolution
        gameAccount = await program.account.game.fetch(gamePDA);
        
        // Calculate total resources per color
        const colorResources: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
        
        gameAccount.tileData.forEach((tile: any) => {
          if (tile.color > 0 && tile.color <= 4) {
            colorResources[tile.color] = (colorResources[tile.color] || 0) + tile.resourceCount;
          }
        });
        
        // Display resource counts
        console.log("Resulting resources:");
        Object.keys(colorResources).forEach((colorKey) => {
          const color = parseInt(colorKey);
          if (colorResources[color] > 0) {
            console.log(`  ${colorNames[color]} (${colorResources[color]})`);
          }
        });
        
        // Log tier counts after attack resolution
        await logTierCounts(gamePDA, `Tier Counts (after attack round ${attackRound})`);
        
        // Check if tile was taken (color changed to attacker's color)
        const newDefenderColor = gameAccount.tileData[defenderTileIndex].color;
        const newDefenderResources = gameAccount.tileData[defenderTileIndex].resourceCount;
        
        if (newDefenderColor === 1 && defenderColor !== 1) { // Red (attacker's color) and was different before
          const oldColorName = colorNames[defenderColor] || "Unknown";
          const newColorName = colorNames[newDefenderColor];
          
          console.log(`\n=== TILE TAKEN! ===`);
          console.log(`${oldColorName} lost to ${newColorName}, moving ${newColorName} resources to new tile`);
          console.log(`Tile ${defenderTileIndex} is now owned by attacker (${newColorName})`);
          console.log(`Tile ${defenderTileIndex} resources:`, newDefenderResources);
          console.log(`Tile ${attackerTileIndex} resources:`, gameAccount.tileData[attackerTileIndex].resourceCount);
          break; // Stop attacking if tile is taken
        }
      }
      
      // Final verification
      const finalGameAccount = await program.account.game.fetch(gamePDA);
      
      console.log("\n=== Final State ===");
      console.log(`Tile ${attackerTileIndex} color:`, finalGameAccount.tileData[attackerTileIndex].color);
      console.log(`Tile ${attackerTileIndex} resources:`, finalGameAccount.tileData[attackerTileIndex].resourceCount);
      console.log(`Tile ${defenderTileIndex} color:`, finalGameAccount.tileData[defenderTileIndex].color);
      console.log(`Tile ${defenderTileIndex} resources:`, finalGameAccount.tileData[defenderTileIndex].resourceCount);
      
      // Log final tier counts
      await logTierCounts(gamePDA, "Final Tier Counts (after all attacks)");
      
      console.log("Attack test completed!");
    } catch (error) {
      console.error("Error in attack test:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Player 3 (Green) moves to center tile", async () => {
    try {
      // Center tile is at row 5, col 6 (0-indexed)
      // Tile index = row * columns + column = 5 * 13 + 6 = 71
      const centerTileIndex = 71;
      
      // Player 3 (Green) starts at tile 130 (bottom left)
      const player3StartTile = 130;
      
      // Get initial state
      let gameAccount = await program.account.game.fetch(gamePDA);
      
      console.log("\n=== Before Move to Center ===");
      console.log(`Player 3 starting tile (${player3StartTile}) resources:`, gameAccount.tileData[player3StartTile].resourceCount);
      console.log(`Center tile (${centerTileIndex}) color:`, gameAccount.tileData[centerTileIndex].color);
      console.log(`Center tile (${centerTileIndex}) resources:`, gameAccount.tileData[centerTileIndex].resourceCount);
      
      // Log tier counts before move
      await logTierCounts(gamePDA, "Tier Counts (before move to center)");
      
      // Move resources step by step from tile 130 to center tile 71
      // Path: move up rows first, then across columns
      // Tile 130 (row 10, col 0) -> tile 71 (row 5, col 6)
      let currentTile = player3StartTile;
      const targetTile = centerTileIndex;
      
      // Path to center: move up rows, then across columns
      const tilesToMove = [
        117, // row 9, col 0
        104, // row 8, col 0
        91,  // row 7, col 0
        78,  // row 6, col 0
        65,  // row 5, col 0
        66,  // row 5, col 1
        67,  // row 5, col 2
        68,  // row 5, col 3
        69,  // row 5, col 4
        70,  // row 5, col 5
        71,  // row 5, col 6 (center)
      ];
      
      // Move resources along the path
      for (let i = 0; i < tilesToMove.length; i++) {
        const nextTile = tilesToMove[i];
        gameAccount = await program.account.game.fetch(gamePDA);
        const currentResources = gameAccount.tileData[currentTile].resourceCount;
        
        // Move all resources except 1 (must leave at least 1)
        const resourcesToMove = currentResources > 1 ? currentResources - 1 : 0;
        
        if (resourcesToMove > 0) {
          const currentRow = Math.floor(currentTile / 13);
          const currentCol = currentTile % 13;
          const nextRow = Math.floor(nextTile / 13);
          const nextCol = nextTile % 13;
          
          console.log(`Moving ${resourcesToMove} resources from tile ${currentTile} (row ${currentRow}, col ${currentCol}) to tile ${nextTile} (row ${nextRow}, col ${nextCol})`);
          
          try {
            const tx = await program.methods
              .moveResources(currentTile, nextTile, resourcesToMove)
              .accounts({
                playerWallet: player3.publicKey,
                signerWallet: player3.publicKey,
                player: player3PDA,
                game: gamePDA,
              })
              .signers([player3])
              .rpc();
            
            console.log(`Move from ${currentTile} to ${nextTile} tx:`, tx);
            await provider.connection.confirmTransaction(tx);
          } catch (error: any) {
            console.error(`Failed to move from tile ${currentTile} to tile ${nextTile}:`, error.message);
            throw new Error(`Tiles ${currentTile} and ${nextTile} are not adjacent or move failed: ${error.message}`);
          }
        }
        
        currentTile = nextTile;
        
        // If we've reached the center, break
        if (nextTile === targetTile) {
          break;
        }
      }
      
      // Verify final state
      gameAccount = await program.account.game.fetch(gamePDA);
      
      console.log("\n=== After Move to Center ===");
      console.log(`Center tile (${centerTileIndex}) color:`, gameAccount.tileData[centerTileIndex].color);
      console.log(`Center tile (${centerTileIndex}) resources:`, gameAccount.tileData[centerTileIndex].resourceCount);
      expect(gameAccount.tileData[centerTileIndex].color).to.equal(3); // Green
      expect(gameAccount.tileData[centerTileIndex].resourceCount).to.be.greaterThan(1);
      
      console.log("\n🎯 Player 3 (Green) now controls the center tile (Gold tier)!");
      
      // Log tier counts after move - Player 3 should have 1 gold tile
      await logTierCounts(gamePDA, "Tier Counts (after Green moves to center)");
      
      // Verify Player 3 has the gold tile
      const getNumber = (value: any): number => {
        return typeof value === 'number' ? value : value.toNumber();
      };
      const player3GoldCount = getNumber(gameAccount.goldTileCountPlayer3);
      console.log(`\n✅ Player 3 (Green) Gold tile count: ${player3GoldCount} (should be 1)`);
      expect(player3GoldCount).to.equal(1);
      
      console.log("\n✓ Player 3 successfully moved to center tile!");
    } catch (error) {
      console.error("Error in move to center test:", error);
      throw error;
    }
  });

  (devnetOnly ? it.skip : it)("Add Resources - Wait 60s and add resources to starting tiles for each player", async () => {
    try {
      // Get initial game state
      let gameAccount = await program.account.game.fetch(gamePDA);
      
      // Starting tiles for each player (from create_game):
      // Player 1 (Red, color 1): tile 0 (top left)
      // Player 2 (Yellow, color 2): tile 12 (top right, columns - 1 = 13 - 1 = 12)
      // Player 3 (Green, color 3): tile 130 (bottom left, (rows - 1) * columns = 10 * 13 = 130)
      // Player 4 (Blue, color 4): tile 142 (bottom right, (rows * columns) - 1 = 11 * 13 - 1 = 142)
      const startingTiles = {
        player1: 0,
        player2: 12,
        player3: 130,
        player4: 142,
      };

      // Get initial resource counts on starting tiles
      const initialResources = {
        player1: gameAccount.tileData[startingTiles.player1].resourceCount,
        player2: gameAccount.tileData[startingTiles.player2].resourceCount,
        player3: gameAccount.tileData[startingTiles.player3].resourceCount,
        player4: gameAccount.tileData[startingTiles.player4].resourceCount,
      };

      console.log("Initial resources on starting tiles:");
      console.log(`  Player 1 (tile ${startingTiles.player1}): ${initialResources.player1}`);
      console.log(`  Player 2 (tile ${startingTiles.player2}): ${initialResources.player2}`);
      console.log(`  Player 3 (tile ${startingTiles.player3}): ${initialResources.player3}`);
      console.log(`  Player 4 (tile ${startingTiles.player4}): ${initialResources.player4}`);

      // Get initial total available resources
      // totalResourcesAvailable is a u32, so it's already a number (not BN)
      const getNumber = (value: any): number => {
        return typeof value === 'number' ? value : value.toNumber();
      };
      
      const initialTotalAvailable = getNumber(gameAccount.totalResourcesAvailable);

      console.log("Initial total available resources:");
      console.log(`  Total: ${initialTotalAvailable}`);

      // Wait 60 seconds for resources to accumulate
      console.log("\nWaiting 60 seconds for resources to accumulate...");
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 60000));
      const elapsed = Date.now() - startTime;
      console.log(`60 seconds elapsed (actual wait: ${elapsed}ms), proceeding with adding resources...`);

      // After 60 seconds, total_resources_available should be RESOURCES_PER_MINUTE (10)
      // This is the amount each player can add (per player), not multiplied by number of players
      // Each player can spend up to 10 resources if (their_spent + 10) <= total_resources_available
      // Since total_resources_available only goes up, it will stay at 10 after spending
      const resourcesToAdd = RESOURCES_PER_MINUTE; // Each player tries to spend 10 resources

      // Player 1 adds resources
      console.log(`\nPlayer 1 adding ${resourcesToAdd} resources to tile ${startingTiles.player1}...`);
      const tx1 = await program.methods
        .addResources(startingTiles.player1, new anchor.BN(resourcesToAdd))
        .accounts({
          playerWallet: player1.publicKey,
          signerWallet: player1.publicKey,
          player: player1PDA,
          game: gamePDA,
        })
        .signers([player1])
        .rpc();
      console.log("Player 1 add resources tx:", tx1);
      await provider.connection.confirmTransaction(tx1);

      // Player 2 adds resources
      console.log(`Player 2 adding ${resourcesToAdd} resources to tile ${startingTiles.player2}...`);
      const tx2 = await program.methods
        .addResources(startingTiles.player2, new anchor.BN(resourcesToAdd))
        .accounts({
          playerWallet: player2.publicKey,
          signerWallet: player2.publicKey,
          player: player2PDA,
          game: gamePDA,
        })
        .signers([player2])
        .rpc();
      console.log("Player 2 add resources tx:", tx2);
      await provider.connection.confirmTransaction(tx2);

      // Player 3 adds resources
      console.log(`Player 3 adding ${resourcesToAdd} resources to tile ${startingTiles.player3}...`);
      const tx3 = await program.methods
        .addResources(startingTiles.player3, new anchor.BN(resourcesToAdd))
        .accounts({
          playerWallet: player3.publicKey,
          signerWallet: player3.publicKey,
          player: player3PDA,
          game: gamePDA,
        })
        .signers([player3])
        .rpc();
      console.log("Player 3 add resources tx:", tx3);
      await provider.connection.confirmTransaction(tx3);

      // Player 4 adds resources
      console.log(`Player 4 adding ${resourcesToAdd} resources to tile ${startingTiles.player4}...`);
      const tx4 = await program.methods
        .addResources(startingTiles.player4, new anchor.BN(resourcesToAdd))
        .accounts({
          playerWallet: player4.publicKey,
          signerWallet: player4.publicKey,
          player: player4PDA,
          game: gamePDA,
        })
        .signers([player4])
        .rpc();
      console.log("Player 4 add resources tx:", tx4);
      await provider.connection.confirmTransaction(tx4);

      // Verify final state
      gameAccount = await program.account.game.fetch(gamePDA);

      const finalResources = {
        player1: gameAccount.tileData[startingTiles.player1].resourceCount,
        player2: gameAccount.tileData[startingTiles.player2].resourceCount,
        player3: gameAccount.tileData[startingTiles.player3].resourceCount,
        player4: gameAccount.tileData[startingTiles.player4].resourceCount,
      };

      const finalTotalAvailable = getNumber(gameAccount.totalResourcesAvailable);

      const finalSpent = {
        player1: getNumber(gameAccount.resourcesSpentPlayer1),
        player2: getNumber(gameAccount.resourcesSpentPlayer2),
        player3: getNumber(gameAccount.resourcesSpentPlayer3),
        player4: getNumber(gameAccount.resourcesSpentPlayer4),
      };

      console.log("\n=== Final State ===");
      console.log("Resources on starting tiles:");
      console.log(`  Player 1 (tile ${startingTiles.player1}): ${finalResources.player1} (was ${initialResources.player1}, added ${resourcesToAdd})`);
      console.log(`  Player 2 (tile ${startingTiles.player2}): ${finalResources.player2} (was ${initialResources.player2}, added ${resourcesToAdd})`);
      console.log(`  Player 3 (tile ${startingTiles.player3}): ${finalResources.player3} (was ${initialResources.player3}, added ${resourcesToAdd})`);
      console.log(`  Player 4 (tile ${startingTiles.player4}): ${finalResources.player4} (was ${initialResources.player4}, added ${resourcesToAdd})`);

      console.log("\nTotal available resources:");
      console.log(`  Total: ${finalTotalAvailable} (was ${initialTotalAvailable})`);

      console.log("\nSpent resources:");
      console.log(`  Player 1: ${finalSpent.player1}`);
      console.log(`  Player 2: ${finalSpent.player2}`);
      console.log(`  Player 3: ${finalSpent.player3}`);
      console.log(`  Player 4: ${finalSpent.player4}`);

      // Log tier counts (should be unchanged after adding resources)
      await logTierCounts(gamePDA, "Tier Counts (after adding resources)");

      // Verify resources were added to tiles
      expect(finalResources.player1).to.equal(initialResources.player1 + resourcesToAdd);
      expect(finalResources.player2).to.equal(initialResources.player2 + resourcesToAdd);
      expect(finalResources.player3).to.equal(initialResources.player3 + resourcesToAdd);
      expect(finalResources.player4).to.equal(initialResources.player4 + resourcesToAdd);

      // Verify total available resources
      // After 60 seconds: 10 resources added (RESOURCES_PER_MINUTE, per player amount)
      // total_resources_available only goes up, never down
      // Each player spent 10, but total_resources_available stays at 10 (not decremented)
      // Final = initial (0) + calculated (10) = 10 (not decremented by spending)
      expect(finalTotalAvailable).to.equal(10);

      // Verify spent resources were tracked
      expect(finalSpent.player1).to.equal(resourcesToAdd);
      expect(finalSpent.player2).to.equal(resourcesToAdd);
      expect(finalSpent.player3).to.equal(resourcesToAdd);
      expect(finalSpent.player4).to.equal(resourcesToAdd);

      console.log("\n✓ All verifications passed!");
    } catch (error) {
      console.error("Error in add resources test:", error);
      throw error;
    }
  });
});
