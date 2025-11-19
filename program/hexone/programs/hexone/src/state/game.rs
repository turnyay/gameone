use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::constants::*;
use crate::error::HexoneError;

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
    // Tier tracking for each player (u8 counts: iron, bronze, silver, gold)
    // Player 1 tiers
    pub iron_tile_count_player1: u8,
    pub bronze_tile_count_player1: u8,
    pub silver_tile_count_player1: u8,
    pub gold_tile_count_player1: u8,
    // Player 2 tiers
    pub iron_tile_count_player2: u8,
    pub bronze_tile_count_player2: u8,
    pub silver_tile_count_player2: u8,
    pub gold_tile_count_player2: u8,
    // Player 3 tiers
    pub iron_tile_count_player3: u8,
    pub bronze_tile_count_player3: u8,
    pub silver_tile_count_player3: u8,
    pub gold_tile_count_player3: u8,
    // Player 4 tiers
    pub iron_tile_count_player4: u8,
    pub bronze_tile_count_player4: u8,
    pub silver_tile_count_player4: u8,
    pub gold_tile_count_player4: u8,
    // Tier bonus XP per minute (u8 values)
    pub gold_tier_bonus_xp_per_min: u8,
    pub silver_tier_bonus_xp_per_min: u8,
    pub bronze_tier_bonus_xp_per_min: u8,
    pub iron_tier_bonus_xp_per_min: u8,
    // 4 bytes of padding to align to 8 bytes after tier bonus XP
    pub _padding_tier_bonus: [u8; 4],
    // 1-byte fields grouped together at the end
    pub game_state: u8,
    pub rows: u8,
    pub columns: u8,
    pub version: u8,
    pub bump: u8,
    // 3 bytes of padding to align to 8 bytes
    pub _padding: [u8; 3]
}

/// Calculate the tier (ring distance) of a tile from the center
/// Center is at row 5, col 6 (0-indexed)
/// Returns: 0 = gold (center), 1 = silver, 2 = bronze, 3 = iron (ring 3), 4 = base tile (ring 4+, not tracked)
/// Uses a simple distance calculation instead of BFS for efficiency
pub fn get_tile_tier(tile_index: u16, _rows: u8, columns: u8) -> u8 {
    const CENTER_ROW: i32 = 5;
    const CENTER_COL: i32 = 6;
    
    let tile_row = (tile_index as usize) / (columns as usize);
    let tile_col = (tile_index as usize) % (columns as usize);
    
    // Calculate Manhattan distance in hexagonal grid
    // For odd-r offset hexagonal grid, use axial coordinates conversion
    let _row_diff = tile_row as i32 - CENTER_ROW;
    let _col_diff = tile_col as i32 - CENTER_COL;
    
    // Convert to axial coordinates for hexagonal distance
    // In odd-r offset: q = col, r = row - (col - (col & 1)) / 2
    let center_q = CENTER_COL;
    let center_r = CENTER_ROW - (CENTER_COL - (CENTER_COL & 1)) / 2;
    
    let tile_q = tile_col as i32;
    let tile_r = tile_row as i32 - (tile_col as i32 - (tile_col as i32 & 1)) / 2;
    
    // Hexagonal distance = (|dq| + |dr| + |ds|) / 2 where ds = -dq - dr
    let dq = tile_q - center_q;
    let dr = tile_r - center_r;
    let ds = -dq - dr;
    
    let distance = ((dq.abs() + dr.abs() + ds.abs()) / 2) as u8;
    
    // Return tier based on distance
    if distance == 0 {
        return 0; // Gold (center)
    } else if distance == 1 {
        return 1; // Silver (ring 1)
    } else if distance == 2 {
        return 2; // Bronze (ring 2)
    } else if distance == 3 {
        return 3; // Iron (ring 3)
    } else {
        // Distance >= 4: base tile (not tracked in game account)
        return 4;
    }
}

/// Update tier count when a tile changes ownership
/// tier: 0 = gold, 1 = silver, 2 = bronze, 3 = iron, 4 = base tile (not tracked, returns Ok)
pub fn update_tier_count_on_gain(
    game: &mut Game,
    player_index: usize,
    tier: u8,
) -> Result<()> {
    // Base tiles (tier 4) are not tracked, just return Ok
    if tier == 4 {
        return Ok(());
    }
    match (player_index, tier) {
        (1, 0) => {
            game.gold_tile_count_player1 = game.gold_tile_count_player1
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 1) => {
            game.silver_tile_count_player1 = game.silver_tile_count_player1
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 2) => {
            game.bronze_tile_count_player1 = game.bronze_tile_count_player1
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 3) => {
            game.iron_tile_count_player1 = game.iron_tile_count_player1
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 0) => {
            game.gold_tile_count_player2 = game.gold_tile_count_player2
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 1) => {
            game.silver_tile_count_player2 = game.silver_tile_count_player2
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 2) => {
            game.bronze_tile_count_player2 = game.bronze_tile_count_player2
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 3) => {
            game.iron_tile_count_player2 = game.iron_tile_count_player2
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 0) => {
            game.gold_tile_count_player3 = game.gold_tile_count_player3
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 1) => {
            game.silver_tile_count_player3 = game.silver_tile_count_player3
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 2) => {
            game.bronze_tile_count_player3 = game.bronze_tile_count_player3
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 3) => {
            game.iron_tile_count_player3 = game.iron_tile_count_player3
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 0) => {
            game.gold_tile_count_player4 = game.gold_tile_count_player4
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 1) => {
            game.silver_tile_count_player4 = game.silver_tile_count_player4
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 2) => {
            game.bronze_tile_count_player4 = game.bronze_tile_count_player4
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 3) => {
            game.iron_tile_count_player4 = game.iron_tile_count_player4
                .checked_add(1)
                .ok_or(HexoneError::Invalid)?;
        }
        _ => return Err(HexoneError::Invalid.into()),
    }
    Ok(())
}

