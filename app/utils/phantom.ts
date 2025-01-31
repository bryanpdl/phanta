import { Connection, PublicKey, Transaction as SolanaTransaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

export interface TransactionInfo {
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

export interface TokenBalance {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  usdValue?: number;
  logoURI?: string;
}

// Add these interfaces after the existing interfaces
export interface DexscreenerToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexscreenerToken;
  quoteToken: DexscreenerToken;
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  info?: {
    imageUrl?: string;
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

const classifyTransaction = (tx: TransactionInfo, senderAddress: string | null): TransactionInfo => {
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

// Create a reliable connection using Alchemy's RPC with proper WebSocket config
const connection = new Connection(
  `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  {
    commitment: "confirmed",
    wsEndpoint: `wss://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false
  }
);

// Fee configuration - single source of truth
const NETWORK_FEE_ESTIMATE = 0.00015; // ~0.00015 SOL per transaction
const MIN_FEE_SOL = 0.001; // Minimum fee base
const BASE_FEE_PERCENTAGE = 0.01; // 1% fee
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

// Add this new function to check if wallet is already connected
export const checkWalletConnection = async (): Promise<string | null> => {
  try {
    const provider = getProvider();
    if (!provider) return null;

    // Check if wallet is already connected
    if (provider.isConnected && provider.publicKey) {
      return provider.publicKey.toString();
    }

    return null;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return null;
  }
};

export const connectWallet = async (): Promise<string | null> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      throw new Error("Please install Phantom Wallet to continue.");
    }

    // Check if already connected first
    if (provider.isConnected && provider.publicKey) {
      return provider.publicKey.toString();
    }

    // Request connection if not already connected
    const resp = await provider.connect();
    
    // Set up disconnect listener
    provider.on("disconnect", () => {
      console.log("Wallet disconnected");
      window.localStorage.removeItem("walletAddress");
      window.dispatchEvent(new Event('walletDisconnected'));
    });

    // Set up account change listener
    provider.on("accountChanged", (publicKey: PublicKey | null) => {
      console.log("Account changed", publicKey?.toString());
      if (publicKey) {
        window.localStorage.setItem("walletAddress", publicKey.toString());
        window.dispatchEvent(new Event('walletChanged'));
      } else {
        window.localStorage.removeItem("walletAddress");
        window.dispatchEvent(new Event('walletDisconnected'));
      }
    });

    const address = resp.publicKey.toString();
    window.localStorage.setItem("walletAddress", address);
    return address;
    
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
    window.localStorage.removeItem("walletAddress");
    window.dispatchEvent(new Event('walletDisconnected'));
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
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch SOL price');
    }

    const data = await response.json();
    
    // Return the price from the first pair if it exists
    if (data.pairs && data.pairs.length > 0) {
      return parseFloat(data.pairs[0].priceUsd);
    }

    throw new Error('No price data available');
  } catch (error) {
    console.error("Failed to fetch SOL price:", error);
    throw error;
  }
};

