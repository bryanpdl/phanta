"use client";

import { useState, useEffect } from "react";
import { HiX, HiArrowRight, HiSwitchHorizontal, HiInformationCircle } from "react-icons/hi";
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

// Tooltip component
const Tooltip = ({ content }: { content: string }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-accent rounded-lg text-xs text-white/90 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/5">
    {content}
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45 border-r border-b border-white/5" />
  </div>
);

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
      <div className="container-neumorphic rounded-2xl p-6 max-w-[420px] w-full relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/60 hover:text-white/90 transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white/90 mb-8">Send {isSendingToken ? tokenInfo?.symbol : 'SOL'}</h2>

        {/* Token Selection */}
        {tokenInfo && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSendingToken(false)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                !isSendingToken 
                  ? 'bg-background shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-4px_0_var(--container-shadow)] hover:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-6px_0_var(--container-shadow)] active:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-1px_0_var(--container-shadow)]' 
                  : 'bg-accent/30 opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/solana-logo.svg"
                  alt="SOL"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-white/90 font-medium">SOL</span>
              </div>
              {currentBalance !== null && (
                <span className="text-white/60 text-sm">
                  {currentBalance.toLocaleString()}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsSendingToken(true)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                isSendingToken 
                  ? 'bg-background shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-4px_0_var(--container-shadow)] hover:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-6px_0_var(--container-shadow)] active:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-1px_0_var(--container-shadow)]' 
                  : 'bg-accent/30 opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                {tokenInfo.imageUrl && (
                  <Image
                    src={tokenInfo.imageUrl}
                    alt={tokenInfo.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="text-white/90 font-medium">{tokenInfo.symbol}</span>
              </div>
              {tokenInfo.balance !== null && (
                <span className="text-white/60 text-sm">
                  {tokenInfo.balance.toLocaleString()}
                </span>
              )}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/60 text-sm font-medium mb-2">From</label>
            <div className="bg-accent/50 rounded-xl p-4 border border-white/5">
              <p className="text-white/90 font-mono text-sm break-all">{senderAddress}</p>
            </div>
          </div>

          <div>
            <label htmlFor="recipient" className="block text-white/60 text-sm font-medium mb-2">
              Recipient Address
            </label>
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-foreground rounded-xl p-4 text-white/90 font-mono text-sm border border-white/5 focus:border-primary/50 focus:outline-none transition-colors"
              placeholder="Enter Solana address"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-white/60 text-sm font-medium mb-2">
              Amount ({isSendingToken ? tokenInfo?.symbol || 'Token' : 'SOL'})
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-foreground rounded-xl p-4 text-white/90 font-mono text-lg border border-white/5 focus:border-primary/50 focus:outline-none transition-colors ${
                  hasInsufficientBalance ? 'border-red-500/50' : ''
                }`}
                placeholder="0.0"
                min="0.0023"
                required
              />
              {hasInsufficientBalance && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-sm">
                    {isSendingToken && tokenInfo
                      ? (tokenInfo.balance !== null && parseFloat(amount) > tokenInfo.balance)
                        ? `Insufficient ${tokenInfo.symbol} balance`
                        : "Insufficient SOL balance for service fee"
                      : "Insufficient balance (including service fee)"}
                  </p>
                </div>
              )}
            </div>
            {amount && (
              <div className="space-y-3 mt-6 bg-accent/30 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <span className="font-medium">Service Fee</span>
                    <div className="group relative">
                      <HiInformationCircle className="w-4 h-4" />
                      <Tooltip content="Network fee plus service fee calculated based on the transaction value" />
                    </div>
                  </div>
                  <p className="text-white/90 font-medium">
                    {isSendingToken && tokenInfo ? (
                      `${Math.max(
                        (parseFloat(amount) * parseFloat(tokenInfo.priceUsd || "0") / (solPrice || 1)) * 0.003,
                        0.001 + 0.0003
                      ).toFixed(6)} SOL`
                    ) : (
                      `${Math.max(parseFloat(amount) * 0.003, 0.001 + 0.0003).toFixed(6)} SOL`
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <span className="font-medium">Fee Structure</span>
                    <div className="group relative">
                      <HiInformationCircle className="w-4 h-4" />
                      <Tooltip content="0.3% of transaction value or minimum fee of 0.00115 SOL (whichever is greater)" />
                    </div>
                  </div>
                  <p className="text-white/60 text-sm">
                    0.3% fee • Min ${((0.00115 * (solPrice || 0))).toFixed(3)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <span className="font-medium">USD Value</span>
                  </div>
                  <p className="text-white/90 font-medium">
                    {isSendingToken && tokenInfo ? (
                      `$${(parseFloat(amount || "0") * parseFloat(tokenInfo.priceUsd || "0")).toFixed(2)}`
                    ) : (
                      `$${(parseFloat(amount || "0") * (solPrice || 0)).toFixed(2)}`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || hasInsufficientBalance || !amount || !recipient}
            className="w-full btn-primary text-white/90 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-base mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/90 rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send
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