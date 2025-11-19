use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_IN_PROGRESS, get_tile_tier, update_tier_count_on_gain, calculate_tier_bonus_xp, check_for_winner};
use crate::state::player::Player;
use crate::error::HexoneError;

/// Calculate new XP based on time elapsed
/// Returns the XP to add: minutes * xp_per_minute_per_tile * number_of_tiles
fn calculate_new_xp(
    current_time: i64,
    last_timestamp: i64,
    xp_per_minute_per_tile: u32,
    number_of_tiles: u32,
) -> u32 {
    let time_diff_seconds = current_time - last_timestamp;
    
    // Only calculate if more than 1 minute (60 seconds) has passed
    if time_diff_seconds > 60 {
        let minutes_elapsed = (time_diff_seconds / 60) as u32;
        // Calculate XP: minutes * xp_per_minute_per_tile * number_of_tiles
        minutes_elapsed
            .checked_mul(xp_per_minute_per_tile)
            .and_then(|x| x.checked_mul(number_of_tiles))
            .unwrap_or(u32::MAX)
    } else {
        0
    }
}

/// Update XP for all players based on time elapsed
fn update_all_players_xp(game: &mut Game, current_time: i64) -> Result<()> {
    let xp_per_minute_per_tile = game.xp_per_minute_per_tile;
    
    // Update player 1 XP
    if current_time - game.xp_timestamp_player1 > 60 {
        let time_diff = current_time - game.xp_timestamp_player1;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        // Calculate base XP from tiles
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player1,
            xp_per_minute_per_tile,
            game.tile_count_color1,
        );
        
        // Calculate tier bonus XP
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player1,
            game.silver_tile_count_player1,
            game.bronze_tile_count_player1,
            game.iron_tile_count_player1,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        // Add both base XP and tier bonus XP
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player1 = game.xp_player1
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player1 = game.xp_timestamp_player1 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 2 XP
    if current_time - game.xp_timestamp_player2 > 60 {
        let time_diff = current_time - game.xp_timestamp_player2;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        // Calculate base XP from tiles
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player2,
            xp_per_minute_per_tile,
            game.tile_count_color2,
        );
        
        // Calculate tier bonus XP
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player2,
            game.silver_tile_count_player2,
            game.bronze_tile_count_player2,
            game.iron_tile_count_player2,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        // Add both base XP and tier bonus XP
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player2 = game.xp_player2
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player2 = game.xp_timestamp_player2 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 3 XP
    if current_time - game.xp_timestamp_player3 > 60 {
        let time_diff = current_time - game.xp_timestamp_player3;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        // Calculate base XP from tiles
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player3,
            xp_per_minute_per_tile,
            game.tile_count_color3,
        );
        
        // Calculate tier bonus XP
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player3,
            game.silver_tile_count_player3,
            game.bronze_tile_count_player3,
            game.iron_tile_count_player3,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        // Add both base XP and tier bonus XP
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player3 = game.xp_player3
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player3 = game.xp_timestamp_player3 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 4 XP
    if current_time - game.xp_timestamp_player4 > 60 {
        let time_diff = current_time - game.xp_timestamp_player4;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        // Calculate base XP from tiles
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player4,
            xp_per_minute_per_tile,
            game.tile_count_color4,
        );
        
        // Calculate tier bonus XP
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player4,
            game.silver_tile_count_player4,
            game.bronze_tile_count_player4,
            game.iron_tile_count_player4,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        // Add both base XP and tier bonus XP
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player4 = game.xp_player4
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player4 = game.xp_timestamp_player4 + (minutes_elapsed as i64 * 60);
    }
    
    Ok(())
}

/// Check if two tiles are adjacent in a hexagonal grid
/// Tiles are indexed as: index = row * columns + column
pub(crate) fn are_tiles_adjacent(
    source_index: u16,
    destination_index: u16,
    rows: u8,
    columns: u8,
) -> bool {
    let source_row = (source_index as usize) / (columns as usize);
    let source_col = (source_index as usize) % (columns as usize);
    let dest_row = (destination_index as usize) / (columns as usize);
    let dest_col = (destination_index as usize) % (columns as usize);

    // Check if rows are valid
    if source_row >= rows as usize || dest_row >= rows as usize {
        return false;
    }

    // Check if columns are valid
    if source_col >= columns as usize || dest_col >= columns as usize {
        return false;
    }

    // Use column-based offset (odd-r column offset) to match frontend
    // Frontend checks if column is odd, so we check if column is odd here too
    let is_odd_column = source_col % 2 == 1;

    // Define neighbor offsets based on whether the source column is odd or even
    // This matches the frontend logic in HexTile.ts getNeighboringTiles()
    let neighbor_offsets = if is_odd_column {
        // Odd columns: neighbors are (1,1), (1,0), (0,-1), (-1,0), (-1,1), (0,1)
        [
            (1, 1),   // bottom-right
            (1, 0),   // right
            (0, -1),  // top
            (-1, 0),  // left
            (-1, 1),  // bottom-left
            (0, 1),   // bottom
        ]
    } else {
        // Even columns: neighbors are (1,0), (1,-1), (0,-1), (-1,-1), (-1,0), (0,1)
        [
            (1, 0),   // right
            (1, -1),  // top-right
            (0, -1),  // top
            (-1, -1), // top-left
            (-1, 0),  // left
            (0, 1),   // bottom
        ]
    };

    // Check if destination is one of the neighbors
    for (col_offset, row_offset) in neighbor_offsets.iter() {
        let neighbor_row = source_row as i32 + row_offset;
        let neighbor_col = source_col as i32 + col_offset;

        // Check bounds
        if neighbor_row >= 0
            && neighbor_row < rows as i32
            && neighbor_col >= 0
            && neighbor_col < columns as i32
        {
            // Check if this neighbor matches the destination
            if neighbor_row as usize == dest_row && neighbor_col as usize == dest_col {
                return true;
            }
        }
    }

    false
}

