use anchor_lang::prelude::*;
use crate::state::game::Game;
use crate::state::platform::Platform;
use crate::error::HexoneError;
use crate::constants::{
    RESOURCES_PER_MINUTE, 
    XP_PER_MINUTE_PER_TILE,
    GOLD_TIER_BONUS_XP_PER_MIN,
    SILVER_TIER_BONUS_XP_PER_MIN,
    BRONZE_TIER_BONUS_XP_PER_MIN,
    IRON_TIER_BONUS_XP_PER_MIN,
};

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        init,
        payer = admin,
        space = Game::LEN,
        seeds = [b"GAME-", platform.game_count.to_le_bytes().as_ref()],
        bump
    )]
    pub game: AccountLoader<'info, Game>,

    pub system_program: Program<'info, System>,
}

pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
    let game = &mut ctx.accounts.game.load_init()?;
    let platform = &mut ctx.accounts.platform;

    // Set admin
    game.admin = ctx.accounts.admin.key();

    // Set game_id from platform game_count (before incrementing)
    game.game_id = platform.game_count;

    // Set game dimensions
    game.rows = 11;
    game.columns = 13;

    // Set resources per minute
    game.resources_per_minute = RESOURCES_PER_MINUTE;

    // Store local variables for calculations
    let rows = game.rows as usize;
    let columns = game.columns as usize;

    // Initialize tile data
    for i in 0..game.tile_data.len() {
        game.tile_data[i].color = 0;
        game.tile_data[i].resource_count = 0;
    }

    // Set initial tiles for each player
    // Red (color 1) - top left
    game.tile_data[0].color = 1;
    game.tile_data[0].resource_count = 100;

    // Yellow (color 2) - top right
    game.tile_data[columns - 1].color = 2;
    game.tile_data[columns - 1].resource_count = 100;

    // Green (color 3) - bottom left
    game.tile_data[(rows - 1) * columns].color = 3;
    game.tile_data[(rows - 1) * columns].resource_count = 100;

    // Blue (color 4) - bottom right
    game.tile_data[(rows * columns) - 1].color = 4;
    game.tile_data[(rows * columns) - 1].resource_count = 100;

    // Initialize game state
    game.game_state = 0;
    game.version = 1;
    game.bump = ctx.bumps.game;

    // Initialize resource tracking fields
    game.available_resources_timestamp = 0; // Will be set when game starts
    game.total_resources_available = 0;
    game.resources_spent_player1 = 0;
    game.resources_spent_player2 = 0;
    game.resources_spent_player3 = 0;
    game.resources_spent_player4 = 0;

    // Initialize XP tracking fields
    game.xp_per_minute_per_tile = XP_PER_MINUTE_PER_TILE;
    game.xp_timestamp_player1 = 0; // Will be set when game starts
    game.xp_timestamp_player2 = 0; // Will be set when game starts
    game.xp_timestamp_player3 = 0; // Will be set when game starts
    game.xp_timestamp_player4 = 0; // Will be set when game starts
    game.xp_player1 = 0;
    game.xp_player2 = 0;
    game.xp_player3 = 0;
    game.xp_player4 = 0;
    
    // Initialize tile counts (each player starts with 1 tile)
    game.tile_count_color1 = 1;
    game.tile_count_color2 = 1;
    game.tile_count_color3 = 1;
    game.tile_count_color4 = 1;

    // Initialize tier counts to 0 for all players
    // Player 1
    game.iron_tile_count_player1 = 0;
    game.bronze_tile_count_player1 = 0;
    game.silver_tile_count_player1 = 0;
    game.gold_tile_count_player1 = 0;
    // Player 2
    game.iron_tile_count_player2 = 0;
    game.bronze_tile_count_player2 = 0;
    game.silver_tile_count_player2 = 0;
    game.gold_tile_count_player2 = 0;
    // Player 3
    game.iron_tile_count_player3 = 0;
    game.bronze_tile_count_player3 = 0;
    game.silver_tile_count_player3 = 0;
    game.gold_tile_count_player3 = 0;
    // Player 4
    game.iron_tile_count_player4 = 0;
    game.bronze_tile_count_player4 = 0;
    game.silver_tile_count_player4 = 0;
    game.gold_tile_count_player4 = 0;

    // Initialize tier bonus XP per minute
    game.gold_tier_bonus_xp_per_min = GOLD_TIER_BONUS_XP_PER_MIN;
    game.silver_tier_bonus_xp_per_min = SILVER_TIER_BONUS_XP_PER_MIN;
    game.bronze_tier_bonus_xp_per_min = BRONZE_TIER_BONUS_XP_PER_MIN;
    game.iron_tier_bonus_xp_per_min = IRON_TIER_BONUS_XP_PER_MIN;

    // Initialize winning player and XP limit
    game.winning_player_pubkey = Pubkey::default();
    game.winning_xp_limit = 10_000; // Default to 10,000 XP
    game.winner_calculation_flag = 0; // Flag to track if winner calculation has been triggered

    // Increment platform game count
    platform.game_count += 1;
    
    Ok(())
}