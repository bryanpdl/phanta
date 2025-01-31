"use client";

import { Connection, PublicKey, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { JUPITER_QUOTE_API, WSOL_ADDRESS, TOKEN_ADDRESS } from "./constants";

// Fee Configuration
const FEE_RECIPIENT = new PublicKey("Ccjx1HT5x7NLertCeC8pBJFH2PMsNKYU4ayKFGGmGMfS");
const BASE_FEE_PERCENTAGE = 0.01; // 1% fee
const MIN_FEE_SOL = 0.001; // Minimum fee in SOL
const NETWORK_FEE_ESTIMATE = 0.00015; // ~0.00015 SOL per transaction

// Types
type TokenType = "SOL" | "TOKEN";

interface Route {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  marketInfos: {
    label: string;
    inputMint: string;
    outputMint: string;
    notEnoughLiquidity: boolean;
    lpFee: {
      amount: string;
      mint: string;
      pct: number;
    };
  }[];
  otherAmountThreshold: string;
  swapMode: string;
}

interface QuoteResponse extends Route {}

// Helper Functions
const getInputMint = (fromToken: TokenType): string => {
  return fromToken === "SOL" ? WSOL_ADDRESS : TOKEN_ADDRESS;
};

const getOutputMint = (fromToken: TokenType): string => {
  return fromToken === "SOL" ? TOKEN_ADDRESS : WSOL_ADDRESS;
};

/**
 * Fetches swap routes from Jupiter for the given token pair and amount
 */
export const getSwapRoutes = async (
  fromToken: TokenType,
  amount: number,
  slippageBps: number = 50
): Promise<QuoteResponse | null> => {
  try {
    const inputMint = getInputMint(fromToken);
    const outputMint = getOutputMint(fromToken);
    
    // Convert amount to lamports (SOL) or smallest token unit
    const amountInSmallestUnit = Math.floor(amount * 1e9);

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amountInSmallestUnit.toString(),
      slippageBps: slippageBps.toString(),
      feeBps: "100", // 1% fee
      feeAccount: FEE_RECIPIENT.toString(),
    });

    const response = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch swap routes: ${response.statusText}`);
    }

    const data = await response.json();
    return data as QuoteResponse;
  } catch (error) {
    console.error("Error fetching swap routes:", error);
    return null;
  }
};

/**
 * Calculates the estimated output amount and price impact for a swap
 */
export const getSwapEstimate = (quote: QuoteResponse | null): {
  estimatedAmount: number;
  priceImpact: number;
  bestRoute: string | null;
} => {
  if (!quote) {
    return { estimatedAmount: 0, priceImpact: 0, bestRoute: null };
  }

  return {
    estimatedAmount: parseFloat(quote.outAmount) / 1e9,
    priceImpact: Number(quote.priceImpactPct || 0),
    bestRoute: quote.marketInfos?.[0]?.label || "Jupiter",
  };
};

interface PhantomProvider {
  solana?: {
    isConnected: boolean;
    signTransaction<T extends VersionedTransaction>(transaction: T): Promise<T>;
  };
}

/**
 * Executes a swap transaction using Jupiter's API
 */
export const executeSwap = async (
  walletAddress: string,
  quote: QuoteResponse,
  fromToken: TokenType,
  solPrice: number, // Add SOL price parameter for USD calculations
): Promise<{ signature: string } | null> => {
  try {
    // Calculate our fee based on the input amount
    const inputAmount = parseFloat(quote.inAmount) / 1e9;
    const inputUsdValue = fromToken === "SOL" ? 
      inputAmount * solPrice : 
      inputAmount * (parseFloat(quote.outAmount) / 1e9) * solPrice;

    // Calculate fee (greater of percentage or minimum fee)
    const feeAmount = Math.max(
      (inputUsdValue / solPrice) * BASE_FEE_PERCENTAGE, // 1% of value in SOL
      MIN_FEE_SOL + NETWORK_FEE_ESTIMATE // Minimum fee plus network cost
    );
    const feeLamports = Math.floor(feeAmount * 1e9); // Convert to lamports

    // 1. Create the transaction using Jupiter's API
    const swapRequestBody = {
      quoteResponse: quote,
      userPublicKey: walletAddress,
      wrapUnwrapSOL: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 10000000,
          priorityLevel: "high"
        }
      },
      dynamicSlippage: { maxBps: 1000 },
      // Add fee information for Jupiter
      feeBps: 100, // 1% fee
      feeAccount: FEE_RECIPIENT.toString()
    };

    const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(swapRequestBody)
    });

    if (!swapResponse.ok) {
      throw new Error('Failed to create swap transaction');
    }

    const swapData = await swapResponse.json();
    
    // 2. Check for Phantom wallet
    const phantom = (window as any).phantom as PhantomProvider;
    if (!phantom?.solana?.isConnected) {
      throw new Error('Phantom wallet is not connected');
    }

    // 3. Create a connection instance
    const connection = new Connection(
      `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      'confirmed'
    );

    // 4. Get latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash('finalized');

    // 5. Deserialize the transaction
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapData.swapTransaction, 'base64')
    );

    // 6. Sign the transaction
    const signedTransaction = await phantom.solana.signTransaction(transaction);

    // 7. Send the signed transaction
    const rawTransaction = signedTransaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3,
      preflightCommitment: 'processed'
    });

    // 8. Poll for transaction status instead of using websockets
    const TIMEOUT = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < TIMEOUT) {
      const status = await connection.getSignatureStatus(signature);
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        if (status.value.err) {
          throw new Error(`Transaction failed: ${status.value.err}`);
        }
        return { signature };
      }
      
      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If we get here, we've timed out but the transaction might still be processing
    console.log('Transaction sent but confirmation timed out:', signature);
    return { signature };

  } catch (error: any) {
    console.error('Swap execution error:', error);
    // Check if the error is just a websocket or confirmation issue
    if (error.message?.includes('WebSocket') || error.message?.includes('timeout')) {
      console.log('Transaction may have succeeded. Check your wallet for confirmation.');
      return null;
    }
    throw new Error(error.message || 'Failed to execute swap');
  }
}; 