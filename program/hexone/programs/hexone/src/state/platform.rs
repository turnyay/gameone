use anchor_lang::prelude::*;

#[account]
#[repr(C)]
pub struct Platform {
    pub admin: Pubkey,
    pub game_count: u64,
    pub games_completed: u64,
    pub total_players: u64,
    pub game_cost: u64,  // in lamports (0.1 SOL = 0.1 * 10^9 lamports)
    pub version: u8,
    pub bump: u8,
    pub _padding: [u8; 6],  // padding for alignment
}

impl Platform {
    pub const LEN: usize = 8     // discriminator
        + 32                     // admin
        + 8                      // game_count
        + 8                      // games_completed
        + 8                      // total_players
        + 8                      // game_cost
        + 1                      // version
        + 1                      // bump
        + 6;                     // padding
} 