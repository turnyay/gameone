import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, Wallet as AnchorWallet, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Hexone } from '../../../program/hexone/target/types/hexone';

export const PROGRAM_ID = new PublicKey('4hCMsw4pRN8VsyPg6USUEyEmnX5VTApEAWyEmMdrrtGj');

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
            "name": "availableResourcesTimestamp",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer1",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer2",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer3",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer4",
            "type": "i64"
          },
          {
            "name": "resourcesPerMinute",
            "type": "u32"
          },
          {
            "name": "totalResourcesAvailable",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer1",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer2",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer3",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer4",
            "type": "u32"
          },
          {
            "name": "xpPerMinutePerTile",
            "type": "u32"
          },
          {
            "name": "xpPlayer1",
            "type": "u32"
          },
          {
            "name": "xpPlayer2",
            "type": "u32"
          },
          {
            "name": "xpPlayer3",
            "type": "u32"
          },
          {
            "name": "xpPlayer4",
            "type": "u32"
          },
          {
            "name": "tileCountColor1",
            "type": "u32"
          },
          {
            "name": "tileCountColor2",
            "type": "u32"
          },
          {
            "name": "tileCountColor3",
            "type": "u32"
          },
          {
            "name": "tileCountColor4",
            "type": "u32"
          },
          {
            "name": "_paddingU32",
            "type": {
              "array": ["u8", 4]
            }
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
            "name": "ironTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "goldTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "silverTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "bronzeTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "ironTierBonusXpPerMin",
            "type": "u8"
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
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "availableResourcesTimestamp",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer1",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer2",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer3",
            "type": "i64"
          },
          {
            "name": "xpTimestampPlayer4",
            "type": "i64"
          },
          {
            "name": "resourcesPerMinute",
            "type": "u32"
          },
          {
            "name": "totalResourcesAvailable",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer1",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer2",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer3",
            "type": "u32"
          },
          {
            "name": "resourcesSpentPlayer4",
            "type": "u32"
          },
          {
            "name": "xpPerMinutePerTile",
            "type": "u32"
          },
          {
            "name": "xpPlayer1",
            "type": "u32"
          },
          {
            "name": "xpPlayer2",
            "type": "u32"
          },
          {
            "name": "xpPlayer3",
            "type": "u32"
          },
          {
            "name": "xpPlayer4",
            "type": "u32"
          },
          {
            "name": "tileCountColor1",
            "type": "u32"
          },
          {
            "name": "tileCountColor2",
            "type": "u32"
          },
          {
            "name": "tileCountColor3",
            "type": "u32"
          },
          {
            "name": "tileCountColor4",
            "type": "u32"
          },
          {
            "name": "_paddingU32",
            "type": {
              "array": ["u8", 4]
            }
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
            "name": "ironTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer1",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer2",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer3",
            "type": "u8"
          },
          {
            "name": "ironTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "bronzeTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "silverTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "goldTileCountPlayer4",
            "type": "u8"
          },
          {
            "name": "goldTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "silverTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "bronzeTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "ironTierBonusXpPerMin",
            "type": "u8"
          },
          {
            "name": "_paddingTierBonus",
            "type": {
              "array": ["u8", 4]
            }
          },
          {
            "name": "winningPlayerPubkey",
            "type": "publicKey"
          },
          {
            "name": "winningXpLimit",
            "type": "u64"
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
            "name": "winnerCalculationFlag",
            "type": "u8"
          },
          {
            "name": "_padding",
            "type": {
              "array": ["u8", 2]
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
  // Tier counts for each player
  ironTileCountPlayer1?: number;
  bronzeTileCountPlayer1?: number;
  silverTileCountPlayer1?: number;
  goldTileCountPlayer1?: number;
  ironTileCountPlayer2?: number;
  bronzeTileCountPlayer2?: number;
  silverTileCountPlayer2?: number;
  goldTileCountPlayer2?: number;
  ironTileCountPlayer3?: number;
  bronzeTileCountPlayer3?: number;
  silverTileCountPlayer3?: number;
  goldTileCountPlayer3?: number;
  ironTileCountPlayer4?: number;
  bronzeTileCountPlayer4?: number;
  silverTileCountPlayer4?: number;
  goldTileCountPlayer4?: number;
  // Tier bonus XP per minute
  goldTierBonusXpPerMin?: number;
  silverTierBonusXpPerMin?: number;
  bronzeTierBonusXpPerMin?: number;
  ironTierBonusXpPerMin?: number;
  // Winning player and XP limit
  winningPlayerPubkey?: PublicKey;
  winningXpLimit?: number;
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

  private fetchGameManually(gamePubkey: PublicKey, accountData: Buffer): GameAccount | null {
    try {
      // Skip 8 bytes for Anchor discriminator
      const data = Buffer.from(accountData.slice(8));
      
      // Read pubkeys (32 bytes each)
      const admin = new PublicKey(data.slice(0, 32));
      const player1 = new PublicKey(data.slice(32, 64));
      const player2 = new PublicKey(data.slice(64, 96));
      const player3 = new PublicKey(data.slice(96, 128));
      const player4 = new PublicKey(data.slice(128, 160));
      
      // Read game_id (8 bytes)
      const gameIdValue = data.readBigUInt64LE(160);
      
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
      
      // Read tile_data (144 * 4 bytes) - starts at offset 272 (after 4 bytes padding)
      const tileData: TileData[] = [];
      const tileDataStartOffset = 272;
      const maxTiles = Math.min(144, Math.floor((data.length - tileDataStartOffset) / 4));
      
      for (let i = 0; i < maxTiles; i++) {
        const offset = tileDataStartOffset + (i * 4);
        if (offset + 4 <= data.length) {
          const color = data.readUInt8(offset);
          const resourceCount = data.readUInt16LE(offset + 2);
          tileData.push({ color, resourceCount });
        } else {
          tileData.push({ color: 0, resourceCount: 0 });
        }
      }
      
      // Fill remaining tiles if needed
      while (tileData.length < 144) {
        tileData.push({ color: 0, resourceCount: 0 });
      }
      
      // Read tier counts (16 u8s = 16 bytes) - starts after tileData
      const tierCountsOffset = tileDataStartOffset + (144 * 4);
      const ironTileCountPlayer1 = data.length > tierCountsOffset ? data.readUInt8(tierCountsOffset) : 0;
      const bronzeTileCountPlayer1 = data.length > tierCountsOffset + 1 ? data.readUInt8(tierCountsOffset + 1) : 0;
      const silverTileCountPlayer1 = data.length > tierCountsOffset + 2 ? data.readUInt8(tierCountsOffset + 2) : 0;
      const goldTileCountPlayer1 = data.length > tierCountsOffset + 3 ? data.readUInt8(tierCountsOffset + 3) : 0;
      const ironTileCountPlayer2 = data.length > tierCountsOffset + 4 ? data.readUInt8(tierCountsOffset + 4) : 0;
      const bronzeTileCountPlayer2 = data.length > tierCountsOffset + 5 ? data.readUInt8(tierCountsOffset + 5) : 0;
      const silverTileCountPlayer2 = data.length > tierCountsOffset + 6 ? data.readUInt8(tierCountsOffset + 6) : 0;
      const goldTileCountPlayer2 = data.length > tierCountsOffset + 7 ? data.readUInt8(tierCountsOffset + 7) : 0;
      const ironTileCountPlayer3 = data.length > tierCountsOffset + 8 ? data.readUInt8(tierCountsOffset + 8) : 0;
      const bronzeTileCountPlayer3 = data.length > tierCountsOffset + 9 ? data.readUInt8(tierCountsOffset + 9) : 0;
      const silverTileCountPlayer3 = data.length > tierCountsOffset + 10 ? data.readUInt8(tierCountsOffset + 10) : 0;
      const goldTileCountPlayer3 = data.length > tierCountsOffset + 11 ? data.readUInt8(tierCountsOffset + 11) : 0;
      const ironTileCountPlayer4 = data.length > tierCountsOffset + 12 ? data.readUInt8(tierCountsOffset + 12) : 0;
      const bronzeTileCountPlayer4 = data.length > tierCountsOffset + 13 ? data.readUInt8(tierCountsOffset + 13) : 0;
      const silverTileCountPlayer4 = data.length > tierCountsOffset + 14 ? data.readUInt8(tierCountsOffset + 14) : 0;
      const goldTileCountPlayer4 = data.length > tierCountsOffset + 15 ? data.readUInt8(tierCountsOffset + 15) : 0;
      
      // Read tier bonus XP per minute (4 u8s = 4 bytes)
      const tierBonusXpOffset = tierCountsOffset + 16;
      const goldTierBonusXpPerMin = data.length > tierBonusXpOffset ? data.readUInt8(tierBonusXpOffset) : 100;
      const silverTierBonusXpPerMin = data.length > tierBonusXpOffset + 1 ? data.readUInt8(tierBonusXpOffset + 1) : 50;
      const bronzeTierBonusXpPerMin = data.length > tierBonusXpOffset + 2 ? data.readUInt8(tierBonusXpOffset + 2) : 10;
      const ironTierBonusXpPerMin = data.length > tierBonusXpOffset + 3 ? data.readUInt8(tierBonusXpOffset + 3) : 5;
      
      // Skip padding (4 bytes) + winning_player_pubkey (32 bytes) + winning_xp_limit (8 bytes)
      const paddingOffset = tierBonusXpOffset + 4;
      const winningPlayerPubkeyOffset = paddingOffset + 4;
      const winningXpLimitOffset = winningPlayerPubkeyOffset + 32;
      
      // Read winning player pubkey (32 bytes)
      const winningPlayerPubkey = data.length > winningPlayerPubkeyOffset 
        ? new PublicKey(data.slice(winningPlayerPubkeyOffset, winningPlayerPubkeyOffset + 32))
        : PublicKey.default;
      
      // Read winning XP limit (u64, 8 bytes)
      const winningXpLimit = data.length > winningXpLimitOffset 
        ? Number(data.readBigUInt64LE(winningXpLimitOffset))
        : 10000;
      
      // Read game state and other fields (6 bytes: game_state, rows, columns, version, bump, winner_calculation_flag)
      const gameStateOffset = winningXpLimitOffset + 8;
      let gameState = 0;
      let rows = 11;
      let columns = 13;
      
      if (gameStateOffset < data.length) {
        gameState = data.readUInt8(gameStateOffset);
      }
      if (gameStateOffset + 1 < data.length) {
        rows = data.readUInt8(gameStateOffset + 1);
      }
      if (gameStateOffset + 2 < data.length) {
        columns = data.readUInt8(gameStateOffset + 2);
      }
      
      const tilesCovered = tileData.filter(tile => tile.color !== 0).length;
      const totalTiles = rows * columns || 144;
      const tilesCoveredPercent = totalTiles > 0 ? (tilesCovered / totalTiles) * 100 : 0;
      
      return {
        publicKey: gamePubkey,
        status: this.getGameStatus(gameState),
        players: [player1, player2, player3, player4].filter(pk => !pk.equals(PublicKey.default)),
        tilesCovered,
        totalTiles,
        tilesCoveredPercent,
        cost: 0,
        tileData,
        rows,
        columns,
        resourcesPerMinute,
        ironTileCountPlayer1,
        bronzeTileCountPlayer1,
        silverTileCountPlayer1,
        goldTileCountPlayer1,
        ironTileCountPlayer2,
        bronzeTileCountPlayer2,
        silverTileCountPlayer2,
        goldTileCountPlayer2,
        ironTileCountPlayer3,
        bronzeTileCountPlayer3,
        silverTileCountPlayer3,
        goldTileCountPlayer3,
        ironTileCountPlayer4,
        bronzeTileCountPlayer4,
        silverTileCountPlayer4,
        goldTileCountPlayer4,
        goldTierBonusXpPerMin,
        silverTierBonusXpPerMin,
        bronzeTierBonusXpPerMin,
        ironTierBonusXpPerMin,
        winningPlayerPubkey: winningPlayerPubkey,
        winningXpLimit: winningXpLimit
      };
    } catch (error) {
      console.error('Error in manual game parsing:', error);
      return null;
    }
  }

  async fetchGame(gameId: string): Promise<GameAccount | null> {
    try {
      // First check account info to see actual data size
      const gamePubkey = new PublicKey(gameId);
      const accountInfo = await this.connection.getAccountInfo(gamePubkey);
      if (!accountInfo) {
        console.error('Game account not found');
        return null;
      }
      
      const expectedSize = 8 + 32*5 + 8*6 + 4*16 + 4 + 144*4 + 16 + 4 + 4 + 32 + 8 + 5 + 3; // 932 (added 20 bytes for tier counts/tier bonus XP + 40 bytes for winning player/XP limit)
      const actualSize = accountInfo.data.length;
      
      console.log('Game account data length:', actualSize);
      console.log('Expected size (with discriminator):', expectedSize);
      
      // Try to fetch using Anchor, with fallback to manual parsing
      let account: any;
      try {
        const game = await this.program.account.game.fetch(gamePubkey);
        account = game as any;
      } catch (fetchError: any) {
        console.warn('Failed to fetch game using Anchor deserialization, falling back to manual parsing:', fetchError?.message || fetchError);
        // Fallback to manual parsing if Anchor deserialization fails
        if (actualSize < expectedSize) {
          console.error(`Account size mismatch! Expected ${expectedSize} bytes, got ${actualSize} bytes.`);
        }
        return this.fetchGameManually(gamePubkey, accountInfo.data);
      }
      
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
        resourcesPerMinute: account.resourcesPerMinute || 0,
        // Tier counts for each player
        ironTileCountPlayer1: account.ironTileCountPlayer1 ?? 0,
        bronzeTileCountPlayer1: account.bronzeTileCountPlayer1 ?? 0,
        silverTileCountPlayer1: account.silverTileCountPlayer1 ?? 0,
        goldTileCountPlayer1: account.goldTileCountPlayer1 ?? 0,
        ironTileCountPlayer2: account.ironTileCountPlayer2 ?? 0,
        bronzeTileCountPlayer2: account.bronzeTileCountPlayer2 ?? 0,
        silverTileCountPlayer2: account.silverTileCountPlayer2 ?? 0,
        goldTileCountPlayer2: account.goldTileCountPlayer2 ?? 0,
        ironTileCountPlayer3: account.ironTileCountPlayer3 ?? 0,
        bronzeTileCountPlayer3: account.bronzeTileCountPlayer3 ?? 0,
        silverTileCountPlayer3: account.silverTileCountPlayer3 ?? 0,
        goldTileCountPlayer3: account.goldTileCountPlayer3 ?? 0,
        ironTileCountPlayer4: account.ironTileCountPlayer4 ?? 0,
        bronzeTileCountPlayer4: account.bronzeTileCountPlayer4 ?? 0,
        silverTileCountPlayer4: account.silverTileCountPlayer4 ?? 0,
        goldTileCountPlayer4: account.goldTileCountPlayer4 ?? 0,
        // Tier bonus XP per minute
        goldTierBonusXpPerMin: account.goldTierBonusXpPerMin ?? 100,
        silverTierBonusXpPerMin: account.silverTierBonusXpPerMin ?? 50,
        bronzeTierBonusXpPerMin: account.bronzeTierBonusXpPerMin ?? 10,
        ironTierBonusXpPerMin: account.ironTierBonusXpPerMin ?? 5,
        winningPlayerPubkey: account.winningPlayerPubkey ?? PublicKey.default,
        winningXpLimit: account.winningXpLimit ?? 10000
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
      if (!accountInfo || !accountInfo.data) {
        console.log('Defender account does not exist or has no data');
        return null;
      }

      // Check if account data is large enough to be valid
      if (accountInfo.data.length < 8) {
        console.log('Defender account data is too small or corrupted');
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
      // Account doesn't exist, is closed, or error fetching/deserializing
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('buffer') || errorMessage.includes('length') || errorMessage.includes('beyond')) {
        console.log('Defender account data is invalid or account was closed:', errorMessage);
      } else {
        console.log('Error fetching defender account:', errorMessage);
      }
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
      case 3:
        return 'Winner Found (Not Paid Out)';
      default:
        return 'Unknown';
    }
  }
}
