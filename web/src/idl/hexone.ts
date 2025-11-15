export const IDL = {
  "version": "0.1.0",
  "name": "hexone",
  "instructions": [
    {
      "name": "createGame",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
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
            "name": "resourcesPerMinute",
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
            "name": "tileData",
            "type": {
              "vec": {
                "defined": "Tile"
              }
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Tile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "color",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "GameNotFound",
      "msg": "Game not found"
    }
  ]
}; 