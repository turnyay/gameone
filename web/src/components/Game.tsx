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
  public static players: Map<string, PlayerTileData> = new Map();
  private isTarget: boolean = false;
  private resources: number = 0;
  private resourceText?: Phaser.GameObjects.Text;
  private gridSizeColumns: number;
  private gridSizeRows: number;
  private static playerColorIndex: number = 0;
  private isSelected: boolean = false;
  public static selectedTile: HexTile | null = null;
  private static validMoveTiles: Set<HexTile> = new Set();

  public static setPlayerColorIndex(index: number) {
    HexTile.playerColorIndex = index;
  }

  private getNeighboringTiles(): {x: number, y: number}[] {
    const neighbors: {x: number, y: number}[] = [];
    const isEvenRow = this.tileIndexX % 2 === 0;
    
    // For a hexagonal grid, each tile has 6 neighbors
    // The pattern alternates between even and odd rows
    const directions = isEvenRow ? [
      {x: 1, y: 0},    // right
      {x: 0, y: 1},    // bottom
      {x: -1, y: 0},   // left
      {x: 0, y: -1},   // top
      {x: 1, y: -1},   // top-right
      {x: -1, y: -1}   // top-left
    ] : [
      {x: 1, y: 0},    // right
      {x: 0, y: 1},    // bottom
      {x: -1, y: 0},   // left
      {x: 0, y: -1},   // top
      {x: 1, y: 1},    // bottom-right
      {x: -1, y: 1}    // bottom-left
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

    // Add a more prominent glow effect for selected tile
    this.hex.setStrokeStyle(4, 0xffffff);
  }

  private clearSelection(): void {
    this.hex.clearFX();
    this.hex.setTo(this.originalPoints);
    this.hex.setInteractive(new Phaser.Geom.Polygon(this.originalPoints), Phaser.Geom.Polygon.Contains);
    this.scene.tweens.killTweensOf(this.hex);
    // Remove any stroke style
    this.hex.setStrokeStyle(2, 0xffffff); // Keep the player tile highlight
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

  private clearValidMoves(): void {
    HexTile.validMoveTiles.forEach(tile => {
      tile.hex.clearFX();
      tile.hex.setTo(tile.originalPoints);
      tile.hex.setInteractive(new Phaser.Geom.Polygon(tile.originalPoints), Phaser.Geom.Polygon.Contains);
      tile.scene.tweens.killTweensOf(tile.hex);
      tile.hex.setStrokeStyle(0);
      // Remove click handler from valid move tiles
      tile.hex.off('pointerdown', tile.onTileClick, tile);
      HexTile.validMoveTiles.delete(tile);
    });
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
      // If clicking the same tile, toggle selection
      if (HexTile.selectedTile === this) {
        this.clearSelection();
        this.clearValidMoves();
        HexTile.selectedTile = null;
        return;
      }

      // Clear previous selection and valid moves
      if (HexTile.selectedTile) {
        HexTile.selectedTile.clearSelection();
        this.clearValidMoves();
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
          // Check if the neighbor is a white tile
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          let isNeighborWhite = true;
          for (const [_, playerData] of Array.from(HexTile.players)) {
            if (playerData.tiles.has(neighborKey)) {
              isNeighborWhite = false;
              break;
            }
          }
          
          if (isNeighborWhite) {
            HexTile.validMoveTiles.add(neighborTile);
            neighborTile.startValidMoveAnimation();
          }
        }
      }
    } else if (isWhiteTile && HexTile.selectedTile && HexTile.validMoveTiles.has(this)) {
      // Handle territory expansion
      const selectedTile = HexTile.selectedTile;
      
      // Only proceed if the selected tile has more than 1 resource
      if (selectedTile.resources > 1) {
        // Get the moveAllResources setting from the game instance
        const gameInstance = this.scene.game as any;
        const moveAllResources = gameInstance.config.moveAllResources ?? true;

        // Calculate resources to move, ensuring at least 1 remains
        const resourcesToMove = moveAllResources ? selectedTile.resources - 1 : 1;
        
        // Subtract resources from selected tile
        selectedTile.resources -= resourcesToMove;
        selectedTile.updateResourceText();

        // Add this tile to player's territory
        const playerId = Array.from(HexTile.players.entries())
          .find(([_, data]) => data.colorIndex === HexTile.playerColorIndex)?.[0];
        
        if (playerId) {
          // Add to player's territory
          HexTile.addTileToPlayer(playerId, this.tileIndexX, this.tileIndexY);
          
          // Update tile color and resources
          const colors = [0xff0000, 0xffff00, 0x00ff00, 0x0000ff];
          const playerColor = colors[HexTile.playerColorIndex];
          
          // Update the hex color
          this.hex.clearFX();
          this.hex.setTo(this.originalPoints);
          this.hex.setFillStyle(playerColor);
          this.resources = resourcesToMove;

          // Update or create resource text
          const hexWidth = this.hexSize * 2;
          const hexHeight = this.hexSize * Math.sqrt(3);
          const textColor = HexTile.playerColorIndex === 0 || HexTile.playerColorIndex === 3 ? '#ffffff' : '#000000';

          if (this.resourceText) {
            this.resourceText.setText(this.resources.toString());
            this.resourceText.setColor(textColor);
          } else {
            this.resourceText = this.scene.add.text(0, 0, this.resources.toString(), {
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

          // Clear selection and valid moves
          selectedTile.clearSelection();
          this.clearValidMoves();
          HexTile.selectedTile = null;

          // Add selection capability to the new tile
          this.hex.on('pointerover', this.onHover, this);
          this.hex.on('pointerout', this.onHoverOut, this);
          this.hex.on('pointerdown', this.onTileClick, this);

          // Add highlight effect for player's tiles
          this.hex.setStrokeStyle(2, 0xffffff);
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
    
    // Check if this is one of the 7 target tiles
    this.isTarget = (
      (tileIndexX === 5 && tileIndexY === 4) ||
      (tileIndexX === 6 && tileIndexY === 4) ||
      (tileIndexX === 7 && tileIndexY === 4) ||
      (tileIndexX === 5 && tileIndexY === 5) ||
      (tileIndexX === 6 && tileIndexY === 5) ||
      (tileIndexX === 7 && tileIndexY === 5) ||
      (tileIndexX === 6 && tileIndexY === 6)
    );

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

    // Add resource text if the tile has resources
    if (this.resources > 0) {
      this.resourceText = scene.add.text(0, 0, this.resources.toString(), {
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
    // Check if this is the center tile
    const isCenterTile = this.tileIndexX === 6 && this.tileIndexY === 5;

    if (isCenterTile) {
      // Lighter blue diamond color
      this.hex.setFillStyle(0x87CEEB);
      
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

      // Add a crystalline glow effect
      this.hex.setStrokeStyle(2, 0xB0E0E6);
      
      // Create diamond shine effect
      const shine = this.scene.add.polygon(0, 0, this.originalPoints, 0xFFFFFF, 0.4);
      this.add(shine);
      shine.setDepth(1);

      // Animate the shine with a more crystalline pattern
      this.scene.tweens.add({
        targets: shine,
        x: this.hexSize * 2,
        y: -this.hexSize * 2,
        duration: 2000,
        repeat: -1,
        ease: 'Linear',
        onUpdate: () => {
          // Update shine opacity based on position for a more crystalline effect
          const progress = (shine.x + shine.y) / (this.hexSize * 4);
          shine.setAlpha(0.4 * (1 - Math.abs(progress - 0.5) * 2));
        }
      });

      // Add additional sparkle effect
      const sparkle = this.scene.add.polygon(0, 0, this.originalPoints, 0xB0E0E6, 0.2);
      this.add(sparkle);
      sparkle.setDepth(1);

      // Animate the sparkle in the opposite direction
      this.scene.tweens.add({
        targets: sparkle,
        x: -this.hexSize * 2,
        y: this.hexSize * 2,
        duration: 1500,
        repeat: -1,
        ease: 'Linear',
        onUpdate: () => {
          const progress = (sparkle.x + sparkle.y) / (this.hexSize * 4);
          sparkle.setAlpha(0.2 * (1 - Math.abs(progress - 0.5) * 2));
        }
      });
    } else {
      // Regular target tile appearance
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
    // Remove all event listeners before destroying
    this.hex.off('pointerover', this.onHover, this);
    this.hex.off('pointerout', this.onHoverOut, this);
    this.hex.off('pointerdown', this.onTileClick, this);
    super.destroy();
  }

  public addResources(amount: number): void {
    this.resources += amount;
    this.updateResourceText();
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
  const [playerColorIndex, setPlayerColorIndex] = React.useState(0);
  const [moveAllResources, setMoveAllResources] = React.useState(true);
  const [buttonStates, setButtonStates] = React.useState({
    addResources: false
  });
  const [availableResources, setAvailableResources] = React.useState(0);
  const [countdownSeconds, setCountdownSeconds] = React.useState(60);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setAvailableResources(current => current + 10);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleButtonClick = (buttonName: keyof typeof buttonStates) => {
    setButtonStates(prev => ({ ...prev, [buttonName]: true }));
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, [buttonName]: false }));
    }, 150);
  };

  const handleAddResources = () => {
    if (availableResources > 0 && HexTile.selectedTile) {
      // Add resources to the selected tile
      HexTile.selectedTile.addResources(availableResources);
      setAvailableResources(0);
    }
  };

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

    const config = {
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
      },
      moveAllResources: moveAllResources // Add the setting to the game config
    } as Phaser.Types.Core.GameConfig & { moveAllResources: boolean };

    gameRef.current = new Phaser.Game(config);
  }, [playerColorIndex, moveAllResources]); // Add moveAllResources to dependencies

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
      height: 'calc(100vh - 48px)',
      backgroundColor: '#1a1a1a',
      position: 'fixed',
      top: '48px',
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
        <h2 style={{ marginBottom: '20px' }}>Actions</h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <input
              type="checkbox"
              checked={moveAllResources}
              onChange={(e) => setMoveAllResources(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span>Move all resources</span>
          </div>
          <button 
            onClick={() => {
              handleButtonClick('addResources');
              handleAddResources();
            }}
            disabled={!HexTile.selectedTile || availableResources === 0}
            style={{
              padding: '10px',
              backgroundColor: !HexTile.selectedTile || availableResources === 0 ? '#666' : 
                buttonStates.addResources ? '#008000' : '#006400',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: '4px',
              cursor: !HexTile.selectedTile || availableResources === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              transform: buttonStates.addResources ? 'scale(0.98)' : 'scale(1)',
              opacity: !HexTile.selectedTile || availableResources === 0 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#008000';
              }
            }}
            onMouseLeave={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#006400';
              }
            }}
          >
            Add Resources
          </button>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Resources Available</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Resources:</span>
              <span style={{ color: '#ffa500' }}>{availableResources}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>More resources in:</span>
              <span style={{ color: '#ffa500' }}>{countdownSeconds} seconds</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Game Info</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game ID:</span>
              <span style={{ color: '#ffa500' }}>9C6Mu...Wn1pG</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game Prize Total:</span>
              <span style={{ color: '#ffa500' }}>4.25345 SOL</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '50px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>My Profile</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Player ID:</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px' 
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: `#${getColorFromIndex(playerColorIndex).toString(16).padStart(6, '0')}`,
                  borderRadius: '2px'
                }} />
                <span style={{ color: '#ffa500' }}>7xK9p...mN2vR</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Percent Gameboard:</span>
              <span style={{ color: '#ffa500' }}>0.73% (1/137)</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ 
        width: '25%',
        height: '100%',
        padding: '20px',
        color: '#fff'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Scoreboard</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {[0, 1, 2, 3].map((playerIndex) => {
              // Count tiles for this player by finding all entries with matching colorIndex
              let score = 0;
              Array.from(HexTile.players.entries()).forEach(([_, playerData]) => {
                if (playerData.colorIndex === playerIndex) {
                  score += playerData.tiles.size;
                }
              });
              const color = getColorFromIndex(playerIndex);
              const colorHex = `#${color.toString(16).padStart(6, '0')}`;
              const playerNames = ['Red', 'Yellow', 'Green', 'Blue'];
              
              return (
                <div key={playerIndex} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  padding: '8px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '4px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: colorHex,
                    borderRadius: '2px'
                  }} />
                  <span style={{ color: '#888', flex: 1 }}>{playerNames[playerIndex]}:</span>
                  <span style={{ color: '#ffa500' }}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <h2 style={{ marginBottom: '20px' }}>Live Feed</h2>
        <div style={{
          backgroundColor: '#000000',
          borderRadius: '4px',
          padding: '10px 5px',
          height: 'calc(100% - 400px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          {(() => {
            const now = new Date();
            const formatTime = (date: Date) => {
              return date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };
            return (
              <>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Connected to Solana blockchain...
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Loaded game board ok
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Initialized player resources
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Ready for gameplay
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Game); 