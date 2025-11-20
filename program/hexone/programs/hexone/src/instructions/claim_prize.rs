use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_WINNER_FOUND_NOT_PAID_OUT, GAME_STATE_IN_PROGRESS, calculate_tier_bonus_xp, check_for_winner};
use crate::state::player::Player;
use crate::error::HexoneError;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    
    #[account(mut)]
    pub game: AccountLoader<'info, Game>,
    
    /// CHECK: This is the game treasury PDA that holds the prize
    #[account(
        mut,
        seeds = [b"game_treasury", game.key().as_ref()],
        bump,
    )]
    pub game_treasury: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"player", wallet.key().as_ref()],
        bump = player.bump,
        constraint = player.wallet == wallet.key() @ HexoneError::PlayerNotAuthorized,
    )]
    pub player: Account<'info, Player>,
    
    pub system_program: Program<'info, System>,
}

/// Calculate new XP based on time elapsed
fn calculate_new_xp(
    current_time: i64,
    last_timestamp: i64,
    xp_per_minute_per_tile: u32,
    tile_count: u32,
) -> u32 {
    let time_diff = current_time - last_timestamp;
    if time_diff <= 60 {
        return 0;
    }
    let minutes_elapsed = (time_diff / 60) as u32;
    minutes_elapsed
        .checked_mul(xp_per_minute_per_tile)
        .and_then(|x| x.checked_mul(tile_count))
        .unwrap_or(0)
}

/// Update XP for all players based on time elapsed
fn update_all_players_xp(game: &mut Game, current_time: i64) -> Result<()> {
    let xp_per_minute_per_tile = game.xp_per_minute_per_tile;
    
    // Update player 1 XP
    if game.xp_timestamp_player1 > 0 && current_time - game.xp_timestamp_player1 > 60 {
        let time_diff = current_time - game.xp_timestamp_player1;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        // Calculate base XP from tiles
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player1,
            xp_per_minute_per_tile,
            game.tile_count_color1,
        );
        
        // Calculate tier bonus XP
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player1,
            game.silver_tile_count_player1,
            game.bronze_tile_count_player1,
            game.iron_tile_count_player1,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        // Add both base XP and tier bonus XP
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player1 = game.xp_player1
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player1 = game.xp_timestamp_player1 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 2 XP
    if game.xp_timestamp_player2 > 0 && current_time - game.xp_timestamp_player2 > 60 {
        let time_diff = current_time - game.xp_timestamp_player2;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player2,
            xp_per_minute_per_tile,
            game.tile_count_color2,
        );
        
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player2,
            game.silver_tile_count_player2,
            game.bronze_tile_count_player2,
            game.iron_tile_count_player2,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player2 = game.xp_player2
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player2 = game.xp_timestamp_player2 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 3 XP
    if game.xp_timestamp_player3 > 0 && current_time - game.xp_timestamp_player3 > 60 {
        let time_diff = current_time - game.xp_timestamp_player3;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player3,
            xp_per_minute_per_tile,
            game.tile_count_color3,
        );
        
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player3,
            game.silver_tile_count_player3,
            game.bronze_tile_count_player3,
            game.iron_tile_count_player3,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player3 = game.xp_player3
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player3 = game.xp_timestamp_player3 + (minutes_elapsed as i64 * 60);
    }
    
    // Update player 4 XP
    if game.xp_timestamp_player4 > 0 && current_time - game.xp_timestamp_player4 > 60 {
        let time_diff = current_time - game.xp_timestamp_player4;
        let minutes_elapsed = (time_diff / 60) as u32;
        
        let calculated_xp = calculate_new_xp(
            current_time,
            game.xp_timestamp_player4,
            xp_per_minute_per_tile,
            game.tile_count_color4,
        );
        
        let tier_bonus_xp = calculate_tier_bonus_xp(
            minutes_elapsed,
            game.gold_tile_count_player4,
            game.silver_tile_count_player4,
            game.bronze_tile_count_player4,
            game.iron_tile_count_player4,
            game.gold_tier_bonus_xp_per_min,
            game.silver_tier_bonus_xp_per_min,
            game.bronze_tier_bonus_xp_per_min,
            game.iron_tier_bonus_xp_per_min,
        )?;
        
        let total_xp = calculated_xp
            .checked_add(tier_bonus_xp)
            .ok_or(HexoneError::Invalid)?;
        
        game.xp_player4 = game.xp_player4
            .checked_add(total_xp)
            .ok_or(HexoneError::Invalid)?;
        game.xp_timestamp_player4 = game.xp_timestamp_player4 + (minutes_elapsed as i64 * 60);
    }
    
    Ok(())
}

pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    
    // Get current time
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    
    // First, update XP for all players
    update_all_players_xp(game, current_time)?;
    
    // Check if any player has reached the limit and determine winner if needed
    // This will set the winner if limit is reached and flag is not set
    check_for_winner(game, current_time)?;
    
    // Check if game state is winner found not paid out (or in progress with limit reached)
    // Allow claiming if either:
    // 1. Game state is already "winner found not paid out"
    // 2. Game is in progress but any player has reached the limit
    let wallet_key = ctx.accounts.wallet.key();
    let mut can_claim = false;
    let mut is_winner = false;
    
    if game.game_state == GAME_STATE_WINNER_FOUND_NOT_PAID_OUT {
        // Check if the signer is the winning player
        is_winner = game.winning_player_pubkey == wallet_key;
        can_claim = is_winner;
    } else if game.game_state == GAME_STATE_IN_PROGRESS {
        // Check if any player has reached the limit
        let players = [
            (game.player1, game.xp_player1),
            (game.player2, game.xp_player2),
            (game.player3, game.xp_player3),
            (game.player4, game.xp_player4),
        ];
        
        for (player_pubkey, xp) in players.iter() {
            if *player_pubkey == Pubkey::default() {
                continue;
            }
            
            // Check if this player has reached the limit
            if (*xp as u64) >= game.winning_xp_limit {
                // If limit reached, trigger winner calculation
                check_for_winner(game, current_time)?;
                
                // Check if the signer is this player (or the calculated winner)
                if *player_pubkey == wallet_key || game.winning_player_pubkey == wallet_key {
                    is_winner = true;
                    can_claim = true;
                }
                break;
            }
        }
    }
    
    require!(can_claim && is_winner, HexoneError::Invalid);
    
    // Get the treasury balance (this is the prize)
    let treasury_balance = ctx.accounts.game_treasury.lamports();
    
    // Transfer the entire treasury balance to the winner's wallet using system program
    // We need to use invoke_signed because the treasury is a PDA and needs program signature
    let game_key = ctx.accounts.game.key();
    let seeds = &[
        b"game_treasury",
        game_key.as_ref(),
        &[ctx.bumps.game_treasury],
    ];
    let signer_seeds = &[&seeds[..]];
    
    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.game_treasury.key,
            ctx.accounts.wallet.key,
            treasury_balance,
        ),
        &[
            ctx.accounts.game_treasury.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        signer_seeds,
    )?;
    
    // Update game state to completed (winner found and paid)
    game.game_state = crate::state::game::GAME_STATE_COMPLETED;
    
    // Increment games won count for the winner
    let player = &mut ctx.accounts.player;
    player.games_won = player.games_won
        .checked_add(1)
        .ok_or(HexoneError::Invalid)?;
    
    Ok(())
}

