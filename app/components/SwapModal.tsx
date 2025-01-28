"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { HiX, HiArrowDown, HiInformationCircle } from "react-icons/hi";
import { DexscreenerPair } from "../utils/phantom";
import { getSwapRoutes, getSwapEstimate } from "../utils/phantomSwap";
import { toast } from "react-hot-toast";
import { executeSwap } from "../utils/phantomSwap";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  solBalance: number;
  solPrice: number;
  tokenInfo: DexscreenerPair;
  tokenBalance: number;
}

const SwapModal = ({ isOpen, onClose, walletAddress, solBalance, solPrice, tokenInfo, tokenBalance }: SwapModalProps) => {
  const [fromToken, setFromToken] = useState<"SOL" | "TOKEN">("SOL");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [bestRoute, setBestRoute] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  // Check balance when amount changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setHasInsufficientBalance(false);
      return;
    }

    const parsedAmount = parseFloat(amount);
    const currentBalance = fromToken === "SOL" ? solBalance : tokenBalance;
    
    // For token swaps, also check if there's enough SOL for fees
    if (fromToken === "TOKEN") {
      const estimatedFee = 0.00115; // Minimum network fee in SOL
      setHasInsufficientBalance(
        parsedAmount > currentBalance || solBalance < estimatedFee
      );
    } else {
      // For SOL swaps, account for the amount plus estimated fee
      const totalNeeded = parsedAmount + 0.00115;
      setHasInsufficientBalance(totalNeeded > currentBalance);
    }
  }, [amount, fromToken, solBalance, tokenBalance]);

  // Fetch routes when amount changes
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setEstimatedAmount(0);
        setPriceImpact(0);
        setBestRoute(null);
        return;
      }

      setIsLoadingRoute(true);
      try {
        const quote = await getSwapRoutes(fromToken, parseFloat(amount));
        if (!quote || !quote.outAmount) {
          toast.error("No routes found for this swap");
          setEstimatedAmount(0);
          setPriceImpact(0);
          setBestRoute(null);
          return;
        }

        // Calculate estimated amount based on USD values
        const inputUsdValue = parseFloat(amount) * getTokenPrice(fromToken);
        const outputTokenPrice = getTokenPrice(fromToken === "SOL" ? "TOKEN" : "SOL");
        const calculatedEstimatedAmount = inputUsdValue / outputTokenPrice;

        // Calculate actual output from Jupiter quote
        const actualOutput = parseFloat(quote.outAmount) / 1e9;
        
        // Calculate price impact: ((expected - actual) / expected) * 100
        const calculatedPriceImpact = ((calculatedEstimatedAmount - actualOutput) / calculatedEstimatedAmount) * 100;

        setEstimatedAmount(calculatedEstimatedAmount);
        setPriceImpact(Math.max(0, calculatedPriceImpact)); // Ensure non-negative
        setBestRoute(quote.marketInfos?.[0]?.label || "Jupiter");
      } catch (error) {
        console.error("Error fetching routes:", error);
        toast.error("Failed to fetch swap routes");
        setEstimatedAmount(0);
        setPriceImpact(0);
        setBestRoute(null);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoutes();
  }, [amount, fromToken]);

  if (!isOpen) return null;

  const handleSwapTokens = () => {
    setFromToken(fromToken === "SOL" ? "TOKEN" : "SOL");
    setAmount("");
  };

  const getMaxAmount = () => {
    return fromToken === "SOL" ? solBalance : tokenBalance;
  };

  const handleSetMaxAmount = () => {
    setAmount(getMaxAmount().toString());
  };

  const handleSwap = async () => {
    if (!amount || isLoading || isLoadingRoute) return;

    setIsLoading(true);
    try {
      const quote = await getSwapRoutes(fromToken, parseFloat(amount));
      if (!quote) {
        throw new Error('No valid route found for swap');
      }

      const result = await executeSwap(walletAddress, quote, fromToken, solPrice);
      if (!result?.signature) {
        throw new Error('Swap failed');
      }

      toast.success('Swap executed successfully!');
      onClose();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error(error.message || 'Failed to execute swap');
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenImage = (token: "SOL" | "TOKEN") => {
    if (token === "SOL") return "/solana-logo.svg";
    return tokenInfo.info?.imageUrl || "/placeholder-token.png";
  };

  const getTokenPrice = (token: "SOL" | "TOKEN") => {
    return token === "SOL" ? solPrice : parseFloat(tokenInfo.priceUsd);
  };

  const getTokenSymbol = (token: "SOL" | "TOKEN") => {
    return token === "SOL" ? "SOL" : tokenInfo.baseToken?.symbol || "TOKEN";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="container-neumorphic rounded-2xl p-6 w-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white/90">Swap Tokens</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/90 transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* From Token */}
        <div className="bg-accent rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/60 text-sm">From</p>
            <p className="text-white/60 text-sm">
              Balance: {fromToken === "SOL" ? solBalance.toLocaleString() : tokenBalance.toLocaleString()} {getTokenSymbol(fromToken)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src={getTokenImage(fromToken)}
                alt={getTokenSymbol(fromToken)}
                width={24}
                height={24}
                className="rounded-full"
              />
              <p className="text-lg font-medium text-white">{getTokenSymbol(fromToken)}</p>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-transparent text-white text-right text-lg font-medium focus:outline-none ${
                  hasInsufficientBalance ? 'text-red-500' : ''
                }`}
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-white/60 text-sm">
              ≈ ${((parseFloat(amount) || 0) * getTokenPrice(fromToken)).toFixed(2)} USD
            </p>
            <button
              onClick={handleSetMaxAmount}
              className="text-primary text-sm hover:text-primary/80 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center mb-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="bg-background p-2 rounded-lg transition-all hover:brightness-110 shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-4px_0_var(--container-shadow)] hover:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-6px_0_var(--container-shadow)] active:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-1px_0_var(--container-shadow)] active:translate-y-[3px]"
          >
            <HiArrowDown className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* To Token */}
        <div className="bg-accent rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/60 text-sm">To (Estimated)</p>
            <p className="text-white/60 text-sm">
              Balance: {fromToken === "TOKEN" ? solBalance.toLocaleString() : tokenBalance.toLocaleString()} {getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src={getTokenImage(fromToken === "SOL" ? "TOKEN" : "SOL")}
                alt={getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}
                width={24}
                height={24}
                className="rounded-full"
              />
              <p className="text-lg font-medium text-white">
                {getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-lg font-medium text-white">
                {isLoadingRoute ? "Calculating..." : estimatedAmount.toLocaleString()}
              </p>
              <p className="text-white/60 text-sm">
                ≈ ${(estimatedAmount * getTokenPrice(fromToken === "SOL" ? "TOKEN" : "SOL")).toFixed(2)} USD
              </p>
            </div>
          </div>
        </div>

        {hasInsufficientBalance && (
          <p className="text-red-500 text-xs mb-2">
            {fromToken === "TOKEN" && solBalance < 0.00115
              ? "Insufficient SOL for network fee"
              : `Insufficient ${getTokenSymbol(fromToken)} balance`}
          </p>
        )}

        {/* Transaction Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-white/60">
              <span>Price Impact</span>
              <HiInformationCircle className="w-4 h-4" />
            </div>
            <p className="text-white/90">
              {isLoadingRoute ? "Calculating..." : `${priceImpact.toFixed(2)}%`}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-white/60">
              <span>Route</span>
              <HiInformationCircle className="w-4 h-4" />
            </div>
            <p className="text-white/90">{bestRoute || "Jupiter"}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-white/60">
              <span>Fees & Slippage</span>
              <HiInformationCircle className="w-4 h-4" />
            </div>
            <p className="text-white/60 text-xs">
              0.3% fee • Max 3% slippage
            </p>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || isLoadingRoute || hasInsufficientBalance}
          className="w-full btn-primary text-white/90 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/90 rounded-full animate-spin" />
              Swapping...
            </>
          ) : (
            "Swap"
          )}
        </button>
      </div>
    </div>
  );
};

export default SwapModal; 