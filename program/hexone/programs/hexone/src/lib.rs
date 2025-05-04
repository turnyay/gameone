use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

// pub use error::HexoneError;
pub use instructions::*;
pub use state::*;
pub use constants::*;

declare_id!("G99PsLJdkyfY9MgafG1SRBkucX9nqogYsyquPhgL9VkD");

#[program]
pub mod hexone {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
        instructions::create_game(ctx)
    }
}



