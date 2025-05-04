use anchor_lang::prelude::*;

#[account]
pub struct Platform {
    pub admin: Pubkey,
    pub game_count: u32,
    pub games_completed: u32,
    pub total_players: u32,
    pub game_cost: u64,  // in lamports (0.1 SOL = 0.1 * 10^9 lamports)
    pub version: u8,
    pub bump: u8,
}

impl Platform {
    pub const LEN: usize = 8  // discriminator
        + 32                  // admin pubkey
        + 4                   // game_count (u32)
        + 4                   // games_completed (u32)
        + 4                   // total_players (u32)
        + 8                   // game_cost (u64)
        + 1                   // version (u8)
        + 1;                  // bump (u8)
} 