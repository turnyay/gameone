use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use state::*;
pub use constants::*;
pub use instructions::*;

declare_id!("4hCMsw4pRN8VsyPg6USUEyEmnX5VTApEAWyEmMdrrtGj");

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

    pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
        instructions::join_game(ctx, game_id)
    }

    pub fn move_resources(
        ctx: Context<MoveResources>,
        source_tile_index: u16,
        destination_tile_index: u16,
        resources_to_move: u16,
    ) -> Result<()> {
        instructions::move_resources(ctx, source_tile_index, destination_tile_index, resources_to_move)
    }

    pub fn attack_tile(
        ctx: Context<AttackTile>,
        attacker_tile_index: u16,
        defender_tile_index: u16,
    ) -> Result<()> {
        instructions::attack_tile(ctx, attacker_tile_index, defender_tile_index)
    }

    pub fn resolve_attack(ctx: Context<ResolveAttack>) -> Result<()> {
        instructions::resolve_attack(ctx)
    }

    pub fn add_resources(
        ctx: Context<AddResources>,
        tile_index: u16,
        resources_to_add: u32,
    ) -> Result<()> {
        instructions::add_resources(ctx, tile_index, resources_to_add)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize(ctx)
    }
}
