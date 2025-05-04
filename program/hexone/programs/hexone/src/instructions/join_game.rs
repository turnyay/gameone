use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_WAITING, GAME_STATE_IN_PROGRESS};
use crate::state::player::{Player, PLAYER_STATUS_PLAYING, PLAYER_STATUS_READY};
use crate::error::HexoneError;

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == wallet.key() @ HexoneError::PlayerNotAuthorized,
        constraint = player.player_status == PLAYER_STATUS_READY @ HexoneError::PlayerNotReady
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,
}

pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    let player = &mut ctx.accounts.player;

    // Check game state
    require!(game.game_state == GAME_STATE_WAITING, HexoneError::GameNotWaiting);

    // Check if game is full
    if game.player1 != Pubkey::default() && 
       game.player2 != Pubkey::default() && 
       game.player3 != Pubkey::default() && 
       game.player4 != Pubkey::default() {
        return Err(HexoneError::GameFull.into());
    }

    // Add player to first available slot
    if game.player1 == Pubkey::default() {
        game.player1 = ctx.accounts.wallet.key();
    } else if game.player2 == Pubkey::default() {
        game.player2 = ctx.accounts.wallet.key();
    } else if game.player3 == Pubkey::default() {
        game.player3 = ctx.accounts.wallet.key();
    } else if game.player4 == Pubkey::default() {
        game.player4 = ctx.accounts.wallet.key();
    }

    // Update player status
    player.player_status = PLAYER_STATUS_PLAYING;
    player.last_game = Some(ctx.accounts.game.key());

    // Update game state if all players have joined
    if game.player1 != Pubkey::default() && 
       game.player2 != Pubkey::default() && 
       game.player3 != Pubkey::default() && 
       game.player4 != Pubkey::default() {
        game.game_state = GAME_STATE_IN_PROGRESS;
    }

    Ok(())
}