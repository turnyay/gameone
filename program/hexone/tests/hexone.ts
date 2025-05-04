import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hexone } from "../target/types/hexone";

describe("hexone", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.hexone as Program<Hexone>;

  it("Is create_game!", async () => {
    // Add your test here.
    const tx = await program.methods.create_game().rpc();
    console.log("Your create_game transaction signature", tx);
  });
});
