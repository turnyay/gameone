use anchor_lang::prelude::*;

#[account]
pub struct Player {
    pub wallet: Pubkey,           // Player's wallet address
    pub games_played: u32,        // Total number of games played
    pub games_won: u32,          // Total number of games won
    pub last_game: Option<Pubkey>, // Last game played (None if never played)
    pub created_at: i64,         // Timestamp when player account was created
    pub version: u8,             // For future upgrades
    pub bump: u8,                // PDA bump
}

impl Player {
    pub const LEN: usize = 8     // discriminator
        + 32                     // wallet
        + 4                      // games_played
        + 4                      // games_won
        + (1 + 32)              // Option<Pubkey> for last_game (1 byte for Option tag + 32 for Pubkey)
        + 8                      // created_at
        + 1                      // version
        + 1;                     // bump
} 