use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_IN_PROGRESS};
use crate::state::player::{Player, PLAYER_STATUS_PLAYING};
use crate::error::HexoneError;

/// Calculate new resources available based on time elapsed
/// Returns the amount each player can add to the game
fn calculate_new_resources(
    current_time: i64,
    last_timestamp: i64,
    resources_per_minute: u32,
) -> u32 {
    let time_diff_seconds = current_time - last_timestamp;
    
    // Only calculate if more than 1 minute (60 seconds) has passed
    if time_diff_seconds > 60 {
        let minutes_elapsed = (time_diff_seconds / 60) as u32;
        // Calculate resources: minutes * resources_per_minute
        minutes_elapsed
            .checked_mul(resources_per_minute)
            .unwrap_or(u32::MAX)
    } else {
        0
    }
}

#[derive(Accounts)]
pub struct AddResources<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == wallet.key() @ HexoneError::PlayerNotAuthorized,
        constraint = player.player_status == PLAYER_STATUS_PLAYING @ HexoneError::PlayerNotAuthorized
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,
}

pub fn add_resources(
    ctx: Context<AddResources>,
    tile_index: u16,
    resources_to_add: u32,
) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    let wallet_key = ctx.accounts.wallet.key();
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Check game state
    require!(
        game.game_state == GAME_STATE_IN_PROGRESS,
        HexoneError::Invalid
    );

    // Check if player is in the game and determine their color
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

    // Validate tile index
    require!(
        tile_index < 144,
        HexoneError::Invalid
    );

    // Check that the tile belongs to the player (their color)
    require!(
        game.tile_data[tile_index as usize].color == player_color,
        HexoneError::Invalid
    );

    // Calculate and update total resources available if needed
    // Check if more than 1 minute has passed since last calculation
    let resources_per_minute = game.resources_per_minute;
    
    if current_time - game.available_resources_timestamp > 60 {
        // Calculate new resources (amount each player can add) and add to shared pool
        let calculated_resources = calculate_new_resources(
            current_time,
            game.available_resources_timestamp,
            resources_per_minute,
        );
        
        game.total_resources_available = game.total_resources_available
            .checked_add(calculated_resources)
            .ok_or(HexoneError::Invalid)?;
        
        // Update timestamp by only the number of full minutes elapsed
        let time_diff = current_time - game.available_resources_timestamp;
        let minutes_elapsed = time_diff / 60;
        game.available_resources_timestamp = game.available_resources_timestamp + (minutes_elapsed * 60);
    }

    // Get the player's current spent resources
    let current_spent = match player_index {
        1 => game.resources_spent_player1,
        2 => game.resources_spent_player2,
        3 => game.resources_spent_player3,
        4 => game.resources_spent_player4,
        _ => return Err(HexoneError::Invalid.into()),
    };

    // Check that player's total spent (current + new) doesn't exceed total available
    // total_resources_available only goes up, never down
    let total_spent_after = current_spent
        .checked_add(resources_to_add)
        .ok_or(HexoneError::Invalid)?;
    
    require!(
        total_spent_after <= game.total_resources_available,
        HexoneError::Invalid
    );

    // Track spent per player (total_resources_available is not decremented)
    match player_index {
        1 => {
            game.resources_spent_player1 = total_spent_after;
        }
        2 => {
            game.resources_spent_player2 = total_spent_after;
        }
        3 => {
            game.resources_spent_player3 = total_spent_after;
        }
        4 => {
            game.resources_spent_player4 = total_spent_after;
        }
        _ => return Err(HexoneError::Invalid.into()),
    }

    // Add resources to the tile
    let current_tile_resources = game.tile_data[tile_index as usize].resource_count;
    game.tile_data[tile_index as usize].resource_count = current_tile_resources
        .checked_add(resources_to_add as u16)
        .ok_or(HexoneError::Invalid)?;

    Ok(())
}

