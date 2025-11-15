import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@project-serum/anchor';

const PROGRAM_ID = new PublicKey('G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD');

export interface Game {
  pubkey: PublicKey;
  admin: PublicKey;
  player1: PublicKey;
  player2: PublicKey;
  player3: PublicKey;
  player4: PublicKey;
  resourcesPerMinute: number;
  gameState: number;
  rows: number;
  columns: number;
  tilesCovered: number;
  totalTiles: number;
  tilesCoveredPercent: number;
  gameCost: number;
  playerCount: number;
}

export interface GameAccount {
  publicKey: PublicKey;
  status: string;
  players: PublicKey[];
  tilesCovered: number;
  totalTiles: number;
  tilesCoveredPercent: number;
  cost: number;
}

export interface GameAccountData {
  gameState: string;
  admin: PublicKey;
  player1: PublicKey;
  player2: PublicKey;
  player3: PublicKey;
  player4: PublicKey;
  tileData: number[];
  rows: number;
  columns: number;
  cost: number;
}

export interface PlatformAccountData {
  gameCount: number;
  admin: PublicKey;
  player1: PublicKey;
  player2: PublicKey;
  player3: PublicKey;
  player4: PublicKey;
  resourcesPerMinute: number;
  gameState: string;
  rows: number;
  columns: number;
  version: number;
  bump: number;
}

export const IDL: Idl = {
  "version": "0.1.0",
  "name": "hexone",
  "instructions": [],
  "accounts": [
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameState",
            "type": "u8"
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "player1",
            "type": "publicKey"
          },
          {
            "name": "player2",
            "type": "publicKey"
          },
          {
            "name": "player3",
            "type": "publicKey"
          },
          {
            "name": "player4",
            "type": "publicKey"
          },
          {
            "name": "tileData",
            "type": {
              "vec": {
                "defined": "u8"
              }
            }
          },
          {
            "name": "rows",
            "type": "u8"
          },
          {
            "name": "columns",
            "type": "u8"
          },
          {
            "name": "cost",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "platform",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameCount",
            "type": "u32"
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "player1",
            "type": "publicKey"
          },
          {
            "name": "player2",
            "type": "publicKey"
          },
          {
            "name": "player3",
            "type": "publicKey"
          },
          {
            "name": "player4",
            "type": "publicKey"
          },
          {
            "name": "resourcesPerMinute",
            "type": "u32"
          },
          {
            "name": "gameState",
            "type": "u8"
          },
          {
            "name": "rows",
            "type": "u8"
          },
          {
            "name": "columns",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [],
  "errors": []
};

export class HexoneClient {
  private program: Program;
  private connection: Connection;
  private provider?: AnchorProvider;

  constructor(connectionOrWallet: Connection | any) {
    this.connection = connectionOrWallet.connection || connectionOrWallet;
    
    // If a wallet is provided, create a provider
    if (connectionOrWallet.publicKey) {
      this.provider = new AnchorProvider(this.connection, connectionOrWallet, {});
      this.program = new Program(IDL, PROGRAM_ID, this.provider);
    } else {
      // For read-only operations, create a provider with a dummy wallet
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };
      this.provider = new AnchorProvider(this.connection, dummyWallet, {});
      this.program = new Program(IDL, PROGRAM_ID, this.provider);
    }
  }

  async fetchGames(): Promise<GameAccount[]> {
    try {
      // Get platform account
      const [platformPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        this.program.programId
      );

      // Get platform account data
      const platformAccountInfo = await this.connection.getAccountInfo(platformPda);
      if (!platformAccountInfo) {
        throw new Error('Platform account not found');
      }

      // The game count is stored at the beginning of the account data
      const gameCount = platformAccountInfo.data.readUInt32LE(0);

      // Fetch all games
      const games: GameAccount[] = [];
      for (let i = gameCount - 1; i >= 0; i--) {
        const [gamePda] = await PublicKey.findProgramAddress(
          [Buffer.from(`GAME-${i}`)],
          this.program.programId
        );

        try {
          const gameAccount = await this.program.account.game.fetch(gamePda);
          const account = gameAccount as any;
          const tilesCovered = account.tileData.filter((tile: any) => tile !== 0).length;
          const totalTiles = account.tileData.length;
          const tilesCoveredPercent = (tilesCovered / totalTiles) * 100;

          games.push({
            publicKey: gamePda,
            status: this.getGameStatus(account.gameState),
            players: account.players,
            tilesCovered,
            totalTiles,
            tilesCoveredPercent,
            cost: account.gameCost / 1e9, // Convert lamports to SOL
          });
        } catch (error) {
          console.error(`Error fetching game ${i}:`, error);
          // Continue with next game even if one fails
          continue;
        }
      }

      return games;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  }

  async fetchGame(gameId: string): Promise<GameAccount | null> {
    try {
      const game = await this.program.account.game.fetch(new PublicKey(gameId));
      const account = game as any;
      
      // Calculate tiles covered from tileData array
      const tilesCovered = account.tileData.filter((tile: any) => tile !== 0).length;
      const totalTiles = account.tileData.length;
      const tilesCoveredPercent = (tilesCovered / totalTiles) * 100;

      return {
        publicKey: new PublicKey(gameId),
        status: this.getGameStatus(account.gameState),
        players: [
          account.admin,
          account.player1,
          account.player2,
          account.player3,
          account.player4
        ].filter((player: PublicKey) => !player.equals(PublicKey.default)),
        tilesCovered,
        totalTiles,
        tilesCoveredPercent,
        cost: account.gameCost / 1e9, // Convert lamports to SOL
      };
    } catch (error) {
      console.error('Error fetching game:', error);
      return null;
    }
  }

  async createGame(): Promise<string> {
    if (!this.provider?.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('game')],
        this.program.programId
      );

      const tx = await this.program.methods
        .createGame()
        .accounts({
          game: gamePda,
          admin: this.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return gamePda.toBase58();
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  private getGameStatus(gameState: number): string {
    switch (gameState) {
      case 0:
        return 'Waiting';
      case 1:
        return 'In Progress';
      case 2:
        return 'Completed';
      default:
        return 'Unknown';
    }
  }
} 