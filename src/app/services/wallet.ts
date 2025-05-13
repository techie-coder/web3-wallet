import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl
} from "@solana/web3.js";

const fromKeypair = Keypair.generate();
const toKeypair = Keypair.generate();

console.log("From Public Key:", fromKeypair.publicKey.toBase58());
console.log("To Public Key:", toKeypair.publicKey.toBase58());

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const airdropSignature = await connection.requestAirdrop(
  fromKeypair.publicKey,
  LAMPORTS_PER_SOL
);

await connection.confirmTransaction(airdropSignature);

const lamportsToSend = 1_000_000;

const transferTransaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromKeypair.publicKey,
    toPubkey: toKeypair.publicKey,
    lamports: lamportsToSend
  })
);

const signature = await sendAndConfirmTransaction(
  connection,
  transferTransaction,
  [fromKeypair]
);
console.log("Transaction Signature:", signature);
