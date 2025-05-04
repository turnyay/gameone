use anchor_lang::prelude::*;

// use crate::error::HexoneError;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = Game::LEN
    )]
    pub game: Account<'info, Game>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn create_game(
    ctx: Context<CreateGame>
) -> Result<()> {
    // Initialize the game account
    let game = &mut ctx.accounts.game;
    let columns = 13;

    game.admin = ctx.accounts.user.key();
    // game.player_1 = ctx.accounts.user.key();
    // game.player_2 = ctx.accounts.user.key();
    // game.player_3 = ctx.accounts.user.key();
    // game.player_4 = ctx.accounts.user.key();

    game.game_state = 0;
    game.resources_per_minute = 0;
    game.rows = 11;
    game.columns = columns;
    game.tile_data = [TileData { tile_owner: 0, resource_count: 0 }; 256];

    // Set tile 0,0 to red (1)
    game.tile_data[0 * columns as usize + 0] = TileData { tile_owner: 1, resource_count: DEFAULT_RESOURCE_COUNT };

    // Set tile 12,0 to yellow (2) 
    game.tile_data[0 * columns as usize + 12] = TileData { tile_owner: 2, resource_count: DEFAULT_RESOURCE_COUNT };

    // Set tile 0,10 to blue (3)
    game.tile_data[10 * columns as usize + 0] = TileData { tile_owner: 3, resource_count: DEFAULT_RESOURCE_COUNT };

    // Set tile 12,10 to green (4)
    game.tile_data[10 * columns as usize + 12] = TileData { tile_owner: 4, resource_count: DEFAULT_RESOURCE_COUNT };
    
    Ok(())
}