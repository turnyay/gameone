import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { GameAccount } from '../lib/hexone';

const PROGRAM_ID = new PublicKey('G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD');

export function longToByteArray(long: number): number[] {
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index += 1) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return byteArray;
}

const Games: React.FC = () => {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const [platformPda, setPlatformPda] = useState<PublicKey | null>(null);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [games, setGames] = useState<GameAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformInfo();
  }, [connection]);

  const fetchPlatformInfo = async () => {
    try {
      setLoading(true);
      // Get platform account
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        PROGRAM_ID
      );
      setPlatformPda(pda);

      // Get platform account data
      const platformAccountInfo = await connection.getAccountInfo(pda);
      if (!platformAccountInfo) {
        throw new Error('Platform account not found');
      }

      // Read game count from platform account data (skip 8 bytes for Anchor discriminator)
      const count = platformAccountInfo.data.readUInt32LE(8);
      console.log('Game count from platform:', count);
      setGameCount(count);

      if (count === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      // For the first game (index 0)
      const gameCountBytes = longToByteArray(0);
      const gameCountBuffer = Buffer.from(gameCountBytes);

      // Find the PDA using the correct seed format
      const [gamePda] = await PublicKey.findProgramAddress(
        [Buffer.from('GAME-'), gameCountBuffer],
        PROGRAM_ID
      );
      console.log('Game PDA:', gamePda.toString());

      try {
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
        const tileData: number[] = [];
        for (let i = 0; i < 144; i++) {
            const offset = 164 + (i * 4);
            const color = data.readUInt8(offset);
            const resourceCount = data.readUInt16LE(offset + 2);
            tileData.push(color);
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
        
        const tilesCovered = tileData.filter(tile => tile !== 0).length;

        const game: GameAccount = {
          publicKey: gamePda,
          status: gameStateStr,
          players: [player1, player2, player3, player4].filter(pk => !pk.equals(PublicKey.default)),
          tilesCovered,
          totalTiles: rows * columns || 0,
          tilesCoveredPercent: rows * columns ? (tilesCovered / (rows * columns)) * 100 : 0,
          cost: 0 // Cost is not stored in the game account
        };

        console.log('Parsed game:', game);
        setGames([game]);
      } catch (error) {
        console.error('Error fetching game:', error);
      }

      setError(null);
    } catch (err) {
      console.error('Error in fetchPlatformInfo:', err);
      setError('Failed to fetch platform info');
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="w-full px-4">
        <div className="bg-white shadow-lg rounded-3xl p-8">
          <div className="w-full">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Hexone Games</h1>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-4">Loading platform info...</div>
            ) : (
              <div className="w-full">
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h2 className="text-xl font-semibold mb-4">Platform Information</h2>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Platform ID</dt>
                      <dd className="mt-1 text-sm text-gray-900">{platformPda?.toString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Games</dt>
                      <dd className="mt-1 text-sm text-gray-900">{gameCount}</dd>
                    </div>
                  </dl>
                </div>

                {games.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="w-1/3 px-8 py-4 text-left text-sm font-semibold text-gray-900 pr-20">
                            Game ID
                          </th>
                          <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-gray-900 pr-20">
                            Status
                          </th>
                          <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-gray-900 pr-20">
                            Players
                          </th>
                          <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-gray-900 pr-20">
                            Tiles Covered
                          </th>
                          <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-gray-900 pr-20">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {games.map((game) => (
                          <tr
                            key={game.publicKey.toString()}
                            onClick={() => handleGameClick(game.publicKey.toString())}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="w-1/3 px-8 py-4 text-sm font-medium text-gray-900 break-all pr-20">
                              {game.publicKey.toString()}
                            </td>
                            <td className="w-1/6 px-8 py-4 text-sm text-gray-500 pr-20">
                              {game.status}
                            </td>
                            <td className="w-1/6 px-8 py-4 text-sm text-gray-500 pr-20">
                              {game.players.length}
                            </td>
                            <td className="w-1/6 px-8 py-4 text-sm text-gray-500 pr-20">
                              {game.tilesCovered} / {game.totalTiles} ({game.tilesCoveredPercent.toFixed(1)}%)
                            </td>
                            <td className="w-1/6 px-8 py-4 text-sm text-gray-500 pr-20">
                              {game.cost} SOL
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No games found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games; 