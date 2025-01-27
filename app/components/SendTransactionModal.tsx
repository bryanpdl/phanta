"use client";

import { useState, useEffect } from "react";
import { HiX, HiArrowRight, HiSwitchHorizontal } from "react-icons/hi";
import { toast } from "react-hot-toast";
import { sendTransaction, getBalance } from "../utils/phantom";
import { sendFredTokens } from "../utils/phantomFred";
import Image from "next/image";

interface SendTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderAddress: string;
  tokenInfo?: {
    symbol: string;
    balance: number | null;
    imageUrl?: string;
    priceUsd?: string;
  };
  solPrice?: number;
}

const SendTransactionModal = ({ isOpen, onClose, senderAddress, tokenInfo, solPrice }: SendTransactionModalProps) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);
  const [isSendingToken, setIsSendingToken] = useState(false);

  // Fetch initial balance
  useEffect(() => {
    if (isOpen) {
      const fetchBalance = async () => {
        try {
          const balance = await getBalance();
          setCurrentBalance(balance);
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      };
      fetchBalance();
    }
  }, [isOpen]);

  // Check balance when amount changes
  useEffect(() => {
    if (!amount) {
      setHasInsufficientBalance(false);
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      setHasInsufficientBalance(false);
      return;
    }

    if (isSendingToken && tokenInfo) {
      // First check if we have enough tokens
      if (tokenInfo.balance !== null && parsedAmount > tokenInfo.balance) {
        setHasInsufficientBalance(true);
        return;
      }

      // Then calculate and check if we have enough SOL for the fee
      const tokenPriceUsd = parseFloat(tokenInfo.priceUsd || "0");
      const amountInUsd = parsedAmount * tokenPriceUsd;
      const solPriceUsd = solPrice || 0;
      
      // Calculate fee in SOL based on USD value
      const serviceFeeInSol = Math.max(
        (amountInUsd / solPriceUsd) * 0.003, // 0.3% of USD value in SOL
        0.001 + 0.0003 // Minimum fee in SOL
      );

      setHasInsufficientBalance(currentBalance !== null && serviceFeeInSol > currentBalance);
    } else {
      // For SOL transfers, check total amount needed including fee
      const serviceFee = Math.max(parsedAmount * 0.003, 0.001 + 0.0003);
      const totalNeeded = parsedAmount + serviceFee;
      setHasInsufficientBalance(currentBalance !== null && totalNeeded > currentBalance);
    }
  }, [amount, currentBalance, isSendingToken, tokenInfo, solPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      if (isSendingToken && tokenInfo) {
        const tokenPriceUsd = parseFloat(tokenInfo.priceUsd || "0");
        await sendFredTokens(
          recipient, 
          parsedAmount,
          tokenPriceUsd,
          solPrice || 0
        );
        toast.success(`${tokenInfo.symbol} sent successfully!`);
      } else {
        await sendTransaction(recipient, parsedAmount);
        toast.success("SOL sent successfully!");
      }
      
      onClose();
      setRecipient("");
      setAmount("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send transaction");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="container-neumorphic rounded-2xl p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white/90 transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white/90 mb-4">Send Transaction</h2>

        {/* Token Selection */}
        {tokenInfo && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSendingToken(false)}
              className={`flex-1 flex font-medium items-center justify-center gap-2 p-3 rounded-lg transition-all ${
                !isSendingToken 
                  ? 'bg-secondary shadow-[inset_0_1px_1px_var(--secondary-shadow-top),_inset_0_-4px_0_var(--secondary-shadow)]' 
                  : 'bg-accent/30 opacity-60 hover:opacity-80'
              }`}
            >
              <Image
                src="/solana-logo.svg"
                alt="SOL"
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="text-white/90">SOL</span>
              {currentBalance !== null && (
                <span className="text-white/60 text-sm ml-1">
                  ({currentBalance.toLocaleString()})
                </span>
              )}
            </button>
            <button
              onClick={() => setIsSendingToken(true)}
              className={`flex-1 flex font-medium items-center justify-center gap-2 p-3 rounded-lg transition-all ${
                isSendingToken 
                  ? 'bg-secondary shadow-[inset_0_1px_1px_var(--secondary-shadow-top),_inset_0_-4px_0_var(--secondary-shadow)]' 
                  : 'bg-accent/30 opacity-60 hover:opacity-80'
              }`}
            >
              {tokenInfo.imageUrl && (
                <Image
                  src={tokenInfo.imageUrl}
                  alt={tokenInfo.symbol}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span className="text-white/90">{tokenInfo.symbol}</span>
              {tokenInfo.balance !== null && (
                <span className="text-white/60 text-sm ml-1">
                  ({tokenInfo.balance.toLocaleString()})
                </span>
              )}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1">From</label>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-white/90 font-mono text-sm break-all">{senderAddress}</p>
            </div>
          </div>

          <div>
            <label htmlFor="recipient" className="block text-white/60 text-sm mb-1">
              Recipient Address
            </label>
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-accent rounded-lg p-3 text-white/90 font-mono text-sm border border-transparent focus:border-primary/50 focus:outline-none transition-colors"
              placeholder="Enter Solana address"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-white/60 text-sm mb-1">
              Amount ({isSendingToken ? tokenInfo?.symbol || 'Token' : 'SOL'})
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-accent rounded-lg p-3 text-white/90 font-mono text-sm border border-transparent focus:border-primary/50 focus:outline-none transition-colors ${
                  hasInsufficientBalance ? 'border-red-500' : ''
                }`}
                placeholder="0.0"
                min="0.0023"
                required
              />
              {hasInsufficientBalance && (
                <p className="absolute -bottom-6 left-0 text-red-500 text-xs">
                  {isSendingToken && tokenInfo
                    ? (tokenInfo.balance !== null && parseFloat(amount) > tokenInfo.balance)
                      ? `Insufficient ${tokenInfo.symbol} balance`
                      : "Insufficient SOL balance for service fee"
                    : "Insufficient balance (including service fee)"}
                </p>
              )}
            </div>
            {amount && (
              <div className={`space-y-1 ${hasInsufficientBalance ? 'mt-8' : 'mt-4'}`}>
                <p className="text-white/60 text-xs">
                  {isSendingToken && tokenInfo ? (
                    <>
                      Service fee: {Math.max(
                        (parseFloat(amount) * parseFloat(tokenInfo.priceUsd || "0") / (solPrice || 1)) * 0.003,
                        0.001 + 0.0003
                      ).toFixed(6)} SOL
                      {(parseFloat(amount) * parseFloat(tokenInfo.priceUsd || "0") / (solPrice || 1)) * 0.003 < (0.001 + 0.0003) && " (minimum fee)"}
                    </>
                  ) : (
                    <>
                      Service fee: {Math.max(parseFloat(amount) * 0.003, 0.001 + 0.0003).toFixed(6)} SOL
                      {parseFloat(amount) * 0.003 < (0.001 + 0.0003) && " (minimum fee)"}
                    </>
                  )}
                </p>
                <p className="text-white/40 text-xs">
                  Minimum transaction amount: 0.0023 SOL
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || hasInsufficientBalance}
            className="w-full btn-primary text-white/90 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              "Sending..."
            ) : (
              <>
                Send {isSendingToken ? tokenInfo?.symbol || 'Token' : 'SOL'}
                <HiArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendTransactionModal; 