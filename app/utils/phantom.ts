import { Connection, PublicKey, ParsedTransactionWithMeta, SystemProgram, LAMPORTS_PER_SOL, Transaction as SolanaTransaction, clusterApiUrl } from "@solana/web3.js";

interface PhantomProvider {
  isPhantom: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: any) => void) => void;
  removeAllListeners: (event: string) => void;
  request: (method: string, params: any[]) => Promise<any>;
  signAndSendTransaction: (transaction: SolanaTransaction) => Promise<{ signature: string }>;
  publicKey?: PublicKey;
  isConnected?: boolean;
}

export interface Transaction {
  signature: string;
  timestamp: number;
  status: "Success" | "Failed";
  type: string;
  amount?: number;
  fee: number;
  security?: {
    isDust: boolean;
    isSuspicious: boolean;
    warning: string;
  };
}

// Security thresholds and checks
const DUST_THRESHOLD = 0.001; // SOL
const SUSPICIOUS_PATTERNS = [
  "copy-trading",
  "airdrop",
  "claim",
  "bot",
  "prize",
  "winner"
];

const classifyTransaction = (tx: Transaction, senderAddress: string | null): Transaction => {
  const security = {
    isDust: false,
    isSuspicious: false,
    warning: ""
  };

  // Check for dust transactions
  if (tx.amount && tx.amount < DUST_THRESHOLD) {
    // Only mark as dust if it's an incoming transaction (positive amount)
    if (tx.type === "TRANSFER" && tx.amount > 0) {
      security.isDust = true;
      security.warning = `Incoming dust transaction detected (${tx.amount} SOL). This might be spam - do not interact with any links.`;
    }
  }

  // Check for suspicious patterns in memo or associated account names
  if (tx.type.toLowerCase().includes("token")) {
    security.isSuspicious = true;
    security.warning = "Unknown token transaction. Be cautious with unfamiliar tokens.";
  }

  // Add security classification to transaction
  return {
    ...tx,
    security
  };
};

// Create a reliable connection using Alchemy's RPC
const connection = new Connection(
  `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
);

// Fee configuration
const NETWORK_FEE_ESTIMATE = 0.00015; // ~0.00015 SOL per transaction
const MIN_FEE_SOL = 0.001; // Minimum fee base
const BASE_FEE_PERCENTAGE = 0.003; // 0.3% fee
const MIN_TRANSACTION_AMOUNT = 0.0023; // Minimum total transaction amount
const FEE_RECIPIENT = new PublicKey("Ccjx1HT5x7NLertCeC8pBJFH2PMsNKYU4ayKFGGmGMfS");

// Calculate fee with minimum threshold and network costs
const calculateFee = (amount: number): number => {
  if (amount < MIN_TRANSACTION_AMOUNT) {
    throw new Error(`Minimum transaction amount is ${MIN_TRANSACTION_AMOUNT} SOL`);
  }
  
  // Calculate base fee
  const percentageFee = amount * BASE_FEE_PERCENTAGE;
  
  // Ensure fee covers network costs for both transactions plus a small buffer
  const minimumRequired = MIN_FEE_SOL + (NETWORK_FEE_ESTIMATE * 2);
  
  // Return the larger of the percentage fee or minimum required
  return Math.max(percentageFee, minimumRequired);
};

export const getProvider = (): PhantomProvider | undefined => {
  if (typeof window === "undefined") return undefined;
  
  if ("solana" in window) {
    const provider = (window as any).solana as PhantomProvider;
    if (provider.isPhantom) {
      return provider;
    }
  }
  return undefined;
};

export const connectWallet = async (): Promise<string | null> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      throw new Error("Please install Phantom Wallet to continue.");
    }

    // Request connection - this will throw an error if wallet is locked
    const resp = await provider.connect();
    
    // Set up disconnect listener
    provider.on("disconnect", () => {
      console.log("Wallet disconnected");
      window.location.reload(); // Force refresh when wallet is disconnected
    });

    // Set up account change listener
    provider.on("accountChanged", () => {
      console.log("Account changed");
      window.location.reload(); // Force refresh when account changes
    });

    return resp.publicKey.toString();
    
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Please accept the connection request in your Phantom wallet.");
    }
    if (error.code === -32603) {
      throw new Error("Please unlock your Phantom wallet to continue.");
    }
    console.error("Failed to connect to Phantom Wallet:", error);
    throw error;
  }
};

export const disconnectWallet = async (): Promise<void> => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Phantom Wallet is not installed.");
  }

  try {
    provider.removeAllListeners("disconnect");
    provider.removeAllListeners("accountChanged");
    await provider.disconnect();
  } catch (error) {
    console.error("Failed to disconnect from Phantom Wallet:", error);
    throw error;
  }
};

export const getBalance = async (): Promise<number> => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Phantom Wallet is not installed.");
  }

  if (!provider.publicKey) {
    throw new Error("Wallet not connected.");
  }

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add commitment level and proper error handling
      const balance = await connection.getBalance(
        provider.publicKey,
        'confirmed'
      );

      // Validate the response
      if (typeof balance !== 'number') {
        throw new Error('Invalid balance response type');
      }

      return balance / LAMPORTS_PER_SOL;
    } catch (error: any) {
      console.warn(`Balance fetch attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      // If this isn't our last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to fetch balance after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
};

export const getSolanaPrice = async (): Promise<number> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("Failed to fetch Solana price:", error);
    throw error;
  }
};

export const getRecentTransactions = async (address: string): Promise<Transaction[]> => {
  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Fetch recent signatures with retry mechanism
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(address),
        { limit: 5 }
      );

      // Process transactions sequentially to avoid rate limits
      const transactions: Transaction[] = [];
      
      for (const sig of signatures) {
        try {
          const tx = safelyParseResponse<ParsedTransactionWithMeta | null>(
            await connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            }),
            null
          );

          // Create base transaction object
          const baseTransaction: Transaction = {
            signature: sig.signature,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: sig.err ? "Failed" : "Success",
            type: "Unknown",
            fee: (tx?.meta?.fee || 0) / LAMPORTS_PER_SOL,
            security: {
              isDust: false,
              isSuspicious: false,
              warning: ""
            }
          };

          // If we can't get transaction data, return the base transaction
          if (!tx?.meta || !tx.transaction?.message) {
            transactions.push(baseTransaction);
            continue;
          }

          // Process transaction details
          const message = tx.transaction.message;
          const accountKeys = message.accountKeys;
          const myAccountIndex = accountKeys.findIndex(
            key => key.pubkey.toString() === address
          );

          if (myAccountIndex === -1) {
            transactions.push(baseTransaction);
            continue;
          }

          // Calculate amount
          let amount: number | undefined;
          if (tx.meta.preBalances && tx.meta.postBalances) {
            const preBalance = tx.meta.preBalances[myAccountIndex];
            const postBalance = tx.meta.postBalances[myAccountIndex];
            if (typeof preBalance === 'number' && typeof postBalance === 'number') {
              amount = (postBalance - preBalance) / LAMPORTS_PER_SOL;
            }
          }

          // Determine transaction type
          let type = "Unknown";
          const hasTokenBalances = tx.meta.postTokenBalances && tx.meta.postTokenBalances.length > 0;
          if (hasTokenBalances) {
            type = "TOKEN";
          } else if (amount !== undefined) {
            type = "TRANSFER";
          }

          // Create final transaction object with security info
          const transaction: Transaction = {
            ...baseTransaction,
            type,
            amount,
            security: {
              isDust: amount !== undefined && Math.abs(amount) < DUST_THRESHOLD && amount > 0,
              isSuspicious: type === "TOKEN",
              warning: type === "TOKEN" 
                ? "Unknown token transaction. Be cautious with unfamiliar tokens."
                : amount !== undefined && Math.abs(amount) < DUST_THRESHOLD && amount > 0
                  ? `Incoming dust transaction detected (${amount.toFixed(9)} SOL). This might be spam - do not interact with any links.`
                  : ""
            }
          };

          transactions.push(transaction);
          
          // Add a small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (txError) {
          console.warn(`Failed to fetch transaction ${sig.signature}:`, txError);
          transactions.push({
            signature: sig.signature,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: "Failed",
            type: "Unknown",
            fee: 0,
            security: {
              isDust: false,
              isSuspicious: false,
              warning: ""
            }
          });
        }
      }

      return transactions;
      
    } catch (error: any) {
      console.warn(`Transaction fetch attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to fetch transactions after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
};

// Helper function to safely parse RPC response
const safelyParseResponse = <T>(response: any, defaultValue: T): T => {
  try {
    if (response === null || response === undefined) return defaultValue;
    if (typeof response === 'object' && 'value' in response) return response.value;
    return response as T;
  } catch {
    return defaultValue;
  }
};

// Helper function to get balance with retries
const getBalanceWithRetry = async (publicKey: PublicKey): Promise<number> => {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await connection.getBalance(publicKey, 'confirmed');
      return safelyParseResponse<number>(response, 0);
    } catch (error) {
      console.warn(`Balance fetch attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error during balance fetch');
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw new Error(`Failed to get balance after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
};

// Helper function to get blockhash with retries
const getBlockhashWithRetry = async (): Promise<string> => {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { blockhash } = await connection.getLatestBlockhash({
        commitment: 'confirmed'
      });
      return blockhash;
    } catch (error) {
      console.warn(`Blockhash fetch attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error during blockhash fetch');
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw new Error(`Failed to get blockhash after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
};

export const sendTransaction = async (recipientAddress: string, amount: number): Promise<string> => {
  try {
    const provider = getProvider();
    if (!provider) {
      throw new Error("Phantom Wallet is not installed.");
    }

    if (!provider.publicKey) {
      throw new Error("Wallet not connected.");
    }

    // Validate recipient address
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(recipientAddress);
    } catch (error) {
      throw new Error("Invalid recipient address");
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Calculate fee and amounts
    const feeAmount = calculateFee(amount);
    const recipientAmount = amount - feeAmount;
    const recipientLamports = Math.floor(recipientAmount * LAMPORTS_PER_SOL);
    const feeLamports = Math.floor(feeAmount * LAMPORTS_PER_SOL);

    // Check balance with retry
    const balance = await getBalanceWithRetry(provider.publicKey);
    const totalLamports = recipientLamports + feeLamports;
    if (balance < totalLamports) {
      throw new Error("Insufficient balance (including service fee)");
    }

    // Get blockhash with retry for main transaction
    const blockhash = await getBlockhashWithRetry();

    // Create and send main transfer transaction
    const mainTransaction = new SolanaTransaction();
    mainTransaction.add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: recipient,
        lamports: recipientLamports,
      })
    );
    mainTransaction.recentBlockhash = blockhash;
    mainTransaction.feePayer = provider.publicKey;

    console.log("Sending main transaction...");
    const { signature: mainSignature } = await provider.signAndSendTransaction(mainTransaction);
    console.log("Main transaction sent:", mainSignature);

    // Wait for main transaction confirmation
    const mainStatus = await waitForConfirmation(mainSignature);
    if (!mainStatus) {
      throw new Error("Main transaction failed to confirm");
    }

    // Get fresh blockhash with retry for fee transaction
    const feeBlockhash = await getBlockhashWithRetry();

    // Create and send fee transfer transaction
    const feeTransaction = new SolanaTransaction();
    feeTransaction.add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: FEE_RECIPIENT,
        lamports: feeLamports,
      })
    );
    
    feeTransaction.recentBlockhash = feeBlockhash;
    feeTransaction.feePayer = provider.publicKey;

    console.log("Sending fee transaction...");
    const { signature: feeSignature } = await provider.signAndSendTransaction(feeTransaction);
    console.log("Fee transaction sent:", feeSignature);

    // Wait for fee transaction confirmation
    const feeStatus = await waitForConfirmation(feeSignature);
    if (!feeStatus) {
      console.warn("Fee transaction failed to confirm");
      // We don't throw here as the main transaction was successful
    }

    return mainSignature;

  } catch (error: any) {
    console.error("Transaction failed:", error);
    if (error?.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected by user");
    }
    throw new Error(error.message || "Failed to send transaction");
  }
};

// Helper function to wait for transaction confirmation
const waitForConfirmation = async (signature: string): Promise<boolean> => {
  let retries = 30;
  while (retries > 0) {
    try {
      const status = await connection.getSignatureStatus(signature);
      
      if (status?.value?.err) {
        console.error(`Transaction ${signature} failed:`, status.value.err);
        return false;
      }
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        console.log("Transaction confirmed:", signature);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    } catch (error) {
      console.warn(`Error checking status for ${signature}:`, error);
      if (retries === 0) return false;
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }
  }
  return false;
};