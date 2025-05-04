use anchor_lang::prelude::*;

// use crate::error::HexoneError;
// use crate::constants::*;

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn create_game(
    ctx: Context<CreateGame>
) -> Result<()> {



    Ok(())
}