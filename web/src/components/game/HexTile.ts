import Phaser from 'phaser';
import { Player, GameState, HexTileConfig } from './types';
import { COLORS, PLAYER_COLORS, PLAYER_STARTING_POSITIONS } from './constants';

export class HexTile extends Phaser.GameObjects.Container {
  private hex: Phaser.GameObjects.Polygon;
  private dot: Phaser.GameObjects.Arc;
  private border: Phaser.GameObjects.Polygon;
  private originalPoints: Phaser.Geom.Point[];
  private hoverScale: number;
  private tileIndexX: number;
  private tileIndexY: number;
  private hexSize: number;
  private gap: number;
  private offsetWidth: number;
  private offsetHeight: number;
  private resources: number;
  private originalColorIndex: number | null = null; // Store the original player color index

  static players: Player[] = [];
  static playerColorIndex: number = 0;
  static selectedTile: HexTile | null = null;
  static validMoveTiles: Set<HexTile> = new Set();
  static currentUserColorIndex: number | null = null; // Color index of the connected player (the one with "YOU")
  static onMoveResources: ((sourceTileIndex: number, destinationTileIndex: number, resourcesToMove: number) => Promise<void>) | null = null;
  static moveAllResources: boolean = false; // Whether to move all resources except 1

  constructor(config: HexTileConfig) {
    super(config.scene, config.x, config.y);
    this.tileIndexX = config.tileIndexX;
    this.tileIndexY = config.tileIndexY;
    this.hexSize = config.hexSize;
    this.gap = config.gap;
    this.offsetWidth = config.offsetWidth;
    this.offsetHeight = config.offsetHeight;
    this.hoverScale = 1.1;
    this.resources = 0;

    // Create hex shape
    this.originalPoints = this.calculateHexPoints();
    this.hex = this.scene.add.polygon(0, 0, this.originalPoints, COLORS.BLACK);
    this.hex.setStrokeStyle(1, COLORS.GRAY);
    this.add(this.hex);

    // Create center dot
    this.dot = this.scene.add.circle(0, 0, 2, COLORS.WHITE);
    // this.add(this.dot);

    // Create border
    this.border = this.scene.add.polygon(0, 0, this.originalPoints, COLORS.BLACK);
    this.border.setStrokeStyle(2, COLORS.WHITE);
    this.border.setVisible(false);
    this.add(this.border);

    // Set up interactivity with proper hit area matching the hex visual
    // Use the hex polygon's interactive area directly
    this.hex.setInteractive(new Phaser.Geom.Polygon(this.originalPoints), Phaser.Geom.Polygon.Contains);
    this.hex.on('pointerover', this.onHover, this);
    this.hex.on('pointerout', this.onHoverOut, this);
    this.hex.on('pointerdown', this.onTileClick, this);

    // Add to scene
    this.scene.add.existing(this);
  }

