export interface ButtonStates {
  addResources: boolean;
}

export interface Player {
  colorIndex: number;
  tiles: Set<string>;
}

export interface GameState {
  players: Player[];
  selectedTile: any | null;
  validMoveTiles: Set<any>;
}

export interface HexTileConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  tileIndexX: number;
  tileIndexY: number;
  hexSize: number;
  gap: number;
  offsetWidth: number;
  offsetHeight: number;
} 