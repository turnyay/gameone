use anchor_lang::prelude::*;

use crate::constants::*;

#[account]
pub struct Game {
    pub admin: Pubkey,
    pub player_1: Pubkey, // red
    pub player_2: Pubkey, // yellow
    pub player_3: Pubkey, // blue
    pub player_4: Pubkey, // green
    pub game_state: u8,
    pub resources_per_minute: u8,
    pub rows: u8,
    pub columns: u8,
    pub tile_data: [TileData; 256],
    pub bump: u8,
}

impl Game {
    pub const LEN: usize = ANCHOR_DISC_LEN
        + (32 * 5)                              // admin + 4 player pubkeys
        + (256 * 3)                             // game tiles - u32 resource count + Pubkey + u8 color
        + 5                                     // game state + resources_per_minute + rows + columns + bump
        + 83;                                   // balance size
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default)]
pub struct TileData {
    pub tile_owner: u8,
    pub resource_count: u16,
}


