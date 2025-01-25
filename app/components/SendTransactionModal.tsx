"use client";

import { useState, useEffect } from "react";
import { HiX, HiArrowRight } from "react-icons/hi";
import { toast } from "react-hot-toast";
import { sendTransaction, getBalance } from "../utils/phantom";

interface SendTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderAddress: string;
}

const SendTransactionModal = ({ isOpen, onClose, senderAddress }: SendTransactionModalProps) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

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
    if (isNaN(parsedAmount) || !currentBalance) {
      setHasInsufficientBalance(false);
      return;
    }

    // Calculate total needed including maximum service fee (0.3% or minimum)
    const serviceFee = Math.max(parsedAmount * 0.003, 0.001 + 0.0003);
    const totalNeeded = parsedAmount + serviceFee;

    setHasInsufficientBalance(totalNeeded > currentBalance);
  }, [amount, currentBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await sendTransaction(recipient, parsedAmount);
      toast.success("Transaction sent successfully!");
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

        <h2 className="text-xl font-bold text-white/90 mb-6">Send SOL</h2>

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
              Amount (SOL)
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
                  Insufficient balance (including service fee)
                </p>
              )}
            </div>
            {amount && (
              <div className={`space-y-1 ${hasInsufficientBalance ? 'mt-8' : 'mt-4'}`}>
                <p className="text-white/60 text-xs">
                  Service fee: {Math.max(parseFloat(amount) * 0.003, 0.001 + 0.0003).toFixed(6)} SOL
                  {parseFloat(amount) * 0.003 < (0.001 + 0.0003) && " (minimum fee)"}
                </p>
                <p className="text-white/60 text-xs">
                  Includes network fees for 2 transactions (~0.00015 SOL each)
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
                Send Transaction
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