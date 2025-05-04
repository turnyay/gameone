use anchor_lang::prelude::*;
use crate::state::player::Player;

#[derive(Accounts)]
pub struct CreatePlayer<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    
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

pub fn create_player(ctx: Context<CreatePlayer>) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let bump = ctx.bumps.player;
    let clock = Clock::get()?;

    player.wallet = ctx.accounts.wallet.key();
    player.games_played = 0;
    player.games_won = 0;
    player.last_game = None;
    player.created_at = clock.unix_timestamp;
    player.version = 1;
    player.bump = bump;

    Ok(())
} 