use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_IN_PROGRESS};
use crate::state::player::Player;
use crate::state::defender::Defender;
use crate::error::HexoneError;

// Import the adjacency check function from move_resources
use crate::instructions::move_resources::are_tiles_adjacent;

pub fn attack_tile(
    ctx: Context<AttackTile>,
    attacker_tile_index: u16,
    defender_tile_index: u16,
) -> Result<()> {
    let game = &ctx.accounts.game.load()?;
    let wallet_key = ctx.accounts.player_wallet.key();
    let clock = Clock::get()?;

    // Check game state
    require!(
        game.game_state == GAME_STATE_IN_PROGRESS,
        HexoneError::Invalid
    );

    // Check if player is in the game and determine their color
    let attacker_color = if game.player1 == wallet_key {
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
        attacker_tile_index < 144 && defender_tile_index < 144,
        HexoneError::Invalid
    );

    // Ensure tiles are different
    require!(
        attacker_tile_index != defender_tile_index,
        HexoneError::Invalid
    );

    // Get rows and columns
    let rows = game.rows;
    let columns = game.columns;

    // Check that tiles are adjacent
    require!(
        are_tiles_adjacent(
            attacker_tile_index,
            defender_tile_index,
            rows,
            columns
        ),
        HexoneError::Invalid
    );

    // Check attacker tile belongs to player
    require!(
        game.tile_data[attacker_tile_index as usize].color == attacker_color,
        HexoneError::Invalid
    );

    // Check defender tile belongs to another player (not empty, not attacker's color)
    let defender_tile = game.tile_data[defender_tile_index as usize];
    require!(
        defender_tile.color != 0 && defender_tile.color != attacker_color,
        HexoneError::Invalid
    );

    // Check attacker tile has at least 2 resources (must leave at least 1)
    require!(
        game.tile_data[attacker_tile_index as usize].resource_count >= 2,
        HexoneError::Invalid
    );

    // Initialize defending account
    // Note: Anchor's `init` will automatically fail if the account already exists,
    // which means this tile is already being attacked
    let defender = &mut ctx.accounts.defender;
    defender.game = ctx.accounts.game.key();
    defender.defender_tile_index = defender_tile_index;
    defender.defender_tile_color = defender_tile.color;
    defender.attacker_tile_index = attacker_tile_index;
    defender.attacker_tile_color = attacker_color;
    defender.attack_started_at = clock.unix_timestamp;
    defender.is_attack_resolved = false;
    defender.attacker_won = false;
    defender.bump = ctx.bumps.defender;

    Ok(())
}

#[derive(Accounts)]
#[instruction(attacker_tile_index: u16, defender_tile_index: u16)]
pub struct AttackTile<'info> {
    /// CHECK: The player's wallet (used for PDA derivation, not necessarily the signer)
    pub player_wallet: UncheckedAccount<'info>,

    /// CHECK: Signer must be either player's wallet or player's hotwallet
    #[account(mut)]
    pub signer_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", player_wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == player_wallet.key() @ HexoneError::PlayerNotAuthorized,
        constraint = (signer_wallet.key() == player.wallet || signer_wallet.key() == player.hotwallet) @ HexoneError::PlayerNotAuthorized
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(
        init,
        payer = signer_wallet,
        space = Defender::LEN,
        seeds = [
            b"defender",
            game.key().as_ref(),
            defender_tile_index.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub defender: Account<'info, Defender>,

    pub system_program: Program<'info, System>,
}

