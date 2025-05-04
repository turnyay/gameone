use anchor_lang::prelude::*;

use crate::constants::*;

#[account]
pub struct Game {
    pub admin: Pubkey,
    pub bump: u8,
}

impl Game {
    pub const LEN: usize = ANCHOR_DISC_LEN
        + (32 * 1)                              // admin
        + (1);                                  // bump
}
