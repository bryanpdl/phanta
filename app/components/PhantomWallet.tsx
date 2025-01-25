"use client";

import { useState, useEffect } from "react";
import { HiWifi, HiPaperAirplane, HiRefresh, HiArrowRight, HiArrowDown } from "react-icons/hi";
import { HiClipboard, HiClipboardCheck, HiExternalLink, HiClock } from "react-icons/hi";
import { HiArrowPath } from "react-icons/hi2";
import { PiButterflyFill } from "react-icons/pi";
import { toast, Toaster } from "react-hot-toast";
import { connectWallet, disconnectWallet, getBalance, getSolanaPrice, getRecentTransactions } from "../utils/phantom";
import SendTransactionModal from "./SendTransactionModal";
import ReceiveModal from "./ReceiveModal";
import TransactionList from "./TransactionList";

interface Transaction {
  signature: string;
  timestamp: number;
  status: "Success" | "Failed";
  type: string;
  amount?: number;
  fee: number;
  security?: {
    warning: string;
    isDust: boolean;
    isSuspicious: boolean;
  };
}

const PhantomWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Fetch SOL price periodically
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getSolanaPrice();
        setSolPrice(price);
      } catch (error) {
        console.error("Failed to fetch SOL price:", error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial balance when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress]);

  // Fetch transactions when wallet is connected
  useEffect(() => {
    const fetchTransactions = async () => {
      if (walletAddress) {
        setIsLoading(true);
        try {
          const txs = await getRecentTransactions(walletAddress);
          setTransactions(txs);
        } catch (error: any) {
          toast.error("Failed to fetch transactions");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();
  }, [walletAddress]);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setBalance(null); // Reset balance
      toast.success("Wallet connected successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to connect to Phantom Wallet.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setWalletAddress(null);
      setBalance(null);
      toast.success("Wallet disconnected successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect from Phantom Wallet.");
    }
  };

  const fetchBalance = async () => {
    if (walletAddress) {
      try {
        const bal = await getBalance();
        setBalance(bal);
        toast.success("Balance updated!");
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch balance");
      }
    }
  };

  const fetchTransactions = async () => {
    if (walletAddress) {
      setIsLoading(true);
      try {
        const txs = await getRecentTransactions(walletAddress);
        setTransactions(txs);
        toast.success("Transactions refreshed!");
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch transactions");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        toast.success("Address copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error("Failed to copy address");
      }
    }
  };

  const viewOnExplorer = () => {
    if (walletAddress) {
      window.open(`https://solscan.io/account/${walletAddress}`, '_blank');
    }
  };

  // Format USD value with commas and 2 decimal places
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shortenSignature = (signature: string) => {
    return `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--foreground)',
            color: '#fff',
            borderRadius: '0.5rem',
          },
          success: {
            iconTheme: {
              primary: 'var(--primary)',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4b4b',
              secondary: '#fff',
            },
          },
        }}
      />
      {walletAddress && (
        <SendTransactionModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          senderAddress={walletAddress}
        />
      )}
      {walletAddress && (
        <ReceiveModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          walletAddress={walletAddress}
        />
      )}
      <div className="container-neumorphic p-8 rounded-2xl max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-white/90 mb-8 text-left flex items-left justify-left gap-3">
          <PiButterflyFill className="w-8 h-8 text-primary rotate-6" />
          SOLmoth
        </h1>
        
        <div className="space-y-6">
          {walletAddress ? (
            <>
              <div className="bg-accent rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/60 text-sm">Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyAddress}
                      className="text-white/60 hover:text-white/90 transition-colors p-1"
                      title="Copy address"
                    >
                      {copied ? (
                        <HiClipboardCheck className="w-4 h-4" />
                      ) : (
                        <HiClipboard className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={viewOnExplorer}
                      className="text-white/60 hover:text-white/90 transition-colors p-1"
                      title="View on Solana Explorer"
                    >
                      <HiExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-white/90 font-mono text-sm break-all">{walletAddress}</p>
              </div>
              
              <div className="bg-accent rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/60 text-sm">Balance</p>
                  <button
                    onClick={fetchBalance}
                    className="text-white/60 hover:text-white/90 transition-colors p-1"
                    title="Refresh Balance"
                  >
                    <HiRefresh className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white/90 font-mono text-lg">
                    {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
                  </p>
                  {balance !== null && solPrice !== null && (
                    <p className="text-white/60 font-mono text-sm">
                      {formatUSD(balance * solPrice)}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsSendModalOpen(true)}
                  className="flex-1 btn-primary text-white/90 font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Send
                  <HiArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsReceiveModalOpen(true)}
                  className="flex-1 btn-primary text-white/90 font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Receive
                  <HiArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Recent Transactions Section */}
              <div className="flex flex-col gap-3">
                <div className="bg-accent rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HiClock className="w-4 h-4 text-white/60" />
                      <p className="text-white/90 font-medium">Recent Transactions</p>
                    </div>
                    <button
                      onClick={fetchTransactions}
                      className="text-white/60 hover:text-white/90 transition-colors p-1"
                      title="Refresh transactions"
                    >
                      <HiRefresh className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {isLoading ? (
                    <p className="text-white/60 text-sm text-center py-2">Loading transactions...</p>
                  ) : transactions.length > 0 ? (
                    <TransactionList transactions={transactions} isLoading={isLoading} />
                  ) : (
                    <p className="text-white/60 text-sm text-center py-2">No recent transactions</p>
                  )}
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full bg-accent/30 hover:bg-accent/50 text-white/90 font-medium py-2.5 px-4 rounded-lg transition-all border border-transparent hover:border-white/10"
                >
                  Disconnect Wallet
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="w-full btn-primary text-white/90 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <HiWifi className="w-5 h-5 opacity-80" />
              Connect Phantom Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhantomWallet;