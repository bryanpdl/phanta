import { 
  Connection, 
  PublicKey, 
  Transaction as SolanaTransaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  TransactionInstruction
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount
} from "@solana/spl-token";
import { TOKEN_PUBKEY } from "./constants";

// Add Phantom provider interface
interface PhantomProvider {
  isPhantom?: boolean;
  solana?: {
    isConnected: boolean;
    publicKey: PublicKey;
    signTransaction: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  };
}

// Add window type extension
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isConnected: boolean;
        publicKey: PublicKey;
        signTransaction(transaction: SolanaTransaction): Promise<SolanaTransaction>;
      };
    };
  }
}

// Constants from phantom.ts to maintain consistency
const NETWORK_FEE_ESTIMATE = 0.00015; // ~0.00015 SOL per transaction
const MIN_FEE_SOL = 0.001; // Minimum fee base
const BASE_FEE_PERCENTAGE = 0.01; // 1% fee
const FEE_RECIPIENT = new PublicKey("Ccjx1HT5x7NLertCeC8pBJFH2PMsNKYU4ayKFGGmGMfS");

// Use the same connection from phantom.ts
const connection = new Connection(
  `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  {
    commitment: "confirmed",
    wsEndpoint: `wss://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false
  }
);

// Helper function to get or create associated token account
export const getOrCreateAssociatedTokenAccount = async (
  walletPubkey: PublicKey,
  recipientPubkey: PublicKey
): Promise<PublicKey> => {
  const associatedTokenAddress = await getAssociatedTokenAddress(
    TOKEN_PUBKEY,
    recipientPubkey
  );

  try {
    // Check if the account exists
    await getAccount(connection, associatedTokenAddress);
    return associatedTokenAddress;
  } catch (error) {
    // If account doesn't exist, we'll create it in the transfer function
    return associatedTokenAddress;
  }
};

export const sendFredTokens = async (
  recipientAddress: string, 
  amount: number,
  tokenPriceUsd: number = 0,
  solPriceUsd: number = 0,
  decimals: number = 9
) => {
  try {
    if (!window.phantom?.solana?.isConnected) {
      throw new Error("Phantom wallet is not connected");
    }

    // Calculate fee based on USD value
    const amountInUsd = amount * tokenPriceUsd;
    const feeAmount = Math.max(
      (amountInUsd / solPriceUsd) * BASE_FEE_PERCENTAGE, // 1% of USD value in SOL
      MIN_FEE_SOL + NETWORK_FEE_ESTIMATE // Minimum fee in SOL
    );
    const feeLamports = feeAmount * LAMPORTS_PER_SOL;

    // Convert token amount to smallest unit
    const tokenAmount = amount * Math.pow(10, decimals);

    // Get the sender's public key
    const fromPubkey = window.phantom.solana.publicKey;
    const toPubkey = new PublicKey(recipientAddress);

    // Get the token accounts
    const sourceTokenAccount = await getAssociatedTokenAddress(
      TOKEN_PUBKEY,
      fromPubkey
    );
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      fromPubkey,
      toPubkey
    );

    // Create instructions array with proper type
    const instructions: TransactionInstruction[] = [];

    // Check if destination token account needs to be created
    try {
      await getAccount(connection, destinationTokenAccount);
    } catch (error) {
      // Add instruction to create destination token account
      instructions.push(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          destinationTokenAccount,
          toPubkey,
          TOKEN_PUBKEY
        )
      );
    }

    // Add token transfer instruction
    instructions.push(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAccount,
        fromPubkey,
        tokenAmount
      )
    );

    // Add SOL fee transfer instruction
    instructions.push(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey: FEE_RECIPIENT,
        lamports: feeLamports
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash({
      commitment: 'confirmed'
    });

    // Create and sign transaction
    const transaction = new SolanaTransaction({
      recentBlockhash: blockhash,
      feePayer: fromPubkey
    }).add(...instructions);

    const signedTransaction = await window.phantom.solana.signTransaction(transaction);
    const rawTransaction = signedTransaction.serialize();

    // Send transaction
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    // Use polling for confirmation
    const TIMEOUT = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < TIMEOUT) {
      const status = await connection.getSignatureStatus(signature);
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        if (status.value.err) {
          throw new Error(`Transaction failed: ${status.value.err}`);
        }
        return signature;
      }
      
      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Transaction confirmation timeout');
  } catch (error: any) {
    console.error("Token transaction error:", error);
    throw new Error(error.message || "Token transaction failed");
  }
}; 