import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, Wallet as AnchorWallet, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Hexone } from '../../../program/hexone/target/types/hexone';

export const PROGRAM_ID = new PublicKey('D3sXMGZYUNN3DeQr2tUSKjgN8qYXcRHPCSSaJMAPUFzP');

export const IDL: Idl = {
  "version": "0.1.0",
  "name": "hexone",
  "instructions": [
    {
      "name": "createGame",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "platform",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createPlatform",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "platform",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createPlayer",
      "accounts": [
        {
          "name": "wallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "platform",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": {
            "array": ["u8", 32]
          }
        }
      ]
    },
    {
      "name": "joinGame",
      "accounts": [
        {
          "name": "wallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "platform",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTreasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "moveResources",
      "accounts": [
        {
          "name": "wallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "sourceTileIndex",
          "type": "u16"
        },
        {
          "name": "destinationTileIndex",
          "type": "u16"
        },
        {
          "name": "resourcesToMove",
          "type": "u16"
        }
      ]
    },
    {
      "name": "attackTile",
      "accounts": [
        {
          "name": "wallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "defender",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "attackerTileIndex",
          "type": "u16"
        },
        {
          "name": "defenderTileIndex",
          "type": "u16"
        }
      ]
    },
    {
      "name": "resolveAttack",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "defender",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addResources",
      "accounts": [
        {
          "name": "wallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tileIndex",
          "type": "u16"
        },
        {
          "name": "resourcesToAdd",
          "type": "u32"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Game",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "resourcesPerMinute",
            "type": "u32"
          },
          {
            "name": "tileData",
            "type": {
              "array": [
                {
                  "defined": "TileData"
                },
                144
              ]
            }
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
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 7]
            }
          }
        ]
      }
    },
    {
      "name": "Platform",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "gameCount",
            "type": "u64"
          },
          {
            "name": "gamesCompleted",
            "type": "u64"
          },
          {
            "name": "totalPlayers",
            "type": "u64"
          },
          {
            "name": "gameCost",
            "type": "u64"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 6]
            }
          }
        ]
      }
    },
    {
      "name": "Player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "gamesPlayed",
            "type": "u32"
          },
          {
            "name": "gamesWon",
            "type": "u32"
          },
          {
            "name": "lastGame",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "playerStatus",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 5]
            }
          }
        ]
      }
    },
    {
      "name": "Defender",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "defenderTileIndex",
            "type": "u16"
          },
          {
            "name": "defenderTileColor",
            "type": "u8"
          },
          {
            "name": "attackerTileIndex",
            "type": "u16"
          },
          {
            "name": "attackerTileColor",
            "type": "u8"
          },
          {
            "name": "attackStartedAt",
            "type": "i64"
          },
          {
            "name": "isAttackResolved",
            "type": "bool"
          },
          {
            "name": "attackerWon",
            "type": "bool"
          },
          {
            "name": "attackingResult",
            "type": "u16"
          },
          {
            "name": "defendingResult",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 3]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Game",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "tileData",
            "type": {
              "array": [
                {
                  "defined": "TileData"
                },
                144
              ]
            }
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
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 3]
            }
          }
        ]
      }
    },
    {
      "name": "Platform",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "gameCount",
            "type": "u64"
          },
          {
            "name": "gamesCompleted",
            "type": "u64"
          },
          {
            "name": "totalPlayers",
            "type": "u64"
          },
          {
            "name": "gameCost",
            "type": "u64"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 6]
            }
          }
        ]
      }
    },
    {
      "name": "Player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "gamesPlayed",
            "type": "u32"
          },
          {
            "name": "gamesWon",
            "type": "u32"
          },
          {
            "name": "lastGame",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "playerStatus",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 5]
            }
          }
        ]
      }
    },
    {
      "name": "TileData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "color",
            "type": "u8"
          },
          {
            "name": "_pad",
            "type": "u8"
          },
          {
            "name": "resourceCount",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "Defender",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "defenderTileIndex",
            "type": "u16"
          },
          {
            "name": "defenderTileColor",
            "type": "u8"
          },
          {
            "name": "attackerTileIndex",
            "type": "u16"
          },
          {
            "name": "attackerTileColor",
            "type": "u8"
          },
          {
            "name": "attackStartedAt",
            "type": "i64"
          },
          {
            "name": "isAttackResolved",
            "type": "bool"
          },
          {
            "name": "attackerWon",
            "type": "bool"
          },
          {
            "name": "attackingResult",
            "type": "u16"
          },
          {
            "name": "defendingResult",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 3]
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Invalid",
      "msg": "Invalid state"
    },
    {
      "code": 6001,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6002,
      "name": "PlayerNotAuthorized",
      "msg": "Player is not authorized"
    },
    {
      "code": 6003,
      "name": "PlayerNotReady",
      "msg": "Player is not ready to join a game"
    },
    {
      "code": 6004,
      "name": "GameNotWaiting",
      "msg": "Game is not in waiting state"
    },
    {
      "code": 6005,
      "name": "GameFull",
      "msg": "Game is full"
    }
  ]
};

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

