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

interface Transaction {
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

  try {
    const balance = await connection.getBalance(provider.publicKey);
    return balance / LAMPORTS_PER_SOL; // Use LAMPORTS_PER_SOL consistently
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    throw error;
  }
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
  try {
    // Fetch recent signatures
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: 5 }
    );

    // Fetch full transaction details
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          }).catch(() => null);
          
          // If transaction fetch fails, return a basic transaction object
          if (!tx || !tx.transaction?.message) {
            return {
              signature: sig.signature,
              timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
              status: sig.err ? "Failed" : "Success",
              type: "Unknown",
              fee: 0,
              security: {
                isDust: false,
                isSuspicious: false,
                warning: ""
              }
            } as Transaction;
          }

          let type = "Unknown";
          let amount: number | undefined;
          
          // Determine transaction type and amount
          if (tx.meta?.postTokenBalances?.length) {
            type = "TOKEN";
          } else if (tx.meta?.postBalances && tx.meta?.preBalances && tx.transaction.message.accountKeys) {
            type = "TRANSFER";
            // For transfers, we need to determine if we're the sender or receiver
            const accountIndex = tx.transaction.message.accountKeys.findIndex(
              key => key.pubkey.toString() === address
            );
            if (accountIndex !== undefined && accountIndex >= 0) {
              const preBalance = tx.meta.preBalances[accountIndex];
              const postBalance = tx.meta.postBalances[accountIndex];
              const change = (postBalance - preBalance) / LAMPORTS_PER_SOL;
              amount = change; // Keep the sign to indicate direction
            }
          }

          const transaction: Transaction = {
            signature: sig.signature,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: sig.err ? "Failed" : "Success",
            type,
            amount,
            fee: (tx.meta?.fee || 0) / LAMPORTS_PER_SOL,
            security: {
              isDust: false,
              isSuspicious: false,
              warning: ""
            }
          };

          // Classify the transaction
          if (amount !== undefined) {
            if (Math.abs(amount) < DUST_THRESHOLD && amount > 0) {
              transaction.security = {
                isDust: true,
                isSuspicious: false,
                warning: `Incoming dust transaction detected (${amount.toFixed(9)} SOL). This might be spam - do not interact with any links.`
              };
            }
          }

          if (type === "TOKEN") {
            transaction.security = {
              isDust: false,
              isSuspicious: true,
              warning: "Unknown token transaction. Be cautious with unfamiliar tokens."
            };
          }

          return transaction;
        } catch (error) {
          console.error(`Failed to fetch transaction ${sig.signature}:`, error);
          return {
            signature: sig.signature,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: "Failed" as const,
            type: "Unknown",
            fee: 0,
            security: {
              isDust: false,
              isSuspicious: false,
              warning: ""
            }
          };
        }
      })
    );

    return transactions;
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    throw error;
  }
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

    // Check if user has enough balance
    const balance = await connection.getBalance(provider.publicKey);
    const lamports = amount * LAMPORTS_PER_SOL;
    if (balance < lamports) {
      throw new Error("Insufficient balance");
    }

    // Create transaction
    const transaction = new SolanaTransaction();
    
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    // Sign and send transaction
    console.log("Sending transaction...");
    const { signature } = await provider.signAndSendTransaction(transaction);
    console.log("Transaction sent:", signature);

    // Simple confirmation check
    let retries = 30;
    while (retries > 0) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status?.value?.err) {
          throw new Error(`Transaction failed: ${status.value.err}`);
        }
        
        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          console.log("Transaction confirmed:", signature);
          return signature;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }

    // If we get here but haven't thrown an error, the transaction might still be processing
    console.log("Transaction may still be processing. Please check the signature:", signature);
    return signature;

  } catch (error: any) {
    console.error("Transaction failed:", error);
    if (error?.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected by user");
    }
    throw new Error(error.message || "Failed to send transaction");
  }
};