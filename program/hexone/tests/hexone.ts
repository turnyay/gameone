import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hexone } from "../target/types/hexone";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// Program ID from Anchor.toml
const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
      const airdropPromises = [
        provider.connection.requestAirdrop(admin.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player1.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player2.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player3.publicKey, airdropAmount),
        provider.connection.requestAirdrop(player4.publicKey, airdropAmount),
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
});