export interface TileData {
  color: number; // 0 = unclaimed, 1-4 = player colors
  resourceCount: number;
}

export interface GameAccount {
  publicKey: PublicKey;
  status: string;
  players: PublicKey[];
  tilesCovered: number;
  totalTiles: number;
  tilesCoveredPercent: number;
  cost: number;
  tileData: TileData[]; // Array of 144 tiles with color and resource count
  rows: number;
  columns: number;
  resourcesPerMinute: number;
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

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>;
}

export class HexoneClient {
  private program: Program<Idl>;
  private connection: Connection;
  private provider?: AnchorProvider;
  private programId: PublicKey;

  constructor(
    walletContext: WalletContextState
  ) {
    // Create connection to local test validator
    this.connection = new Connection('http://localhost:8899', 'confirmed');
    
    if (!walletContext.publicKey || !walletContext.signTransaction) {
      throw new Error('Wallet not connected or missing required methods');
    }

    // Create a proper wallet adapter that matches Anchor's expected type
    const anchorWallet = {
      publicKey: walletContext.publicKey,
      signTransaction: walletContext.signTransaction,
      signAllTransactions: walletContext.signAllTransactions || (async (txs) => txs),
    };
    
    // Use the wallet adapter directly - same pattern as tests
    this.provider = new AnchorProvider(this.connection, anchorWallet as AnchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    
    this.programId = PROGRAM_ID;
    // Use same Program setup as tests: Program with IDL (tests use anchor.workspace.hexone)
    this.program = new Program(IDL, this.programId, this.provider);
  }

  // Static method to create a read-only client
  static createReadOnly(): HexoneClient {
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const dummyWallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: async (tx: Transaction): Promise<Transaction> => tx,
      signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => txs,
    };
    
    const provider = new AnchorProvider(
      connection,
      dummyWallet as AnchorWallet,
      { commitment: 'confirmed' }
    );
    
    // Create client without using constructor - same pattern as tests
    const client = Object.create(HexoneClient.prototype);
    client.connection = connection;
    client.provider = provider;
    client.programId = PROGRAM_ID;
    client.program = new Program(IDL, PROGRAM_ID, provider);
    return client;
  }

  // Expose program for direct access when needed
  getProgram(): Program<Idl> {
    return this.program;
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

          // Parse tile data if available
          const tileData: TileData[] = [];
          if (account.tileData && Array.isArray(account.tileData)) {
            // If tileData is already parsed, use it; otherwise create placeholder
            account.tileData.forEach((tile: any) => {
              if (typeof tile === 'object' && tile.color !== undefined) {
                tileData.push({ color: tile.color, resourceCount: tile.resourceCount || 0 });
              } else {
                // Placeholder for unparsed data
                tileData.push({ color: tile || 0, resourceCount: 0 });
              }
            });
          } else {
            // Create empty tile data array
            for (let i = 0; i < 144; i++) {
              tileData.push({ color: 0, resourceCount: 0 });
            }
          }

          games.push({
            publicKey: gamePda,
            status: this.getGameStatus(account.gameState),
            players: account.players || [],
            tilesCovered,
            totalTiles,
            tilesCoveredPercent,
            cost: account.gameCost ? account.gameCost / 1e9 : 0, // Convert lamports to SOL
            tileData,
            rows: account.rows || 11,
            columns: account.columns || 13,
            resourcesPerMinute: account.resourcesPerMinute || 0
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
      
      // Parse tile data if available
      const tileData: TileData[] = [];
      if (account.tileData && Array.isArray(account.tileData)) {
        // If tileData is already parsed, use it; otherwise create placeholder
        account.tileData.forEach((tile: any) => {
          if (typeof tile === 'object' && tile.color !== undefined) {
            tileData.push({ color: tile.color, resourceCount: tile.resourceCount || 0 });
          } else {
            // Placeholder for unparsed data
            tileData.push({ color: tile || 0, resourceCount: 0 });
          }
        });
      } else {
        // Create empty tile data array
        for (let i = 0; i < 144; i++) {
          tileData.push({ color: 0, resourceCount: 0 });
        }
      }

      // Calculate tiles covered from tileData array
      const tilesCovered = tileData.filter((tile) => tile.color !== 0).length;
      const totalTiles = tileData.length;
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
        cost: account.gameCost ? account.gameCost / 1e9 : 0, // Convert lamports to SOL
        tileData,
        rows: account.rows || 11,
        columns: account.columns || 13,
        resourcesPerMinute: account.resourcesPerMinute || 0
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

  async moveResources(
    game: PublicKey,
    sourceTileIndex: number,
    destinationTileIndex: number,
    resourcesToMove: number
  ): Promise<string> {
    if (!this.provider?.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Find player PDA
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), this.provider.wallet.publicKey.toBuffer()],
        this.programId
      );

      // Ensure values are within u16 range (0-65535)
      const sourceTileIndexU16 = Math.max(0, Math.min(65535, sourceTileIndex));
      const destinationTileIndexU16 = Math.max(0, Math.min(65535, destinationTileIndex));
      const resourcesToMoveU16 = Math.max(0, Math.min(65535, resourcesToMove));

      console.log('Calling moveResources with:', {
        sourceTileIndex: sourceTileIndexU16,
        destinationTileIndex: destinationTileIndexU16,
        resourcesToMove: resourcesToMoveU16,
        original: { sourceTileIndex, destinationTileIndex, resourcesToMove }
      });

      // Call move_resources - @coral-xyz/anchor handles snake_case method names
      // All parameters are now u16: source_tile_index, destination_tile_index, resources_to_move
      const tx = await this.program.methods
        .moveResources(
          sourceTileIndex,
          destinationTileIndex,
          resourcesToMove
        )
        .accounts({
          wallet: this.provider.wallet.publicKey,
          player: playerPda,
          game: game,
        })
        .rpc();

      console.log('Move resources transaction:', tx);
      return tx;
    } catch (error) {
      console.error('Error in moveResources:', error);
      throw error;
    }
  }

