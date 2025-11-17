import Phaser from 'phaser';
import { HexTile } from './HexTile';
import { GRID_CONFIG } from './constants';
import { GameAccount } from '../../lib/hexone';

export class MainScene extends Phaser.Scene {
  private tiles: HexTile[][] = [];
  private hexSize: number = GRID_CONFIG.HEX_SIZE;
  private gridSizeRows: number = GRID_CONFIG.GRID_SIZE_ROWS;
  private gridSizeColumns: number = GRID_CONFIG.GRID_SIZE_COLUMNS;
  private gap: number = GRID_CONFIG.GAP;
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  private gameBorder!: Phaser.GameObjects.Rectangle;
  private gameData: GameAccount | null = null;

  static gameData: GameAccount | null = null;
  
  // Static method to get player scores from game data
  static getPlayerScores(): number[] {
    const scores = [0, 0, 0, 0];
    if (MainScene.gameData && MainScene.gameData.tileData) {
      MainScene.gameData.tileData.forEach((tile) => {
        if (tile.color > 0 && tile.color <= 4) {
          const colorIndex = tile.color - 1;
          scores[colorIndex]++;
        }
      });
    }
    return scores;
  }

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { gameData?: GameAccount }) {
    // Try to get data from init, or fall back to static variable
    this.gameData = data?.gameData || MainScene.gameData;
  }

  create() {
    this.lastWidth = this.cameras.main.width;
    this.lastHeight = this.cameras.main.height;

    // Initialize players with empty tile sets - game data will populate them
    HexTile.initializePlayers();
    // Clear starting positions since we'll load from game data
    for (let i = 0; i < 4; i++) {
      if (HexTile.players[i]) {
        HexTile.players[i].tiles.clear();
      }
    }
    this.createHexGrid();
    this.createGameBorder();
    
    // Calculate the actual game world bounds after tiles are created
    const hexWidth = this.hexSize * 2;
    const hexHeight = this.hexSize * Math.sqrt(3);
    const maxPixelX = (this.gridSizeColumns - 1) * (hexWidth * 0.5 + this.gap);
    const maxPixelY = (this.gridSizeRows - 1) * (hexHeight * 0.75 + this.gap);
    
    // Account for the *2 multiplier in tile positioning
    const worldWidth = (GRID_CONFIG.OFFSET_WIDTH + maxPixelX) * 2 + hexWidth;
    const worldHeight = (GRID_CONFIG.OFFSET_HEIGHT + maxPixelY) * 2 + hexHeight;
    
    // Center the camera on the grid
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    this.cameras.main.centerOn(centerX, centerY);
  }

  private createGameBorder() {
    const hexWidth = this.hexSize * 2;
    const hexHeight = this.hexSize * Math.sqrt(3);
    const maxPixelX = (this.gridSizeColumns - 1) * (hexWidth * 0.5 + this.gap);
    const maxPixelY = (this.gridSizeRows - 1) * (hexHeight * 0.75 + this.gap);
    
    // Calculate border dimensions accounting for *2 multiplier
    const borderWidth = (GRID_CONFIG.OFFSET_WIDTH + maxPixelX) * 2 + hexWidth;
    const borderHeight = (GRID_CONFIG.OFFSET_HEIGHT + maxPixelY) * 2 + hexHeight;
    
    // Center the border on the grid
    const centerX = borderWidth / 2;
    const centerY = borderHeight / 2;

    this.gameBorder = this.add.rectangle(
      centerX,
      centerY,
      borderWidth,
      borderHeight,
      0x000000,
      0
    );
    this.gameBorder.setStrokeStyle(1, 0x333333);
  }

  private createHexGrid() {
    // Clear existing tiles
    this.tiles.forEach(row => row.forEach(tile => tile.destroy()));
    this.tiles = [];

    // Get game dimensions from game data or use defaults
    const rows = this.gameData?.rows || this.gridSizeRows;
    const columns = this.gameData?.columns || this.gridSizeColumns;

    // Initialize new tiles array
    for (let y = 0; y < this.gridSizeRows; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridSizeColumns; x++) {
        // Skip tiles that would create gaps in the grid
        if (y === this.gridSizeRows - 1 && x % 2 === 1) {
          continue;
        }

        const hexWidth = this.hexSize * 2;
        const hexHeight = this.hexSize * Math.sqrt(3);
        const pixelX = x * (hexWidth * 0.5 + this.gap);
        const pixelY = y * (hexHeight * 0.75 + this.gap) + (x % 2 ? hexHeight * 0.375 : 0);

        // Calculate tile index in the game's tile_data array
        // The game uses a flat array indexed by row * columns + column
        const tileIndex = y * columns + x;
        const tileData = this.gameData?.tileData?.[tileIndex];

        const tile = new HexTile({
          scene: this,
          x: GRID_CONFIG.OFFSET_WIDTH + pixelX * 2,
          y: GRID_CONFIG.OFFSET_HEIGHT + pixelY * 2,
          tileIndexX: x,
          tileIndexY: y,
          hexSize: this.hexSize,
          gap: this.gap,
          offsetWidth: GRID_CONFIG.OFFSET_WIDTH,
          offsetHeight: GRID_CONFIG.OFFSET_HEIGHT
        });

        // Set tile color and resources from game data
        if (tileData) {
          if (tileData.color > 0 && tileData.color <= 4) {
            // Color is 1-4, convert to 0-3 index
            const colorIndex = tileData.color - 1;
            tile.setColor(colorIndex);
            // Add tile to player's territory
            if (!HexTile.players[colorIndex]) {
              HexTile.players[colorIndex] = {
                colorIndex,
                tiles: new Set()
              };
            }
            HexTile.players[colorIndex].tiles.add(`${x},${y}`);
          }
          if (tileData.resourceCount > 0) {
            tile.addResources(tileData.resourceCount);
          }
        }

        this.tiles[y][x] = tile;
      }
    }

    // Apply special borders to center tile and its neighbors
    this.applySpecialBorders(columns);
  }

  private applySpecialBorders(columns: number) {
    const centerCol = 6;
    const centerRow = 5;
    
    // Apply gold border to center tile
    if (this.tiles[centerRow] && this.tiles[centerRow][centerCol]) {
      this.tiles[centerRow][centerCol].setGoldBorder();
    }

    // Calculate 6 neighbors of center tile
    // Since col 6 is even, use even column neighbor offsets
    const neighborOffsets = [
      { dx: 1, dy: 0 },   // right
      { dx: 1, dy: -1 },  // top-right
      { dx: 0, dy: -1 },  // top
      { dx: -1, dy: -1 }, // top-left
      { dx: -1, dy: 0 },  // left
      { dx: 0, dy: 1 }    // bottom
    ];

    // Apply silver borders to the 6 neighbors
    for (const offset of neighborOffsets) {
      const neighborCol = centerCol + offset.dx;
      const neighborRow = centerRow + offset.dy;
      
      // Check bounds
      if (neighborRow >= 0 && neighborRow < this.gridSizeRows &&
          neighborCol >= 0 && neighborCol < this.gridSizeColumns) {
        // Skip if it's the last row and an odd column (gap tile)
        if (neighborRow === this.gridSizeRows - 1 && neighborCol % 2 === 1) {
          continue;
        }
        
        if (this.tiles[neighborRow] && this.tiles[neighborRow][neighborCol]) {
          this.tiles[neighborRow][neighborCol].setSilverBorder();
        }
      }
    }
  }

  update() {
    // Check if camera dimensions have changed
    if (this.lastWidth !== this.cameras.main.width || this.lastHeight !== this.cameras.main.height) {
      this.lastWidth = this.cameras.main.width;
      this.lastHeight = this.cameras.main.height;
      this.createHexGrid();
      this.createGameBorder();
    }
  }
} 