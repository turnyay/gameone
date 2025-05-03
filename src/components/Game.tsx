import React, { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';

interface PlayerTileData {
  colorIndex: number;
  tiles: Set<string>; // Store tile coordinates as "x,y" strings
}

class HexTile extends Phaser.GameObjects.Container {
  private hex: Phaser.GameObjects.Polygon;
  private dot: Phaser.GameObjects.Arc;
  private border: Phaser.GameObjects.Rectangle;
  private originalPoints: Phaser.Geom.Point[];
  private hoverScale: number = 1.2;
  private tileIndexX: number;
  private tileIndexY: number;
  private hexSize: number;
  private gap: number = 0;
  private offsetWidth: number = 80;
  private offsetHeight: number = 80;
  private static players: Map<string, PlayerTileData> = new Map();
  private isTarget: boolean = false;
  private resources: number = 0;
  private resourceText?: Phaser.GameObjects.Text;
  private gridSizeColumns: number;
  private gridSizeRows: number;
  private static playerColorIndex: number = 0;
  private isSelected: boolean = false;
  private static selectedTile: HexTile | null = null;
  private static validMoveTiles: Set<HexTile> = new Set();

  public static setPlayerColorIndex(index: number) {
    HexTile.playerColorIndex = index;
  }

  private getNeighboringTiles(): {x: number, y: number}[] {
    const neighbors: {x: number, y: number}[] = [];
    const directions = [
      {x: 1, y: 0}, {x: 1, y: -1}, {x: 0, y: -1},
      {x: -1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}
    ];
    
    for (const dir of directions) {
      const newX = this.tileIndexX + dir.x;
      const newY = this.tileIndexY + dir.y;
      
      // Check if the new position is within grid bounds
      if (newX >= 0 && newX < this.gridSizeColumns && 
          newY >= 0 && newY < this.gridSizeRows) {
        // Skip if it's the last row and an odd column
        if (newY === this.gridSizeRows - 1 && newX % 2 === 1) {
          continue;
        }
        neighbors.push({x: newX, y: newY});
      }
    }
    
    return neighbors;
  }

  private startSelectionAnimation(): void {
    // Set the hex to the hover state without pulsing
    const hoverPoints = this.originalPoints.map(p => {
      return new Phaser.Geom.Point(
        p.x * this.hoverScale + 5,
        p.y * this.hoverScale + 5
      );
    });
    this.hex.clearFX();
    this.hex.setTo(hoverPoints);
    this.hex.setInteractive(new Phaser.Geom.Polygon(hoverPoints), Phaser.Geom.Polygon.Contains);

    // Add a glow effect without pulsing
    this.hex.setStrokeStyle(2, 0xffffff);
  }

  private startValidMoveAnimation(): void {
    // Create a pulsing effect
    this.scene.tweens.add({
      targets: this.hex,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add a glow effect
    this.hex.setStrokeStyle(2, 0x00ff00);

    // Add click handler for valid move tiles
    this.hex.on('pointerdown', this.onTileClick, this);
  }

  private clearSelection(): void {
    this.hex.clearFX();
    this.hex.setTo(this.originalPoints);
    this.hex.setInteractive(new Phaser.Geom.Polygon(this.originalPoints), Phaser.Geom.Polygon.Contains);
    this.scene.tweens.killTweensOf(this.hex);
    // Remove click handler when clearing selection
    this.hex.off('pointerdown', this.onTileClick, this);
  }

  private updateResourceText(): void {
    if (this.resourceText) {
      this.resourceText.setText(this.resources.toString());
    }
  }

  private onTileClick(): void {
    const tileKey = `${this.tileIndexX},${this.tileIndexY}`;
    let isPlayerTile = false;
    let isWhiteTile = true;
    
    // Check if this is a player tile or white tile
    for (const [_, playerData] of Array.from(HexTile.players)) {
      if (playerData.tiles.has(tileKey)) {
        isWhiteTile = false;
        if (playerData.colorIndex === HexTile.playerColorIndex) {
          isPlayerTile = true;
        }
        break;
      }
    }

    if (isPlayerTile) {
      // Clear previous selection
      if (HexTile.selectedTile) {
        HexTile.selectedTile.clearSelection();
        // Clear valid move tiles
        HexTile.validMoveTiles.forEach(tile => {
          tile.clearSelection();
        });
        HexTile.validMoveTiles.clear();
      }

      // If clicking the same tile, deselect it
      if (HexTile.selectedTile === this) {
        HexTile.selectedTile = null;
        return;
      }

      // Select this tile
      HexTile.selectedTile = this;
      this.startSelectionAnimation();

      // Highlight valid moves
      const neighbors = this.getNeighboringTiles();
      for (const neighbor of neighbors) {
        const neighborTile = this.scene.children.list.find(
          child => child instanceof HexTile && 
          (child as HexTile).tileIndexX === neighbor.x && 
          (child as HexTile).tileIndexY === neighbor.y
        ) as HexTile;

        if (neighborTile) {
          HexTile.validMoveTiles.add(neighborTile);
          neighborTile.startValidMoveAnimation();
        }
      }
    } else if (isWhiteTile && HexTile.selectedTile && HexTile.validMoveTiles.has(this)) {
      // Handle territory expansion
      const selectedTile = HexTile.selectedTile;
      
      // Only proceed if the selected tile has resources
      if (selectedTile.resources > 0) {
        // Subtract 1 from selected tile's resources
        selectedTile.resources--;
        selectedTile.updateResourceText();

        // Add this tile to player's territory
        const playerId = Array.from(HexTile.players.entries())
          .find(([_, data]) => data.colorIndex === HexTile.playerColorIndex)?.[0];
        
        if (playerId) {
          // Add to player's territory
          HexTile.addTileToPlayer(playerId, this.tileIndexX, this.tileIndexY);
          
          // Update tile color and resources
          const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
          this.hex.setFillStyle(colors[HexTile.playerColorIndex]);
          this.resources = 1;

          // Update or create resource text
          const hexWidth = this.hexSize * 2;
          const hexHeight = this.hexSize * Math.sqrt(3);
          const textColor = HexTile.playerColorIndex === 0 || HexTile.playerColorIndex === 3 ? '#ffffff' : '#000000';

          if (this.resourceText) {
            this.resourceText.setText('1');
            this.resourceText.setColor(textColor);
          } else {
            this.resourceText = this.scene.add.text(0, 0, '1', {
              color: textColor,
              fontSize: '18px',
              fontFamily: 'Arial',
              fontStyle: 'bold',
              align: 'center',
              resolution: 2
            });
            this.resourceText.setOrigin(0.5, 0.5);
            this.resourceText.setDepth(10);
            this.resourceText.setPosition(-hexWidth/2, -hexHeight/2);
            this.resourceText.setScale(1);
            this.add(this.resourceText);
          }

          // Force a redraw of the hex
          this.hex.clearFX();
          this.hex.setTo(this.originalPoints);
          this.hex.setFillStyle(colors[HexTile.playerColorIndex]);

          // Clear selection and valid moves
          selectedTile.clearSelection();
          HexTile.validMoveTiles.forEach(tile => {
            tile.clearSelection();
          });
          HexTile.validMoveTiles.clear();
          HexTile.selectedTile = null;

          // Add selection capability to the new tile
          this.hex.on('pointerover', this.onHover, this);
          this.hex.on('pointerout', this.onHoverOut, this);
          this.hex.on('pointerdown', this.onTileClick, this);
        }
      }
    }
  }

  constructor(scene: Phaser.Scene, tileIndexX: number, tileIndexY: number, size: number, gridSizeColumns: number, gridSizeRows: number) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.tileIndexX = tileIndexX;
    this.tileIndexY = tileIndexY;
    this.hexSize = size;
    this.gridSizeColumns = gridSizeColumns;
    this.gridSizeRows = gridSizeRows;
    this.isTarget = (tileIndexX === 6 && tileIndexY === 5);

    // Set initial resources for colored tiles
    if ((tileIndexX === 0 && tileIndexY === 0) || // Top-left (red)
        (tileIndexX === this.gridSizeColumns-1 && tileIndexY === 0) || // Top-right (yellow)
        (tileIndexX === 0 && tileIndexY === this.gridSizeRows-1) || // Bottom-left (green)
        (tileIndexX === this.gridSizeColumns-1 && tileIndexY === this.gridSizeRows-1)) { // Bottom-right (blue)
      this.resources = 10;
    }

    // Calculate pixel position from indices with offset for odd rows
    const hexWidth = this.hexSize * 2;
    const hexHeight = this.hexSize * Math.sqrt(3);
    const pixelX = this.tileIndexX * (hexWidth * 0.5 + this.gap);
    const pixelY = this.tileIndexY * (hexHeight * 0.75 + this.gap) + (this.tileIndexX % 2 ? hexHeight * 0.375 : 0);

    // Set container position
    this.setPosition(this.offsetWidth + pixelX*2, this.offsetHeight + pixelY*2);

    // Create hex points
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      points.push(new Phaser.Geom.Point(
        this.hexSize * Math.cos(angle),
        this.hexSize * Math.sin(angle)
      ));
    }

    // Create the hex with color based on player territory
    const tileKey = `${this.tileIndexX},${this.tileIndexY}`;
    let hexColor = 0xffffff; // Default white
    let textColor = '#000000'; // Default text color
    let isColoredTile = false;
    let isPlayerTile = false;

    // Check if this tile belongs to any player
    for (const [_, playerData] of Array.from(HexTile.players)) {
      if (playerData.tiles.has(tileKey)) {
        const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
        hexColor = colors[playerData.colorIndex];
        isColoredTile = true;
        isPlayerTile = playerData.colorIndex === HexTile.playerColorIndex;
        // Set text color based on player color
        if (playerData.colorIndex === 0 || playerData.colorIndex === 3) {
          textColor = '#ffffff'; // White text for red and blue
        } else {
          textColor = '#000000'; // Black text for green and yellow for better contrast
        }
        break;
      }
    }

    this.hex = scene.add.polygon(0, 0, points, hexColor);
    this.hex.setInteractive(new Phaser.Geom.Polygon(points), Phaser.Geom.Polygon.Contains);

    // Add center dot
    this.dot = scene.add.circle(0, 0, 3, 0xff0000);
    this.dot.setDepth(1);

    // Add container border
    const containerWidth = hexWidth;
    const containerHeight = hexHeight;
    this.border = scene.add.rectangle(-hexWidth/2, -hexHeight/2, containerWidth, containerHeight, 0xffffff, 0);
    this.border.setStrokeStyle(1, 0xffffff);
    this.border.setDepth(2);

    // Set container size
    this.setSize(containerWidth, containerHeight);

    // Add hex to container
    this.add(this.hex);
    // this.add(this.border);

    // Add resource text if the tile has resources
    if (this.resources > 0) {
      this.resourceText = scene.add.text(0, 0, this.resources.toString(), {
        color: textColor,
        fontSize: '18px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        align: 'center',
        resolution: 2 // Higher resolution for sharper text
      });
      this.resourceText.setOrigin(0.5, 0.5);
      this.resourceText.setDepth(10); // Ensure text is above everything
      this.resourceText.setPosition(-hexWidth/2, -hexHeight/2); // Center in container
      this.resourceText.setScale(1); // Start with clean scale
      this.add(this.resourceText);
    }

    // Store original points
    this.originalPoints = points.map(p => new Phaser.Geom.Point(p.x, p.y));

    // Add hover effect only for colored tiles
    if (isColoredTile) {
      this.hex.on('pointerover', this.onHover, this);
      this.hex.on('pointerout', this.onHoverOut, this);
      this.hex.on('pointerdown', this.onTileClick, this);
    }

    // Add highlight effect for player's tiles
    if (isPlayerTile) {
      this.hex.setStrokeStyle(2, 0xffffff);
    }

    // Start target animation if this is the target tile
    if (this.isTarget) {
      this.startTargetAnimation();
    }
  }

  private startTargetAnimation(): void {
    // Set a vibrant orange-gold color for the target tile
    this.hex.setFillStyle(0xffa500);

    // Create a pulsing effect
    this.scene.tweens.add({
      targets: this.hex,
      scaleX: 1.1,
      scaleY: 1.1,
      x: 2,
      y: 2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add a glow effect
    this.hex.setStrokeStyle(2, 0xff8c00);

    // Create shiny effect
    const shine = this.scene.add.polygon(0, 0, this.originalPoints, 0xffffff, 0.3);
    this.add(shine);
    shine.setDepth(1);

    // Animate the shine
    this.scene.tweens.add({
      targets: shine,
      x: this.hexSize * 2,
      y: -this.hexSize * 2,
      duration: 1500,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => {
        // Update shine opacity based on position
        const progress = (shine.x + shine.y) / (this.hexSize * 4);
        shine.setAlpha(0.3 * (1 - Math.abs(progress - 0.5) * 2));
      }
    });
  }

  public static initializePlayers(gridSizeRows: number, gridSizeColumns: number) {
    // Clear existing players
    HexTile.players.clear();

    // Initialize players with corner tiles
    HexTile.players.set('player1', {
      colorIndex: 0, // Red
      tiles: new Set(['0,0']) // Top-left
    });

    HexTile.players.set('player2', {
      colorIndex: 1, // Yellow
      tiles: new Set([`${gridSizeColumns-1},0`]) // Top-right
    });

    HexTile.players.set('player3', {
      colorIndex: 2, // Green
      tiles: new Set([`0,${gridSizeRows-1}`]) // Bottom-left
    });

    HexTile.players.set('player4', {
      colorIndex: 3, // Blue
      tiles: new Set([`${gridSizeColumns-1},${gridSizeRows-1}`]) // Bottom-right
    });
  }

  public static addTileToPlayer(playerId: string, tileX: number, tileY: number) {
    const player = HexTile.players.get(playerId);
    if (player) {
      player.tiles.add(`${tileX},${tileY}`);
    }
  }

  private onHover(): void {
    const hoverPoints = this.originalPoints.map(p => {
      return new Phaser.Geom.Point(
        p.x * this.hoverScale + 5,
        p.y * this.hoverScale + 5
      );
    });
    this.hex.clearFX();
    this.hex.setTo(hoverPoints);
    this.hex.setInteractive(new Phaser.Geom.Polygon(hoverPoints), Phaser.Geom.Polygon.Contains);
    
    // Move and scale resource text on hover
    if (this.resourceText) {
      const currentX = this.resourceText.x;
      const currentY = this.resourceText.y;
      this.resourceText.setPosition(currentX + 2, currentY + 2);
      this.resourceText.setScale(1.2, 1.2); // Explicit x,y scale for pixel-perfect scaling
    }
  }

  private onHoverOut(): void {
    this.hex.clearFX();
    this.hex.setTo(this.originalPoints);
    this.hex.setInteractive(new Phaser.Geom.Polygon(this.originalPoints), Phaser.Geom.Polygon.Contains);
    
    // Reset resource text position and scale
    if (this.resourceText) {
      const currentX = this.resourceText.x;
      const currentY = this.resourceText.y;
      this.resourceText.setPosition(currentX - 2, currentY - 2);
      this.resourceText.setScale(1, 1); // Explicit x,y scale for pixel-perfect scaling
    }
  }

  public destroy(): void {
    this.hex.off('pointerover', this.onHover, this);
    this.hex.off('pointerout', this.onHoverOut, this);
    super.destroy();
  }
}

class MainScene extends Phaser.Scene {
  private tiles: HexTile[][] = [];
  private hexSize: number = 25;
  private gridSizeRows: number = 11;
  private gridSizeColumns: number = 13;
  private gap: number = 0;
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  private gameBorder!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    this.lastWidth = this.cameras.main.width;
    this.lastHeight = this.cameras.main.height;
    HexTile.initializePlayers(this.gridSizeRows, this.gridSizeColumns);
    this.createHexGrid();
    this.createGameBorder();
  }

  private createGameBorder() {
    // Calculate border dimensions based on grid size and hex dimensions
    const hexWidth = this.hexSize * 2;
    const hexHeight = this.hexSize * Math.sqrt(3);
    
    // Calculate total width and height of the grid
    const totalWidth = this.gridSizeColumns * (hexWidth * 0.5 + this.gap) + hexWidth - 20;
    const totalHeight = this.gridSizeRows * (hexHeight * 0.75 + this.gap) + hexHeight - 15;

    // Create border rectangle
    this.gameBorder = this.add.rectangle(totalWidth, totalHeight, totalWidth*2, totalHeight*2, 0xffa500, 0);
    this.gameBorder.setStrokeStyle(2, 0xffa500);
    this.gameBorder.setDepth(0);
  }

  private createHexGrid() {
    // Clear any existing tiles
    this.tiles.forEach(row => row.forEach(tile => tile.destroy()));
    this.tiles = [];

    // Create the grid
    for (let row = 0; row < this.gridSizeRows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.gridSizeColumns; col++) {
        // Skip every other tile in the bottom row
        if (row === this.gridSizeRows - 1 && col % 2 === 1) {
          continue;
        }
        // Create the hex tile using indices
        const tile = new HexTile(this, col, row, this.hexSize, this.gridSizeColumns, this.gridSizeRows);
        tile.setDepth(row);
        this.tiles[row][col] = tile;
      }
    }
  }

  update() {
    // Handle window resize
    if (this.lastWidth !== this.cameras.main.width || this.lastHeight !== this.cameras.main.height) {
      this.lastWidth = this.cameras.main.width;
      this.lastHeight = this.cameras.main.height;
      this.createHexGrid();
      this.createGameBorder();
    }
  }
}

const Game: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [playerColorIndex, setPlayerColorIndex] = React.useState(0); // 0: red, 1: yellow, 2: green, 3: blue

  const getColorFromIndex = (index: number) => {
    const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
    return colors[index];
  };

  const getColorName = (index: number) => {
    const names = ['red', 'yellow', 'green', 'blue'];
    return names[index];
  };

  const initGame = useCallback(() => {
    if (gameRef.current) return;

    // Set the player's color index in the HexTile class
    HexTile.setPlayerColorIndex(playerColorIndex);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: '712',
      height: '900',
      scene: MainScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      backgroundColor: '#000000',
      powerPreference: 'high-performance',
      antialias: true,
      roundPixels: true,
      audio: {
        disableWebAudio: true
      }
    };

    gameRef.current = new Phaser.Game(config);
  }, [playerColorIndex]);

  useEffect(() => {
    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [initGame]);

  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      height: 'calc(100vh - 48px)', // Subtract tab height
      backgroundColor: '#1a1a1a',
      position: 'fixed',
      top: '48px', // Start after tab
      left: 0,
      right: 0,
      bottom: 0,
      margin: 0,
      padding: 0
    }}>
      <div id="game-container" style={{ 
        width: '60%', 
        height: '100%',
        borderRight: '1px solid #333',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        position: 'relative',
        margin: 0,
        padding: 0
      }} />
      <div style={{ 
        width: '20%', 
        height: '100%',
        padding: '20px',
        color: '#fff',
        borderRight: '1px solid #333'
      }}>
        <h2 style={{ marginBottom: '20px' }}>My Profile</h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: `#${getColorFromIndex(playerColorIndex).toString(16).padStart(6, '0')}`,
              borderRadius: '4px'
            }} />
            <span>You are the {getColorName(playerColorIndex)} color</span>
          </div>
        </div>
        <h3 style={{ marginBottom: '20px' }}>Actions</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          <button style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Action 1
          </button>
          <button style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Action 2
          </button>
          <button style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Action 3
          </button>
        </div>
      </div>
      <div style={{ 
        width: '20%', 
        height: '100%',
        padding: '20px',
        color: '#fff'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Chat</h2>
      </div>
    </div>
  );
};

export default React.memo(Game); 