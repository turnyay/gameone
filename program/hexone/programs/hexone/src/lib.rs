use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use state::*;
pub use constants::*;
pub use instructions::*;

declare_id!("G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD");

#[program]
pub mod hexone {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
        instructions::create_game(ctx)
    }

    pub fn create_platform(ctx: Context<CreatePlatform>) -> Result<()> {
        instructions::create_platform(ctx)
    }

    pub fn create_player(ctx: Context<CreatePlayer>, name: [u8; 32]) -> Result<()> {
        instructions::create_player(ctx, name)
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        instructions::join_game(ctx)
    }
}



