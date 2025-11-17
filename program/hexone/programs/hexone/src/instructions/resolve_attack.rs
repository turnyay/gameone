use anchor_lang::prelude::*;
use crate::state::game::{Game, GAME_STATE_IN_PROGRESS};
use crate::state::defender::Defender;
use crate::error::HexoneError;
use sha2::{Sha256, Digest};

// Minimum time to wait before resolving (3 seconds)
const MIN_ATTACK_DURATION: i64 = 3;

// Helper function to convert blockhash bytes to u64
fn blockhash_to_u64(blockhash: &[u8; 32]) -> u64 {
    // Take first 8 bytes and convert to u64
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&blockhash[0..8]);
    u64::from_le_bytes(bytes)
}

// Helper function to simulate getting a blockhash from a recent block
// Uses the current slot and an offset to simulate different recent blockhashes
fn get_simulated_blockhash(slot: u64, offset: u64, attack_key: &Pubkey) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(&slot.to_le_bytes());
    hasher.update(&offset.to_le_bytes());
    hasher.update(attack_key.as_ref());
    let hash = hasher.finalize();
    let mut result = [0u8; 32];
    result.copy_from_slice(&hash);
    result
}

pub fn resolve_attack(ctx: Context<ResolveAttack>) -> Result<()> {
    let game = &mut ctx.accounts.game.load_mut()?;
    let defender = &mut ctx.accounts.defender;
    let clock = Clock::get()?;

    // Check game state
    require!(
        game.game_state == GAME_STATE_IN_PROGRESS,
        HexoneError::Invalid
    );

    // Check attack hasn't been resolved
    require!(!defender.is_attack_resolved, HexoneError::Invalid);

    // Check enough time has passed (3 seconds = ~6 blocks at 400ms per block)
    require!(
        clock.unix_timestamp - defender.attack_started_at >= MIN_ATTACK_DURATION,
        HexoneError::Invalid
    );

    // Get blockhashes for random number generation
    // Attacker uses blockhashes at offsets 0, 4, 8 (simulating 1st, 5th, 9th recent blocks)
    // Defender uses blockhashes at offsets 1, 5, 11 (simulating 2nd, 6th, 12th recent blocks)
    
    // Get current slot from clock
    let current_slot = clock.slot;
    let defender_key = defender.key();
    
    // For attacker: use offsets 0, 4, 8
    let attacker_hash1 = get_simulated_blockhash(current_slot, 0, &defender_key);
    let attacker_hash4 = get_simulated_blockhash(current_slot, 4, &defender_key);
    let attacker_hash8 = get_simulated_blockhash(current_slot, 8, &defender_key);
    
    // For defender: use offsets 1, 5, 11
    let defender_hash1 = get_simulated_blockhash(current_slot, 1, &defender_key);
    let defender_hash5 = get_simulated_blockhash(current_slot, 5, &defender_key);
    let defender_hash11 = get_simulated_blockhash(current_slot, 11, &defender_key);

    // Convert blockhashes to numbers
    let attacker_num1 = blockhash_to_u64(&attacker_hash1);
    let attacker_num4 = blockhash_to_u64(&attacker_hash4);
    let attacker_num8 = blockhash_to_u64(&attacker_hash8);
    
    let defender_num1 = blockhash_to_u64(&defender_hash1);
    let defender_num5 = blockhash_to_u64(&defender_hash5);
    let defender_num11 = blockhash_to_u64(&defender_hash11);

    // Hash the combined numbers
    let mut attacker_hasher = Sha256::new();
    attacker_hasher.update(&attacker_num1.to_le_bytes());
    attacker_hasher.update(&attacker_num4.to_le_bytes());
    attacker_hasher.update(&attacker_num8.to_le_bytes());
    let attacker_hash = attacker_hasher.finalize();
    
    let mut defender_hasher = Sha256::new();
    defender_hasher.update(&defender_num1.to_le_bytes());
    defender_hasher.update(&defender_num5.to_le_bytes());
    defender_hasher.update(&defender_num11.to_le_bytes());
    let defender_hash = defender_hasher.finalize();

    // Convert hash to number and mod 1000 (results in 0-999)
    let attacker_value = u64::from_le_bytes([
        attacker_hash[0], attacker_hash[1], attacker_hash[2], attacker_hash[3],
        attacker_hash[4], attacker_hash[5], attacker_hash[6], attacker_hash[7],
    ]) % 1000;
    
    let defender_value = u64::from_le_bytes([
        defender_hash[0], defender_hash[1], defender_hash[2], defender_hash[3],
        defender_hash[4], defender_hash[5], defender_hash[6], defender_hash[7],
    ]) % 1000;

    // Store the random results (0-999)
    defender.attacking_result = attacker_value as u16;
    defender.defending_result = defender_value as u16;

    // Determine winner (higher number wins)
    let attacker_won = attacker_value > defender_value;
    defender.attacker_won = attacker_won;
    defender.is_attack_resolved = true;

    // Get color names for logging
    let attacker_color_name = match defender.attacker_tile_color {
        1 => "Red",
        2 => "Yellow",
        3 => "Green",
        4 => "Blue",
        _ => "Unknown",
    };
    
    let defender_color_name = match defender.defender_tile_color {
        1 => "Red",
        2 => "Yellow",
        3 => "Green",
        4 => "Blue",
        _ => "Unknown",
    };

    // Convert tile indices to (x, y) coordinates
    let columns = game.columns as usize;
    let attacker_x = (defender.attacker_tile_index as usize) % columns;
    let attacker_y = (defender.attacker_tile_index as usize) / columns;
    let defender_x = (defender.defender_tile_index as usize) % columns;
    let defender_y = (defender.defender_tile_index as usize) / columns;

    // Log the attack coordinates
    msg!(
        "Result for attack at ({},{}) to ({},{}): ",
        attacker_x,
        attacker_y,
        defender_x,
        defender_y
    );

    // Log the attack results
    if attacker_won {
        msg!(
            "Attacker {} ({}) won against {} ({})",
            attacker_color_name,
            attacker_value,
            defender_color_name,
            defender_value
        );
    } else {
        msg!(
            "Attacker {} ({}) lost against {} ({})",
            attacker_color_name,
            attacker_value,
            defender_color_name,
            defender_value
        );
    }

    // Get tile indices
    let attacker_tile_idx = defender.attacker_tile_index as usize;
    let defender_tile_idx = defender.defender_tile_index as usize;

    // Get current resource counts
    let attacker_resources = game.tile_data[attacker_tile_idx].resource_count;
    let defender_resources = game.tile_data[defender_tile_idx].resource_count;

    if attacker_won {
        // Attacker wins: defender loses 1 resource per successful attack
        if defender_resources > 1 {
            game.tile_data[defender_tile_idx].resource_count = defender_resources - 1;
        } else {
            // Defender has 1 resource left, attacker takes the tile
            // Ensure attacker has at least 1 resource to move
            let current_attacker_resources = game.tile_data[attacker_tile_idx].resource_count;
            require!(
                current_attacker_resources >= 1,
                HexoneError::Invalid
            );
            
            game.tile_data[defender_tile_idx].color = defender.attacker_tile_color;
            game.tile_data[defender_tile_idx].resource_count = 1;
            
            // Move 1 resource from attacker to defender tile
            game.tile_data[attacker_tile_idx].resource_count = current_attacker_resources
                .checked_sub(1)
                .ok_or(HexoneError::Invalid)?;
        }
    } else {
        // Defender wins: attacker loses 1 resource per failed attack
        // Attacker must keep at least 1 resource to maintain tile ownership
        if attacker_resources > 1 {
            game.tile_data[attacker_tile_idx].resource_count = attacker_resources - 1;
        } else {
            // Already at 1 resource, keep it
            game.tile_data[attacker_tile_idx].resource_count = 1;
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveAttack<'info> {
    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(
        mut,
        close = destination,  // Close the account and send rent to destination
        seeds = [
            b"defender",
            game.key().as_ref(),
            defender.defender_tile_index.to_le_bytes().as_ref(),
        ],
        bump = defender.bump,
        constraint = !defender.is_attack_resolved @ HexoneError::Invalid
    )]
    pub defender: Account<'info, Defender>,
    
    /// CHECK: Destination account to receive rent from closed defender account
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
}

