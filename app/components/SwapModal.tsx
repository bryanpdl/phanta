"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { HiX, HiArrowDown, HiInformationCircle } from "react-icons/hi";
import { DexscreenerPair } from "../utils/phantom";
import { getSwapRoutes, getSwapEstimate } from "../utils/phantomSwap";
import { toast } from "react-hot-toast";
import { executeSwap } from "../utils/phantomSwap";
import { HiArrowsUpDown } from "react-icons/hi2";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  solBalance: number;
  solPrice: number;
  tokenInfo: DexscreenerPair;
  tokenBalance: number;
}

// Tooltip component
const Tooltip = ({ content }: { content: string }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-accent rounded-lg text-xs text-white/90 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/5">
    {content}
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45 border-r border-b border-white/5" />
  </div>
);

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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm p-4">
      <div className="container-neumorphic rounded-2xl p-6 w-full max-w-[420px] relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white/90">Swap Tokens</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/90 transition-colors p-1 hover:bg-white/5 rounded-lg"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Combined Token Container */}
        <div className="bg-accent/50 rounded-xl border border-white/5 relative mb-6">
          {/* From Token */}
          <div className="p-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm font-medium">From</p>
              <p className="text-white/60 text-sm">
                Balance: <span className="font-medium">{fromToken === "SOL" ? solBalance.toLocaleString() : tokenBalance.toLocaleString()} {getTokenSymbol(fromToken)}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8">
                  <Image
                    src={getTokenImage(fromToken)}
                    alt={getTokenSymbol(fromToken)}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <p className="text-lg font-semibold text-white">{getTokenSymbol(fromToken)}</p>
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-transparent text-white text-right text-xl font-semibold focus:outline-none placeholder-white/20 ${
                    hasInsufficientBalance ? 'text-red-400' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-white/40 text-sm">
                ≈ ${((parseFloat(amount) || 0) * getTokenPrice(fromToken)).toFixed(2)} USD
              </p>
              <button
                onClick={handleSetMaxAmount}
                className="text-primary text-sm font-medium hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Divider and Swap Button */}
          <div className="relative py-4">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-white/5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                onClick={handleSwapTokens}
                className="bg-background p-2.5 rounded-lg transition-all hover:brightness-110 shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-4px_0_var(--container-shadow)] hover:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-6px_0_var(--container-shadow)] active:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-1px_0_var(--container-shadow)] active:translate-y-[3px] border border-white/5"
              >
                <HiArrowsUpDown className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* To Token */}
          <div className="p-4 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm font-medium">To (Estimated)</p>
              <p className="text-white/60 text-sm">
                Balance: <span className="font-medium">{fromToken === "TOKEN" ? solBalance.toLocaleString() : tokenBalance.toLocaleString()} {getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8">
                  <Image
                    src={getTokenImage(fromToken === "SOL" ? "TOKEN" : "SOL")}
                    alt={getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <p className="text-lg font-semibold text-white">
                  {getTokenSymbol(fromToken === "SOL" ? "TOKEN" : "SOL")}
                </p>
              </div>
              <div className="flex-1 flex flex-col items-end gap-1">
                <p className="text-xl font-semibold text-white">
                  {isLoadingRoute ? "Calculating..." : estimatedAmount.toLocaleString()}
                </p>
                <p className="text-white/40 text-sm">
                  ≈ ${(estimatedAmount * getTokenPrice(fromToken === "SOL" ? "TOKEN" : "SOL")).toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>
        </div>

        {hasInsufficientBalance && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            <p className="text-red-400 text-sm">
              {fromToken === "TOKEN" && solBalance < 0.00115
                ? "Insufficient SOL for network fee"
                : `Insufficient ${getTokenSymbol(fromToken)} balance`}
            </p>
          </div>
        )}

        {/* Transaction Details */}
        <div className="space-y-3 mb-6 bg-accent/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="font-medium">Price Impact</span>
              <div className="group relative">
                <HiInformationCircle className="w-4 h-4" />
                <Tooltip content="The difference between the expected price and the actual price due to market depth and volatility" />
              </div>
            </div>
            <p className="text-white/90 font-medium">
              {isLoadingRoute ? "Calculating..." : `${priceImpact.toFixed(2)}%`}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="font-medium">Route</span>
              <div className="group relative">
                <HiInformationCircle className="w-4 h-4" />
                <Tooltip content="The liquidity source and path used to execute your swap for the best price" />
              </div>
            </div>
            <p className="text-white/90 font-medium">{bestRoute || "Jupiter"}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="font-medium">Service Fee</span>
              <div className="group relative">
                <HiInformationCircle className="w-4 h-4" />
                <Tooltip content="1% of transaction value plus network fees" />
              </div>
            </div>
            <p className="text-white/90 font-medium">
              {`${Math.max(
                (parseFloat(amount || "0") * (solPrice || 0) / (solPrice || 1)) * 0.01,
                0.001 + 0.0003
              ).toFixed(6)} SOL`}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <span className="font-medium">Fee Structure</span>
              <div className="group relative">
                <HiInformationCircle className="w-4 h-4" />
                <Tooltip content="1% of transaction value or minimum fee of 0.00115 SOL (whichever is greater)" />
              </div>
            </div>
            <p className="text-white/60 text-sm">
              1% fee • Min ${((0.00115 * (solPrice || 0))).toFixed(3)}
            </p>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || isLoadingRoute || hasInsufficientBalance}
          className="w-full btn-primary text-white/90 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-base"
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