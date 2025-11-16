use anchor_lang::prelude::*;
use crate::state::game::Game;
use crate::state::platform::Platform;
use crate::error::HexoneError;

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump,
        constraint = platform.admin == admin.key() @ HexoneError::Unauthorized
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

    // Set game dimensions
    game.rows = 11;
    game.columns = 13;

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
    // Red (color 1) - tile below (row 1, col 0) for testing move_resources
    game.tile_data[columns].color = 1;
    game.tile_data[columns].resource_count = 0;

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

    // Increment platform game count
    platform.game_count += 1;
    
    Ok(())
}