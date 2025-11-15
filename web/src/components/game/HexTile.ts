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

  static players: Player[] = [];
  static playerColorIndex: number = 0;
  static selectedTile: HexTile | null = null;
  static validMoveTiles: Set<HexTile> = new Set();

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

  private getNeighboringTiles(): HexTile[] {
    const neighbors: HexTile[] = [];
    const directions = [
      { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 },
      { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }
    ];

    for (const dir of directions) {
      const neighborX = this.tileIndexX + dir.x;
      const neighborY = this.tileIndexY + dir.y;
      const neighbor = (this.scene as any).tiles[neighborY]?.[neighborX];
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  startSelectionAnimation() {
    this.hex.setScale(this.hoverScale);
    this.hex.setStrokeStyle(2, COLORS.WHITE);
    this.hex.setFillStyle(COLORS.GRAY);
  }

  clearSelection() {
    this.hex.setScale(1);
    this.hex.setStrokeStyle(1, COLORS.GRAY);
    this.hex.setFillStyle(COLORS.BLACK);
  }

  startValidMoveAnimation() {
    this.hex.setStrokeStyle(2, COLORS.GREEN);
    this.hex.setFillStyle(COLORS.DARK_GREEN);
  }

  clearValidMoves() {
    this.hex.setStrokeStyle(1, COLORS.GRAY);
    this.hex.setFillStyle(COLORS.BLACK);
  }

  onTileClick() {
    if (HexTile.validMoveTiles.has(this)) {
      // Handle territory expansion
      HexTile.setPlayerColorIndex(HexTile.playerColorIndex);
      HexTile.addTileToPlayer(this);
      HexTile.selectedTile?.clearSelection();
      HexTile.selectedTile = null;
      HexTile.validMoveTiles.clear();
    } else if (HexTile.players[HexTile.playerColorIndex].tiles.has(`${this.tileIndexX},${this.tileIndexY}`)) {
      // Handle player tile selection
      if (HexTile.selectedTile === this) {
        this.clearSelection();
        HexTile.selectedTile = null;
        HexTile.validMoveTiles.clear();
      } else {
        if (HexTile.selectedTile) {
          HexTile.selectedTile.clearSelection();
        }
        this.startSelectionAnimation();
        HexTile.selectedTile = this;
        this.showValidMoves();
      }
    }
  }

  private showValidMoves() {
    const neighbors = this.getNeighboringTiles();
    for (const neighbor of neighbors) {
      if (!HexTile.players[HexTile.playerColorIndex].tiles.has(`${neighbor.tileIndexX},${neighbor.tileIndexY}`)) {
        neighbor.startValidMoveAnimation();
        HexTile.validMoveTiles.add(neighbor);
      }
    }
  }

  onHover() {
    if (!HexTile.validMoveTiles.has(this) && HexTile.selectedTile !== this) {
      this.hex.setScale(this.hoverScale);
      this.hex.setStrokeStyle(1, COLORS.LIGHT_GRAY);
    }
  }

  onHoverOut() {
    if (!HexTile.validMoveTiles.has(this) && HexTile.selectedTile !== this) {
      this.hex.setScale(1);
      this.hex.setStrokeStyle(1, COLORS.GRAY);
    }
  }

  startTargetAnimation() {
    this.hex.setStrokeStyle(2, COLORS.RED);
    this.hex.setFillStyle(COLORS.DARK_RED);
  }

  static initializePlayers() {
    HexTile.players = PLAYER_STARTING_POSITIONS.map((pos, index) => ({
      colorIndex: index,
      tiles: new Set([`${pos.x},${pos.y}`])
    }));
  }

  static addTileToPlayer(tile: HexTile) {
    HexTile.players[HexTile.playerColorIndex].tiles.add(`${tile.tileIndexX},${tile.tileIndexY}`);
  }

  addResources(amount: number) {
    this.resources += amount;
    // Update visual representation of resources
    const text = this.getByName('resourceText') as Phaser.GameObjects.Text;
    if (text) {
      text.setText(this.resources.toString());
      text.setPosition(0, 0); // Ensure it stays centered
    } else {
      const newText = this.scene.add.text(0, 0, this.resources.toString(), {
        color: '#ffffff',
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