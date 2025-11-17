import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hexone } from "../target/types/hexone";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// Program ID from Anchor.toml
const PROGRAM_ID = new PublicKey("G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD");

describe("hexone", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.hexone as Program<Hexone>;
  const provider = anchor.getProvider();

  // Test accounts
  const admin = Keypair.generate();
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

  before(async () => {
    try {
      // Airdrop SOL to admin and players (increased amount to 10 SOL)
      const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
      const targetWallet = new PublicKey("9C6MuwjX9wHYp8Rtvn4fksHNtvqD3TnpRcehZbXWn1pG");
      const targetWallet2 = new PublicKey("BHC5zYpPGcfCpo6oUHZsozjA1vE9bRiZCNLprrPasLg7");
      const targetWallet3 = new PublicKey("7MyLbGM3NuJo2EEaqMfS4QAyRhBvKG4tTRQWrtdiDHLM");
      const targetWallet4 = new PublicKey("4a3iJz8nv3ZyPaTzJsugvMSzNvsYC6uQ4NXX5cY33ygb");
      const airdropPromises = [
        provider.connection.requestAirdrop(admin.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player1.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player2.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player3.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player4.publicKey, airdropAmount),
        provider.connection.requestAirdrop(targetWallet, airdropAmount),
        provider.connection.requestAirdrop(targetWallet2, airdropAmount),
        provider.connection.requestAirdrop(targetWallet3, airdropAmount),
        provider.connection.requestAirdrop(targetWallet4, airdropAmount),
      ];
      await Promise.all(airdropPromises);

      // Wait for airdrops to confirm
      await new Promise(resolve => setTimeout(resolve, 2000));

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

  it("Create Game", async () => {
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

  it("Create Players", async () => {
    try {
      // Helper function to create a player
      const createPlayer = async (
        wallet: Keypair,
        playerPDA: PublicKey,
        playerName: string
      ): Promise<string> => {
        const name = Buffer.alloc(32);
        Buffer.from(playerName).copy(name);

        const tx = await program.methods
          .createPlayer(name)
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

      // Create all players
      const txs = await Promise.all([
        createPlayer(player1, player1PDA, "Player One"),
        createPlayer(player2, player2PDA, "Player Two"),
        createPlayer(player3, player3PDA, "Player Three"),
        createPlayer(player4, player4PDA, "Player Four"),
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

      // Verify player 4
      expect(player4Account.wallet.toBase58()).to.equal(player4.publicKey.toBase58());
      expect(Buffer.from(player4Account.name).toString().replace(/\0/g, '')).to.equal("Player Four");
      expect(player4Account.playerStatus).to.equal(1); // READY
    } catch (error) {
      console.error("Error creating players:", error);
      throw error;
    }
  });

  it("Join Game", async () => {
    try {
      // Helper function to join game
      const joinGame = async (
        wallet: Keypair,
        playerPDA: PublicKey
      ): Promise<string> => {
        const tx = await program.methods
          .joinGame()
          .accounts({
            wallet: wallet.publicKey,
            player: playerPDA,
            game: gamePDA,
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

  it("Move Resources - Player 1 moves all resources from (0,0) to (11,0)", async () => {
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
              wallet: player1.publicKey,
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
    } catch (error) {
      console.error("Error moving resources:", error);
      throw error;
    }
  });

  it("Attack 3 Times in Sequence - Player 1 (Red) attacks Player 2 (Yellow)", async () => {
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
            wallet: player1.publicKey,
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
            game: gamePDA,
            defender: defenderPDA,
            destination: gamePDA, // Rent goes back to game account
          })
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
      
      console.log("Attack test completed!");
    } catch (error) {
      console.error("Error in attack test:", error);
      throw error;
    }
  });
});