  private calculateHexPoints(): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      points.push(new Phaser.Geom.Point(
        this.hexSize * Math.cos(angle) + (this.hexSize),
        this.hexSize * Math.sin(angle) + this.hexSize - 2
      ));
    }
    return points;
  }

  static setPlayerColorIndex(index: number) {
    HexTile.playerColorIndex = index;
  }

  static setCurrentUserColorIndex(index: number | null) {
    HexTile.currentUserColorIndex = index;
  }

  static setOnMoveResources(callback: ((sourceTileIndex: number, destinationTileIndex: number, resourcesToMove: number) => Promise<void>) | null) {
    HexTile.onMoveResources = callback;
  }

  static setMoveAllResources(value: boolean) {
    HexTile.moveAllResources = value;
  }

  private getNeighboringTiles(): HexTile[] {
    const neighbors: HexTile[] = [];
    const scene = this.scene as any;
    const tiles = scene.tiles;
    
    if (!tiles) {
      return neighbors;
    }

    const x = this.tileIndexX;
    const y = this.tileIndexY;
    const isOddColumn = x % 2 === 1;

    // For odd-r offset hexagonal grid:
    // Even columns: neighbors are at (1,0), (1,-1), (0,-1), (-1,-1), (-1,0), (0,1)
    // Odd columns: neighbors are at (1,1), (1,0), (0,-1), (-1,0), (-1,1), (0,1)
    const neighborOffsets = isOddColumn
      ? [
          { dx: 1, dy: 1 },   // bottom-right
          { dx: 1, dy: 0 },   // right
          { dx: 0, dy: -1 },  // top
          { dx: -1, dy: 0 },  // left
          { dx: -1, dy: 1 },  // bottom-left
          { dx: 0, dy: 1 }    // bottom
        ]
      : [
          { dx: 1, dy: 0 },   // right
          { dx: 1, dy: -1 },  // top-right
          { dx: 0, dy: -1 },  // top
          { dx: -1, dy: -1 }, // top-left
          { dx: -1, dy: 0 },  // left
          { dx: 0, dy: 1 }    // bottom
        ];

    for (const offset of neighborOffsets) {
      const neighborX = x + offset.dx;
      const neighborY = y + offset.dy;
      
      // Check bounds
      if (neighborY >= 0 && neighborY < tiles.length && 
          neighborX >= 0 && neighborX < tiles[neighborY]?.length) {
        const neighbor = tiles[neighborY][neighborX];
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }

  startSelectionAnimation() {
    this.hex.setScale(this.hoverScale);
    this.hex.setStrokeStyle(2, COLORS.WHITE);
    // Keep the original color, just change stroke for selection highlight
    // Don't change fill color if tile has a player color
  }

  clearSelection() {
    this.hex.setScale(1);
    // Restore original color if tile has one, otherwise use default
    if (this.originalColorIndex !== null) {
      const color = PLAYER_COLORS[this.originalColorIndex];
      this.hex.setFillStyle(color);
      this.hex.setStrokeStyle(1, COLORS.WHITE);
    } else {
      this.hex.setFillStyle(COLORS.BLACK);
      this.hex.setStrokeStyle(1, COLORS.GRAY);
    }
  }

  startValidMoveAnimation() {
    this.hex.setStrokeStyle(2, COLORS.GREEN);
    this.hex.setFillStyle(COLORS.DARK_GREEN);
  }

  clearValidMoves() {
    // Restore original color if tile has one, otherwise use default
    if (this.originalColorIndex !== null) {
      const color = PLAYER_COLORS[this.originalColorIndex];
      this.hex.setFillStyle(color);
      this.hex.setStrokeStyle(1, COLORS.WHITE);
    } else {
      this.hex.setFillStyle(COLORS.BLACK);
      this.hex.setStrokeStyle(1, COLORS.GRAY);
    }
  }

  onTileClick() {
    // Only allow interactions if there's a current user (someone with "YOU" label)
    if (HexTile.currentUserColorIndex === null) {
      return;
    }

    if (HexTile.validMoveTiles.has(this)) {
      // Handle territory expansion - send moveResources transaction
      if (HexTile.selectedTile && HexTile.onMoveResources) {
        const selectedTile = HexTile.selectedTile;
        const clickedTile = this;
        
        // Explicitly capture tile coordinates at click time - read directly from tile properties
        const sourceX = selectedTile.tileIndexX;
        const sourceY = selectedTile.tileIndexY;
        const destX = clickedTile.tileIndexX;
        const destY = clickedTile.tileIndexY;
        
        // Validate coordinates are defined and are numbers
        if (sourceX === undefined || sourceY === undefined || destX === undefined || destY === undefined) {
          console.error('ERROR: Tile coordinates are undefined!', {
            selectedTile: { x: sourceX, y: sourceY },
            clickedTile: { x: destX, y: destY }
          });
          return;
        }
        
        if (typeof sourceX !== 'number' || typeof sourceY !== 'number' || 
            typeof destX !== 'number' || typeof destY !== 'number') {
          console.error('ERROR: Tile coordinates are not numbers!', {
            selectedTile: { x: sourceX, y: sourceY, xType: typeof sourceX, yType: typeof sourceY },
            clickedTile: { x: destX, y: destY, xType: typeof destX, yType: typeof destY }
          });
          return;
        }
        
        // Get grid dimensions from scene or game data
        const scene = this.scene as any;
        // Access MainScene.gameData to get actual game dimensions
        const MainSceneClass = (scene.constructor as any);
        const gameData = MainSceneClass.gameData;
        const columns = gameData?.columns || scene.gridSizeColumns || 13;
        
        // Validate columns is a valid number
        if (!columns || columns === 0 || typeof columns !== 'number') {
          console.error('ERROR: Invalid columns value!', {
            columns,
            columnsType: typeof columns,
            gameData,
            gameDataColumns: gameData?.columns,
            sceneGridSizeColumns: scene.gridSizeColumns
          });
          return;
        }
        
        // Calculate tile indices explicitly: row * columns + column
        // Same formula as MainScene.ts line 123: y * columns + x
        const sourceTileIndex = sourceY * columns + sourceX;
        const destinationTileIndex = destY * columns + destX;
        
        // Log for debugging
        console.log('Tile click - calculating indices:', {
          source: { x: sourceX, y: sourceY, index: sourceTileIndex },
          destination: { x: destX, y: destY, index: destinationTileIndex },
          columns,
          sourceCalculation: `${sourceY} * ${columns} + ${sourceX} = ${sourceTileIndex}`,
          destCalculation: `${destY} * ${columns} + ${destX} = ${destinationTileIndex}`,
          selectedTileObject: selectedTile,
          clickedTileObject: clickedTile
        });
        
        // Validate indices are not 0 (unless actually at position 0,0)
        if (sourceTileIndex === 0 && (sourceX !== 0 || sourceY !== 0)) {
          console.error('ERROR: Source tile index is 0 but coordinates are not (0,0)!', {
            sourceX, sourceY, columns, sourceTileIndex
          });
          return;
        }
        if (destinationTileIndex === 0 && (destX !== 0 || destY !== 0)) {
          console.error('ERROR: Destination tile index is 0 but coordinates are not (0,0)!', {
            destX, destY, columns, destinationTileIndex
          });
          return;
        }
        
        // Calculate resources to move based on moveAllResources setting
        // If moveAllResources is true, move all resources except 1
        // Otherwise, move 50% of resources (rounded down to whole number)
        // Must always leave at least 1 resource (backend requirement)
        const resourcesToMove = HexTile.moveAllResources
          ? selectedTile.resources - 1  // Move all except 1
          : Math.min(
              Math.floor(selectedTile.resources * 0.5),
              selectedTile.resources - 1
            );
        
        // Only proceed if there are enough resources (at least 2, so 50% is at least 1)
        if (resourcesToMove >= 1 && selectedTile.resources >= 2) {
          // Call the move resources callback with explicitly calculated indices
          HexTile.onMoveResources(sourceTileIndex, destinationTileIndex, resourcesToMove)
            .then(() => {
              // Clear selection and valid moves after successful transaction
              selectedTile.clearSelection();
              HexTile.selectedTile = null;
              HexTile.validMoveTiles.forEach(tile => tile.clearValidMoves());
              HexTile.validMoveTiles.clear();
            })
            .catch((error) => {
              console.error('Error moving resources:', error);
              // Don't clear selection on error - let user try again
            });
        }
      }
    } else {
      // Check if this tile belongs to the current user (the one with "YOU" label)
      const tileKey = `${this.tileIndexX},${this.tileIndexY}`;
      const isCurrentUserTile = HexTile.players[HexTile.currentUserColorIndex]?.tiles.has(tileKey);
      
      if (isCurrentUserTile) {
        // Handle player tile selection - only for current user's tiles
        if (HexTile.selectedTile === this) {
          // Unselecting: clear selection and remove highlights from neighbors
          this.clearSelection();
          HexTile.selectedTile = null;
          // Clear valid move highlights on all neighboring tiles
          HexTile.validMoveTiles.forEach(tile => tile.clearValidMoves());
          HexTile.validMoveTiles.clear();
        } else {
          // Selecting a new tile: clear previous selection and show valid moves
          if (HexTile.selectedTile) {
            HexTile.selectedTile.clearSelection();
            // Clear previous valid move highlights
            HexTile.validMoveTiles.forEach(tile => tile.clearValidMoves());
            HexTile.validMoveTiles.clear();
          }
          this.startSelectionAnimation();
          HexTile.selectedTile = this;
          this.showValidMoves();
        }
      }
    }
  }

  private showValidMoves() {
    // Only show valid moves if there's a current user
    if (HexTile.currentUserColorIndex === null) {
      return;
    }

    // Clear any existing valid move highlights
    HexTile.validMoveTiles.forEach(tile => tile.clearValidMoves());
    HexTile.validMoveTiles.clear();

    // Get all neighboring tiles
    const neighbors = this.getNeighboringTiles();
    
    // Highlight empty tiles (tiles not owned by any player)
    for (const neighbor of neighbors) {
      const tileKey = `${neighbor.tileIndexX},${neighbor.tileIndexY}`;
      const isOwnedByCurrentUser = HexTile.players[HexTile.currentUserColorIndex]?.tiles.has(tileKey);
      
      // Show as valid move if it's an empty tile (not owned by current user)
      if (!isOwnedByCurrentUser) {
        neighbor.startValidMoveAnimation();
        HexTile.validMoveTiles.add(neighbor);
      }
    }
  }

  onHover() {
    if (!HexTile.validMoveTiles.has(this) && HexTile.selectedTile !== this) {
      this.hex.setScale(this.hoverScale);
      // Keep original color, just change stroke for hover
      if (this.originalColorIndex !== null) {
        this.hex.setStrokeStyle(1, COLORS.LIGHT_GRAY);
      } else {
        this.hex.setStrokeStyle(1, COLORS.LIGHT_GRAY);
      }
    }
  }

  onHoverOut() {
    if (!HexTile.validMoveTiles.has(this) && HexTile.selectedTile !== this) {
      this.hex.setScale(1);
      // Restore original stroke color
      if (this.originalColorIndex !== null) {
        this.hex.setStrokeStyle(1, COLORS.WHITE);
      } else {
        this.hex.setStrokeStyle(1, COLORS.GRAY);
      }
    }
  }

  startTargetAnimation() {
    this.hex.setStrokeStyle(2, COLORS.RED);
    this.hex.setFillStyle(COLORS.DARK_RED);
  }

  static initializePlayers() {
    // Initialize all 4 players, even if they don't have starting positions yet
    HexTile.players = [];
    for (let i = 0; i < 4; i++) {
      HexTile.players[i] = {
        colorIndex: i,
        tiles: new Set()
      };
    }
    // Add starting positions if they exist
    PLAYER_STARTING_POSITIONS.forEach((pos, index) => {
      if (HexTile.players[index]) {
        HexTile.players[index].tiles.add(`${pos.x},${pos.y}`);
      }
    });
  }

  static addTileToPlayer(tile: HexTile) {
    HexTile.players[HexTile.playerColorIndex].tiles.add(`${tile.tileIndexX},${tile.tileIndexY}`);
  }

  setColor(colorIndex: number) {
    if (colorIndex >= 0 && colorIndex < PLAYER_COLORS.length) {
      this.originalColorIndex = colorIndex; // Store the original color
      const color = PLAYER_COLORS[colorIndex];
      this.hex.setFillStyle(color);
      this.hex.setStrokeStyle(1, COLORS.WHITE);
      
      // Update resource text color if it exists
      const text = this.getByName('resourceText') as Phaser.GameObjects.Text;
      if (text) {
        text.setColor(this.getResourceTextColor());
      }
    }
  }

  private getResourceTextColor(): string {
    // Yellow (index 1) uses black text for visibility
    if (this.originalColorIndex === 1) {
      return '#000000'; // Black
    }
    return '#ffffff'; // White for Red, Green, and Blue
  }

  addResources(amount: number) {
    this.resources += amount;
    // Update visual representation of resources
    const text = this.getByName('resourceText') as Phaser.GameObjects.Text;
    const textColor = this.getResourceTextColor();
    if (text) {
      text.setText(this.resources.toString());
      text.setColor(textColor);
      text.setPosition(0, 0); // Ensure it stays centered
    } else {
      const newText = this.scene.add.text(0, 0, this.resources.toString(), {
        color: textColor,
        fontSize: '16px',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      newText.setOrigin(0.5, 0.5); // Center both horizontally and vertically
      newText.setPosition(0, 0); // Explicitly center in container
      newText.setName('resourceText');
      newText.setDepth(10); // Ensure text is on top
      this.add(newText);
    }
  }

  destroy() {
    if (this.hex) {
      this.hex.removeAllListeners();
      this.hex.removeInteractive();
    }
    super.destroy();
  }
} 