// Make the function pub(crate) so it can be called from the program module but not re-exported
pub(crate) fn move_resources(
    ctx: Context<MoveResources>,
    source_tile_index: u16,
    destination_tile_index: u16,
    resources_to_move: u16,
) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    let wallet_key = ctx.accounts.wallet.key();

    // Check game state
    require!(
        game.game_state == GAME_STATE_IN_PROGRESS,
        HexoneError::Invalid
    );

    // Check if player is in the game and determine their color and index
    let (player_color, player_index) = if game.player1 == wallet_key {
        (1u8, 1usize) // Red
    } else if game.player2 == wallet_key {
        (2u8, 2usize) // Yellow
    } else if game.player3 == wallet_key {
        (3u8, 3usize) // Green
    } else if game.player4 == wallet_key {
        (4u8, 4usize) // Blue
    } else {
        return Err(HexoneError::PlayerNotAuthorized.into());
    };

    // Validate tile indices
    require!(
        source_tile_index < 144 && destination_tile_index < 144,
        HexoneError::Invalid
    );

    // Ensure source and destination are different
    require!(
        source_tile_index != destination_tile_index,
        HexoneError::Invalid
    );

    // Get rows and columns before getting mutable references
    let rows = game.rows;
    let columns = game.columns;

    // Check that tiles are adjacent (touching in hexagonal grid) - do this before mutable borrows
    require!(
        are_tiles_adjacent(
            source_tile_index,
            destination_tile_index,
            rows,
            columns
        ),
        HexoneError::Invalid
    );

    // Check tile colors before getting mutable references
    require!(
        game.tile_data[source_tile_index as usize].color == player_color,
        HexoneError::Invalid
    );

    // If the destination tile is not empty, it must be the same color as the player
    // If its another players color then the action is "attack" not "move_resources"
    if game.tile_data[destination_tile_index as usize].color != 0 {
        require!(
            game.tile_data[destination_tile_index as usize].color == player_color,
            HexoneError::Invalid
        );
    }

    // Check that source tile has at least 2 resources (must leave at least 1)
    require!(
        game.tile_data[source_tile_index as usize].resource_count >= 2,
        HexoneError::Invalid
    );

    // Check that resources_to_move is valid (must be at least 1 and leave at least 1)
    let source_resource_count = game.tile_data[source_tile_index as usize].resource_count;
    require!(
        resources_to_move >= 1 && resources_to_move <= source_resource_count - 1,
        HexoneError::Invalid
    );

    // Now we can safely get mutable references using split_at_mut or direct indexing
    // Since we know the indices are different, we can use unsafe or split_at_mut
    // For simplicity and safety, we'll use direct array indexing which Rust allows
    // when we're not holding references
    
    // Update source tile: subtract resources
    game.tile_data[source_tile_index as usize].resource_count = source_resource_count
        .checked_sub(resources_to_move)
        .ok_or(HexoneError::Invalid)?;

    // Check if destination tile was empty (color == 0) before setting color
    let was_empty_tile = game.tile_data[destination_tile_index as usize].color == 0;
    
    // Get clock before making changes
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    
    // Update XP for all players BEFORE changing tile counts (use old tile counts)
    update_all_players_xp(game, current_time)?;
    
    // Check if any player has reached the winning XP limit
    check_for_winner(game, current_time)?;
    
    // Update destination tile: add resources and set color
    let dest_resource_count = game.tile_data[destination_tile_index as usize].resource_count;
    game.tile_data[destination_tile_index as usize].resource_count = dest_resource_count
        .checked_add(resources_to_move)
        .ok_or(HexoneError::Invalid)?;
    game.tile_data[destination_tile_index as usize].color = player_color;

    // If moving to an empty tile, increment tile count for the player's color
    // (This happens AFTER XP calculation, so XP was calculated with old tile count)
    if was_empty_tile {
        match player_index {
            1 => {
                game.tile_count_color1 = game.tile_count_color1
                    .checked_add(1)
                    .ok_or(HexoneError::Invalid)?;
            }
            2 => {
                game.tile_count_color2 = game.tile_count_color2
                    .checked_add(1)
                    .ok_or(HexoneError::Invalid)?;
            }
            3 => {
                game.tile_count_color3 = game.tile_count_color3
                    .checked_add(1)
                    .ok_or(HexoneError::Invalid)?;
            }
            4 => {
                game.tile_count_color4 = game.tile_count_color4
                    .checked_add(1)
                    .ok_or(HexoneError::Invalid)?;
            }
            _ => return Err(HexoneError::Invalid.into()),
        }
        
        // Update tier count for the newly acquired tile
        let tier = get_tile_tier(destination_tile_index, rows, columns);
        update_tier_count_on_gain(game, player_index, tier)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct MoveResources<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == wallet.key() @ HexoneError::PlayerNotAuthorized
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,
}