/// Update tier count when a tile is lost
/// tier: 0 = gold, 1 = silver, 2 = bronze, 3 = iron, 4 = base tile (not tracked, returns Ok)
pub fn update_tier_count_on_loss(
    game: &mut Game,
    player_index: usize,
    tier: u8,
) -> Result<()> {
    // Base tiles (tier 4) are not tracked, just return Ok
    if tier == 4 {
        return Ok(());
    }
    match (player_index, tier) {
        (1, 0) => {
            game.gold_tile_count_player1 = game.gold_tile_count_player1
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 1) => {
            game.silver_tile_count_player1 = game.silver_tile_count_player1
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 2) => {
            game.bronze_tile_count_player1 = game.bronze_tile_count_player1
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (1, 3) => {
            game.iron_tile_count_player1 = game.iron_tile_count_player1
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 0) => {
            game.gold_tile_count_player2 = game.gold_tile_count_player2
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 1) => {
            game.silver_tile_count_player2 = game.silver_tile_count_player2
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 2) => {
            game.bronze_tile_count_player2 = game.bronze_tile_count_player2
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (2, 3) => {
            game.iron_tile_count_player2 = game.iron_tile_count_player2
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 0) => {
            game.gold_tile_count_player3 = game.gold_tile_count_player3
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 1) => {
            game.silver_tile_count_player3 = game.silver_tile_count_player3
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 2) => {
            game.bronze_tile_count_player3 = game.bronze_tile_count_player3
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (3, 3) => {
            game.iron_tile_count_player3 = game.iron_tile_count_player3
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 0) => {
            game.gold_tile_count_player4 = game.gold_tile_count_player4
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 1) => {
            game.silver_tile_count_player4 = game.silver_tile_count_player4
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 2) => {
            game.bronze_tile_count_player4 = game.bronze_tile_count_player4
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        (4, 3) => {
            game.iron_tile_count_player4 = game.iron_tile_count_player4
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
        _ => return Err(HexoneError::Invalid.into()),
    }
    Ok(())
}

/// Calculate tier bonus XP for a player
/// Returns: minutes_elapsed * (gold_count * gold_xp + silver_count * silver_xp + bronze_count * bronze_xp + iron_count * iron_xp)
pub fn calculate_tier_bonus_xp(
    minutes_elapsed: u32,
    gold_count: u8,
    silver_count: u8,
    bronze_count: u8,
    iron_count: u8,
    gold_xp_per_min: u8,
    silver_xp_per_min: u8,
    bronze_xp_per_min: u8,
    iron_xp_per_min: u8,
) -> Result<u32> {
    // Calculate XP per minute for each tier
    let gold_xp = (gold_count as u32)
        .checked_mul(gold_xp_per_min as u32)
        .ok_or(HexoneError::Invalid)?;
    
    let silver_xp = (silver_count as u32)
        .checked_mul(silver_xp_per_min as u32)
        .ok_or(HexoneError::Invalid)?;
    
    let bronze_xp = (bronze_count as u32)
        .checked_mul(bronze_xp_per_min as u32)
        .ok_or(HexoneError::Invalid)?;
    
    let iron_xp = (iron_count as u32)
        .checked_mul(iron_xp_per_min as u32)
        .ok_or(HexoneError::Invalid)?;
    
    // Sum all tier XP per minute
    let total_xp_per_min = gold_xp
        .checked_add(silver_xp)
        .and_then(|x| x.checked_add(bronze_xp))
        .and_then(|x| x.checked_add(iron_xp))
        .ok_or(HexoneError::Invalid)?;
    
    // Multiply by minutes elapsed
    let total_bonus_xp = total_xp_per_min
        .checked_mul(minutes_elapsed)
        .ok_or(HexoneError::Invalid)?;
    
    Ok(total_bonus_xp)
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
        + 16                     // tier counts (4 players * 4 tiers = 16 u8)
        + 4                      // tier bonus XP per minute (4 u8)
        + 4                      // padding to align to 8 bytes after tier bonus XP
        + 5                      // game_state + rows + columns + version + bump
        + 3;                     // padding to align to 8 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
#[repr(C)]
pub struct TileData {
    pub color: u8,              // 1-4 for red, yellow, blue, green
    pub _pad: u8,              // padding for alignment
    pub resource_count: u16,    // resources on this tile
    }


