use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_WAITING, GAME_STATE_IN_PROGRESS};
use crate::state::player::{Player, PLAYER_STATUS_PLAYING, PLAYER_STATUS_READY};
use crate::state::platform::Platform;
use crate::error::HexoneError;
use crate::events::GameStarted;

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == wallet.key() @ HexoneError::PlayerNotAuthorized,
    )]
    pub player: Account<'info, Player>,

    #[account(
        seeds = [b"platform"],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(
        mut,
        seeds = [b"game_treasury", game.key().as_ref()],
        bump
    )]
    pub game_treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
    // Derive and validate game PDA
    let (expected_game, _bump) = Pubkey::find_program_address(
        &[b"GAME-", game_id.to_le_bytes().as_ref()],
        ctx.program_id,
    );
    require!(
        expected_game == ctx.accounts.game.key(),
        HexoneError::Invalid
    );

    let game = &mut ctx.accounts.game.load_mut()?;
    let player = &mut ctx.accounts.player;
    let platform = &ctx.accounts.platform;

    // Check game state
    require!(game.game_state == GAME_STATE_WAITING, HexoneError::GameNotWaiting);

    // Check if game is full
    if game.player1 != Pubkey::default() && 
       game.player2 != Pubkey::default() && 
       game.player3 != Pubkey::default() && 
       game.player4 != Pubkey::default() {
        return Err(HexoneError::GameFull.into());
    }

    // Transfer game cost from player to game treasury
    let game_cost = platform.game_cost;
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.wallet.key,
            ctx.accounts.game_treasury.key,
            game_cost,
        ),
        &[
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.game_treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

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
        
        // Set all timestamps to start the game
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        game.available_resources_timestamp = current_timestamp;
        game.xp_timestamp_player1 = current_timestamp;
        game.xp_timestamp_player2 = current_timestamp;
        game.xp_timestamp_player3 = current_timestamp;
        game.xp_timestamp_player4 = current_timestamp;
        
        // Emit game started event
        emit!(GameStarted {
            game_id: game.game_id,
        });
    }

    Ok(())
}