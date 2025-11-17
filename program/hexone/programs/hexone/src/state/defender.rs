use anchor_lang::prelude::*;

#[account]
pub struct Defender {
    pub game: Pubkey,
    pub defender_tile_index: u16,
    pub defender_tile_color: u8,
    pub attacker_tile_index: u16,
    pub attacker_tile_color: u8,
    pub attack_started_at: i64,
    pub is_attack_resolved: bool,
    pub attacker_won: bool,
    pub attacking_result: u16,    // Random number 0-999 from blockhash calculation
    pub defending_result: u16,    // Random number 0-999 from blockhash calculation
    pub bump: u8,
}

impl Defender {
    pub const LEN: usize = 8      // discriminator
        + 32                       // game
        + 2                        // defender_tile_index
        + 1                        // defender_tile_color
        + 2                        // attacker_tile_index
        + 1                        // attacker_tile_color
        + 8                        // attack_started_at
        + 1                        // is_attack_resolved
        + 1                        // attacker_won
        + 2                        // attacking_result (0-999)
        + 2                        // defending_result (0-999)
        + 1                        // bump
        + 3;                       // padding to align to 8 bytes
}

