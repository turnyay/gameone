declare module '@project-serum/anchor' {
  import { Connection, PublicKey, Transaction } from '@solana/web3.js';
  import { Wallet } from '@solana/wallet-adapter-base';

  export interface Idl {
    version: string;
    name: string;
    instructions: IdlInstruction[];
    accounts: IdlAccountDef[];
    types: IdlTypeDef[];
    errors: IdlError[];
  }

  export interface IdlInstruction {
    name: string;
    accounts: IdlAccount[];
    args: IdlField[];
  }

  export interface IdlAccount {
    name: string;
    isMut: boolean;
    isSigner: boolean;
  }

  export interface IdlField {
    name: string;
    type: IdlType;
  }

  export interface IdlAccountDef {
    name: string;
    type: {
      kind: 'struct';
      fields: IdlField[];
    };
  }

  export interface IdlTypeDef {
    name: string;
    type: {
      kind: string;
      fields: IdlField[];
    };
  }

  export interface IdlError {
    code: number;
    name: string;
    msg: string;
  }

  export type IdlType = string | { vec: { defined: string } };

  export class Program {
    constructor(idl: Idl, programId: PublicKey, provider: AnchorProvider);
    programId: PublicKey;
    provider: AnchorProvider;
    methods: any;
    account: {
      game: {
        all: () => Promise<any[]>;
        fetch: (pubkey: PublicKey) => Promise<any>;
      };
    };
  }

  export class AnchorProvider {
    constructor(connection: Connection, wallet: Wallet, opts: any);
    connection: Connection;
    wallet: Wallet;
    publicKey: PublicKey;
  }
} 