use anchor_lang::prelude::*;

#[error_code]
pub enum HexoneError {
    /// 6000
    #[msg("Invalid")]
    Invalid,
}
