use anchor_lang::prelude::*;

#[event]
pub struct AttackResolved {
    pub attacker_tile_color: u8,
    pub attacker_resources: u16,
    pub attacker_roll_result: u16, // 0-999
    pub defender_tile_color: u8,
    pub defender_resources: u16,
    pub defender_roll_result: u16, // 0-999
}

#[event]
pub struct GameStarted {
    pub game_id: u64,
}

