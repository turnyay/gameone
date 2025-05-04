use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::constants::*;

pub const GAME_STATE_WAITING: u8 = 0;
pub const GAME_STATE_IN_PROGRESS: u8 = 1;
pub const GAME_STATE_COMPLETED: u8 = 2;

#[account(zero_copy)]
#[repr(C)]
pub struct Game {
    // 32-byte aligned fields
    pub admin: Pubkey,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub player3: Pubkey,
    pub player4: Pubkey,
    // 4-byte aligned fields
    pub resources_per_minute: u32,
    // Array of TileData (4-byte aligned)
    pub tile_data: [TileData; 144],
    // 1-byte fields grouped together at the end
    pub game_state: u8,
    pub rows: u8,
    pub columns: u8,
    pub version: u8,
    pub bump: u8,
    // 3 bytes of padding to align to 4 bytes
    pub _padding: [u8; 3]
}

impl Game {
    pub const LEN: usize = 8     // discriminator
        + 32                     // admin
        + 32                     // player1
        + 32                     // player2
        + 32                     // player3
        + 32                     // player4
        + 4                      // resources_per_minute
        + (144 * 4)             // tile_data (144 * 4)
        + 5                      // game_state + rows + columns + version + bump
        + 3;                     // padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
#[repr(C)]
pub struct TileData {
    pub color: u8,              // 1-4 for red, yellow, blue, green
    pub _pad: u8,              // padding for alignment
    pub resource_count: u16,    // resources on this tile
}


