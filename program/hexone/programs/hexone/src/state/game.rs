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
    // 8-byte aligned fields
    pub game_id: u64,
    pub available_resources_timestamp: i64,
    pub xp_timestamp_player1: i64,
    pub xp_timestamp_player2: i64,
    pub xp_timestamp_player3: i64,
    pub xp_timestamp_player4: i64,
    // 4-byte aligned fields
    pub resources_per_minute: u32,
    pub total_resources_available: u32,
    pub resources_spent_player1: u32,
    pub resources_spent_player2: u32,
    pub resources_spent_player3: u32,
    pub resources_spent_player4: u32,
    pub xp_per_minute_per_tile: u32,
    pub xp_player1: u32,
    pub xp_player2: u32,
    pub xp_player3: u32,
    pub xp_player4: u32,
    pub tile_count_color1: u32,
    pub tile_count_color2: u32,
    pub tile_count_color3: u32,
    pub tile_count_color4: u32,
    // 4 bytes of padding to align to 8 bytes before array
    pub _padding_u32: [u8; 4],
    // Array of TileData (4-byte aligned)
    pub tile_data: [TileData; 144],
    // 1-byte fields grouped together at the end
    pub game_state: u8,
    pub rows: u8,
    pub columns: u8,
    pub version: u8,
    pub bump: u8,
    // 3 bytes of padding to align to 8 bytes
    pub _padding: [u8; 3]
}

impl Game {
    pub const LEN: usize = 8     // discriminator
        + 32                     // admin
        + 32                     // player1
        + 32                     // player2
        + 32                     // player3
        + 32                     // player4
        + 8                      // game_id
        + 8                      // available_resources_timestamp
        + 8                      // xp_timestamp_player1
        + 8                      // xp_timestamp_player2
        + 8                      // xp_timestamp_player3
        + 8                      // xp_timestamp_player4
        + 4                      // resources_per_minute
        + 4                      // total_resources_available
        + 4                      // resources_spent_player1
        + 4                      // resources_spent_player2
        + 4                      // resources_spent_player3
        + 4                      // resources_spent_player4
        + 4                      // xp_per_minute_per_tile
        + 4                      // xp_player1
        + 4                      // xp_player2
        + 4                      // xp_player3
        + 4                      // xp_player4
        + 4                      // tile_count_color1
        + 4                      // tile_count_color2
        + 4                      // tile_count_color3
        + 4                      // tile_count_color4
        + 4                      // padding to align to 8 bytes
        + (144 * 4)              // tile_data (144 * 4)
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


