use anchor_lang::prelude::*;

pub const PLAYER_STATUS_READY: u8 = 1;
pub const PLAYER_STATUS_PLAYING: u8 = 2;

#[account]
#[repr(C)]
pub struct Player {
    pub wallet: Pubkey,           // Player's wallet address
    pub name: [u8; 32],         // 32-byte string for player name
    pub games_played: u32,        // Total number of games played
    pub games_won: u32,          // Total number of games won
    pub last_game: Option<Pubkey>, // Last game played (None if never played)
    pub created_at: i64,         // Timestamp when player account was created
    pub player_status: u8,       // 1 = ready, 2 = playing
    pub version: u8,             // For future upgrades
    pub bump: u8,                // PDA bump
    pub _padding: [u8; 5],      // padding for alignment
}

impl Player {
    pub const LEN: usize = 8     // discriminator
        + 32                     // wallet
        + 32                     // name
        + 4                      // games_played
        + 4                      // games_won
        + 33                     // last_game (Option<Pubkey>)
        + 8                      // created_at
        + 1                      // player_status
        + 1                      // version
        + 1                      // bump
        + 5;                     // padding
} 