export const getRecentTransactions = async (address: string): Promise<TransactionInfo[]> => {
  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(address),
        { limit: 5 }
      );

      const transactions: TransactionInfo[] = [];
      
      for (const sig of signatures) {
        try {
          const parsedTx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          });

          // Create base transaction info
          const baseTransaction: TransactionInfo = {
            signature: sig.signature,
            timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
            status: sig.err ? "Failed" : "Success",
            type: "Unknown",
            fee: (parsedTx?.meta?.fee || 0) / LAMPORTS_PER_SOL,
            security: {
              isDust: false,
              isSuspicious: false,
              warning: ""
            }
          };

          // If we can't get transaction data, return the base transaction
          if (!parsedTx?.meta || !parsedTx.transaction) {
            transactions.push(baseTransaction);
            continue;
          }

          // Process transaction details
          const message = parsedTx.transaction.message;
          const accountKeys = message.accountKeys.map(key => key.pubkey.toString());
          const myAccountIndex = accountKeys.indexOf(address);

          if (myAccountIndex === -1) {
            transactions.push(baseTransaction);
            continue;
          }

          // Calculate amount
          let amount: number | undefined;
          const preBalances = parsedTx.meta.preBalances;
          const postBalances = parsedTx.meta.postBalances;
          
          if (preBalances && postBalances) {
            const preBalance = preBalances[myAccountIndex];
            const postBalance = postBalances[myAccountIndex];
            if (typeof preBalance === 'number' && typeof postBalance === 'number') {
              amount = (postBalance - preBalance) / LAMPORTS_PER_SOL;
            }
          }

          // Determine transaction type
          let type = "Unknown";
          const hasTokenBalances = parsedTx.meta.postTokenBalances && 
                                 parsedTx.meta.postTokenBalances.length > 0;
          
          if (hasTokenBalances) {
            type = "TOKEN";
          } else if (amount !== undefined) {
            type = "TRANSFER";
          }

          // Create final transaction info with security classification
          const transaction: TransactionInfo = {
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

export const sendTransaction = async (recipientAddress: string, amount: number) => {
  try {
    if (!window.phantom?.solana?.isConnected) {
      throw new Error("Phantom wallet is not connected");
    }

    // Calculate fee (greater of percentage or minimum fee)
    const feeAmount = Math.max(
      amount * BASE_FEE_PERCENTAGE,
      MIN_FEE_SOL
    );
    const feeLamports = feeAmount * LAMPORTS_PER_SOL;
    const amountLamports = amount * LAMPORTS_PER_SOL;

    // Get the sender's public key
    const fromPubkey = window.phantom.solana.publicKey;
    const toPubkey = new PublicKey(recipientAddress);

    // Create instructions for both transfers
    const transferToRecipient = SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: amountLamports - feeLamports // Subtract fee from main transfer
    });

    const transferFee = SystemProgram.transfer({
      fromPubkey,
      toPubkey: FEE_RECIPIENT,
      lamports: feeLamports
    });

    // Get recent blockhash with retry
    const blockhash = await getBlockhashWithRetry();

    // Create transaction with both instructions
    const transaction = new SolanaTransaction({
      recentBlockhash: blockhash,
      feePayer: fromPubkey
    }).add(transferToRecipient, transferFee);

    // Sign and send transaction
    const signedTransaction = await window.phantom.solana.signTransaction(transaction);
    const rawTransaction = signedTransaction.serialize();
    
    // Send with proper options
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    // Use polling instead of WebSocket for confirmation
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
    console.error("Transaction error:", error);
    throw new Error(error.message || "Transaction failed");
  }
};

export const getTokenBalances = async (): Promise<TokenBalance[]> => {
  const provider = getProvider();
  if (!provider?.publicKey) {
    throw new Error("Wallet not connected.");
  }

  try {
    // Fetch all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      provider.publicKey,
      { programId: TOKEN_PROGRAM_ID },
      'confirmed'
    );

    // Filter accounts with non-zero balance
    const nonZeroAccounts = tokenAccounts.value.filter(
      account => account.account.data.parsed.info.tokenAmount.uiAmount > 0
    );

    // Fetch token metadata from Jupiter API
    const response = await fetch('https://token.jup.ag/all');
    const tokenList = await response.json();
    
    // Map token accounts to TokenBalance interface
    const balances = await Promise.all(
      nonZeroAccounts.map(async (account) => {
        const parsedInfo = account.account.data.parsed.info;
        const mintAddress = parsedInfo.mint;
        const tokenInfo = tokenList.find((t: any) => t.address === mintAddress);
        
        if (!tokenInfo) return null;

        const tokenBalance: TokenBalance = {
          mint: mintAddress,
          symbol: tokenInfo.symbol,
          balance: parsedInfo.tokenAmount.uiAmount,
          decimals: parsedInfo.tokenAmount.decimals,
          logoURI: tokenInfo.logoURI
        };

        return tokenBalance;
      })
    );

    // Filter out null values and sort by balance
    return balances
      .filter((b): b is TokenBalance => b !== null)
      .sort((a, b) => b.balance - a.balance);

  } catch (error) {
    console.error("Failed to fetch token balances:", error);
    throw error;
  }
};

// Add this new function before the getBalance function
export const getTokenPrice = async (chainId: string, tokenAddress: string): Promise<DexscreenerPair | null> => {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token price');
    }

    const data = await response.json();
    
    // Return the first pair if it exists
    if (data.pairs && data.pairs.length > 0) {
      return data.pairs[0];
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch token price:', error);
    return null;
  }
};

// Add this function to get specific token balance
export const getTokenBalance = async (tokenAddress: string): Promise<number | null> => {
  const provider = getProvider();
  if (!provider?.publicKey) {
    throw new Error("Wallet not connected.");
  }

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      provider.publicKey,
      { mint: new PublicKey(tokenAddress) },
      'confirmed'
    );

    // If user has no account for this token, return 0
    if (tokenAccounts.value.length === 0) return 0;

    // Get the token amount from the first account
    const tokenAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
    return tokenAmount.uiAmount || 0;
  } catch (error) {
    console.error("Failed to fetch token balance:", error);
    return null;
  }
};

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