  async attackTile(
    game: PublicKey,
    attackerTileIndex: number,
    defenderTileIndex: number
  ): Promise<string> {
    if (!this.provider?.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Find player PDA
      const [playerPda] = await PublicKey.findProgramAddress(
        [Buffer.from('player'), this.provider.wallet.publicKey.toBuffer()],
        this.programId
      );

      // Find defender PDA
      const defenderTileBuffer = Buffer.alloc(2);
      defenderTileBuffer.writeUInt16LE(defenderTileIndex, 0);
      const [defenderPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('defender'),
          game.toBuffer(),
          defenderTileBuffer
        ],
        this.programId
      );

      // Ensure values are within u16 range (0-65535)
      const attackerTileIndexU16 = Math.max(0, Math.min(65535, attackerTileIndex));
      const defenderTileIndexU16 = Math.max(0, Math.min(65535, defenderTileIndex));

      const tx = await this.program.methods
        .attackTile(
          attackerTileIndexU16,
          defenderTileIndexU16
        )
        .accounts({
          wallet: this.provider.wallet.publicKey,
          player: playerPda,
          game: game,
          defender: defenderPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Attack tile transaction:', tx);
      return tx;
    } catch (error) {
      console.error('Error in attackTile:', error);
      throw error;
    }
  }

  async resolveAttack(
    game: PublicKey,
    defenderTileIndex: number,
    destination: PublicKey
  ): Promise<string> {
    if (!this.provider?.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Find defender PDA
      const defenderTileBuffer = Buffer.alloc(2);
      defenderTileBuffer.writeUInt16LE(defenderTileIndex, 0);
      const [defenderPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('defender'),
          game.toBuffer(),
          defenderTileBuffer
        ],
        this.programId
      );

      const tx = await this.program.methods
        .resolveAttack()
        .accounts({
          game: game,
          defender: defenderPda,
          destination: destination,
        })
        .rpc();

      console.log('Resolve attack transaction:', tx);
      return tx;
    } catch (error) {
      console.error('Error in resolveAttack:', error);
      throw error;
    }
  }

  async fetchDefender(
    game: PublicKey,
    defenderTileIndex: number
  ): Promise<any | null> {
    try {
      // Find defender PDA
      const defenderTileBuffer = Buffer.alloc(2);
      defenderTileBuffer.writeUInt16LE(defenderTileIndex, 0);
      const [defenderPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('defender'),
          game.toBuffer(),
          defenderTileBuffer
        ],
        this.programId
      );

      console.log('Fetching defender account:', {
        defenderPda: defenderPda.toString(),
        defenderTileIndex,
        game: game.toString()
      });

      // Check if account exists first
      const accountInfo = await this.connection.getAccountInfo(defenderPda);
      if (!accountInfo) {
        console.log('Defender account does not exist');
        return null;
      }

      const defender = await this.program.account.defender.fetch(defenderPda);
      console.log('Defender account fetched successfully:', {
        attackerTileIndex: defender.attackerTileIndex,
        defenderTileIndex: defender.defenderTileIndex,
        isAttackResolved: defender.isAttackResolved,
        attackStartedAt: defender.attackStartedAt
      });
      return defender;
    } catch (error: any) {
      // Account doesn't exist or error fetching
      console.log('Error fetching defender account:', error?.message || error);
      return null;
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
