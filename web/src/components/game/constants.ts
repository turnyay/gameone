export const COLORS = {
  RED: 0xff0000,
  YELLOW: 0xffff00,
  GREEN: 0x00aa00, // Darker, more saturated green
  BLUE: 0x0000ff,
  WHITE: 0xffffff,
  BLACK: 0x000000,
  GRAY: 0x333333,
  LIGHT_GRAY: 0x666666,
  DARK_GREEN: 0x003300,
  DARK_RED: 0x330000
};

export const PLAYER_COLORS = [COLORS.RED, COLORS.YELLOW, COLORS.GREEN, COLORS.BLUE];

export const GRID_CONFIG = {
  HEX_SIZE: 25,
  GAP: 0,
  OFFSET_WIDTH: 80,
  OFFSET_HEIGHT: 80,
  GRID_SIZE_ROWS: 11,
  GRID_SIZE_COLUMNS: 13
};

export const INITIAL_RESOURCES = 10;
export const RESOURCE_REFRESH_RATE = 60; // seconds
export const RESOURCES_PER_REFRESH = 10;

export const PLAYER_STARTING_POSITIONS = [
  { x: 0, y: 0 },
  { x: 0, y: 10 },
  { x: 10, y: 0 },
  { x: 10, y: 10 }
]; 