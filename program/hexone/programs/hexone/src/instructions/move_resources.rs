use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_IN_PROGRESS};
use crate::state::player::Player;
use crate::error::HexoneError;

/// Check if two tiles are adjacent in a hexagonal grid
/// Tiles are indexed as: index = row * columns + column
fn are_tiles_adjacent(
    source_index: u8,
    destination_index: u8,
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

    let is_even_row = source_row % 2 == 0;

    // Define neighbor offsets based on whether the source row is even or odd
    let neighbor_offsets = if is_even_row {
        // Even rows: neighbors are (col+1,row), (col,row+1), (col-1,row), (col,row-1), (col+1,row-1), (col-1,row-1)
        [
            (1, 0),   // right
            (0, 1),   // bottom
            (-1, 0),  // left
            (0, -1),  // top
            (1, -1),  // top-right
            (-1, -1), // top-left
        ]
    } else {
        // Odd rows: neighbors are (col+1,row), (col,row+1), (col-1,row), (col,row-1), (col+1,row+1), (col-1,row+1)
        [
            (1, 0),  // right
            (0, 1),  // bottom
            (-1, 0), // left
            (0, -1), // top
            (1, 1),  // bottom-right
            (-1, 1), // bottom-left
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

pub fn move_resources(
    ctx: Context<MoveResources>,
    source_tile_index: u8,
    destination_tile_index: u8,
    resources_to_move: u16,
) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    let wallet_key = ctx.accounts.wallet.key();

    // Check game state
    require!(
        game.game_state == GAME_STATE_IN_PROGRESS,
        HexoneError::Invalid
    );

    // Check if player is in the game and determine their color
    let player_color = if game.player1 == wallet_key {
        1u8 // Red
    } else if game.player2 == wallet_key {
        2u8 // Yellow
    } else if game.player3 == wallet_key {
        3u8 // Green
    } else if game.player4 == wallet_key {
        4u8 // Blue
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
        game.tile_data[source_tile_index as usize].color == player_color 
            && game.tile_data[destination_tile_index as usize].color == player_color,
        HexoneError::Invalid
    );

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

    // Update destination tile: add resources and set color
    let dest_resource_count = game.tile_data[destination_tile_index as usize].resource_count;
    game.tile_data[destination_tile_index as usize].resource_count = dest_resource_count
        .checked_add(resources_to_move)
        .ok_or(HexoneError::Invalid)?;
    game.tile_data[destination_tile_index as usize].color = player_color;

    Ok(())
}

