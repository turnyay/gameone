use anchor_lang::prelude::*;
use crate::state::player::{Player, PLAYER_STATUS_READY};
use crate::state::platform::Platform;

#[derive(Accounts)]
pub struct CreatePlayer<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    
    #[account(
        init,
        payer = wallet,
        space = Player::LEN,
        seeds = [b"player", wallet.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_player(ctx: Context<CreatePlayer>, name: [u8; 32]) -> Result<()> {
    let player = &mut ctx.accounts.player;
    player.wallet = ctx.accounts.wallet.key();
    player.name = name;
    player.player_status = PLAYER_STATUS_READY;
    player.last_game = None;
    player.version = 1;
    player.bump = ctx.bumps.player;
    player._padding = [0; 5];

    // Increment total players count
    ctx.accounts.platform.total_players += 1;

    Ok(())
} 