import Phaser from 'phaser';
import { HexTile } from './HexTile';
import { GRID_CONFIG } from './constants';

export class MainScene extends Phaser.Scene {
  private tiles: HexTile[][] = [];
  private hexSize: number = GRID_CONFIG.HEX_SIZE;
  private gridSizeRows: number = GRID_CONFIG.GRID_SIZE_ROWS;
  private gridSizeColumns: number = GRID_CONFIG.GRID_SIZE_COLUMNS;
  private gap: number = GRID_CONFIG.GAP;
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  private gameBorder!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.lastWidth = this.cameras.main.width;
    this.lastHeight = this.cameras.main.height;

    HexTile.initializePlayers();
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

        this.tiles[y][x] = tile;
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