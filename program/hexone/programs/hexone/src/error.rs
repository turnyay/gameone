use anchor_lang::prelude::*;

#[error_code]
pub enum HexoneError {
    /// 6000 - Generic invalid state
    #[msg("Invalid state")]
    Invalid,

    /// 6001 - Unauthorized access
    #[msg("Unauthorized access")]
    Unauthorized,

    /// 6002 - Player is not authorized
    #[msg("Player is not authorized")]
    PlayerNotAuthorized,

    /// 6003 - Player is not ready
    #[msg("Player is not ready to join a game")]
    PlayerNotReady,

    /// 6004 - Game is not in waiting state
    #[msg("Game is not in waiting state")]
    GameNotWaiting,

    /// 6005 - Game is full
    #[msg("Game is full")]
    GameFull,
}
