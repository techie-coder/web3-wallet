import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  PublicKey,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";

import {
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";


class Wallet {
  private connection: Connection;
  private keypair: Keypair;
  public usdcMint: PublicKey = new PublicKey("GrNg1XM2ctzeE2mXxXCfhcTUbejM8Z4z4wNVTy2FjMEz");
  public usdcDecimals: number = 6;

  constructor() {
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    this.keypair = Keypair.generate();
  }

  async getBalance() {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
  }

  async airdrop() {
    const airdropSignature = await this.connection.requestAirdrop(
      this.keypair.publicKey,
      LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(airdropSignature);
  }

  async getTransactionFees(recipient: Keypair) {
    const { blockhash } = await this.connection.getLatestBlockhash();
    const transferInstruction = SystemProgram.transfer({
    fromPubkey: this.keypair.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 1000000 // 0.001 SOL
    });

      // Create simulation instructions with placeholder compute unit limit
    const simulationInstructions = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000 // High value for simulation
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1n
      }),
      transferInstruction
    ];

    // Create transaction for simulation
    const simulationTransaction = new VersionedTransaction(
      new TransactionMessage({
        instructions: simulationInstructions,
        payerKey: this.keypair.publicKey,
        recentBlockhash: blockhash
      }).compileToV0Message()
    );

    // Simulate transaction to get compute unit estimate
    const simulationResponse = await this.connection.simulateTransaction(
      simulationTransaction
    );

    const estimatedUnits = simulationResponse.value.unitsConsumed;
    console.log(`Estimated compute units: ${estimatedUnits}`);

    // Create final transaction with compute budget instructions
    const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: estimatedUnits!
    });

    const computeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1n
    });

    // Build transaction with all instructions
    const messageV0 = new TransactionMessage({
      payerKey: this.keypair.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        computeUnitPriceInstruction,
        computeUnitLimitInstruction,
        transferInstruction
      ]
    }).compileToV0Message();

    const fees = await this.connection.getFeeForMessage(messageV0);
    console.log(`Transaction fee: ${fees.value} lamports`);
    return fees.value;
    }

  async transfer(toPublicKey: string, lamports: number) {
    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair.publicKey,
        toPubkey: new PublicKey(toPublicKey),
        lamports
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transferTransaction,
      [this.keypair]
    );
    return signature;
  }

  async createUsdcTokenAccount() {
    const feePayer = Keypair.fromSecretKey(
      this.keypair.secretKey);

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection, // connection
      feePayer, // fee payer
      this.usdcMint, // mint
      this.keypair.publicKey, // owner
    );
    return tokenAccount;
  }
}

export default Wallet;