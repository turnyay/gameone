use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::platform::Platform;

#[derive(Accounts)]
pub struct CreatePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = Platform::LEN,
        seeds = [b"hexone"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    pub system_program: Program<'info, System>,
}

pub fn create_platform(
    ctx: Context<CreatePlatform>
) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    let bump = ctx.bumps.platform;

    platform.admin = ctx.accounts.admin.key();
    platform.game_count = 0;
    platform.games_completed = 0;
    platform.total_players = 0;
    platform.game_cost = DEFAULT_GAME_COST;
    platform.version = 1;
    platform.bump = bump;

    Ok(())
} 