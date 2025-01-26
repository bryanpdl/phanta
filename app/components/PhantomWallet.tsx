"use client";

import { useState, useEffect } from "react";
import { HiWifi, HiPaperAirplane, HiRefresh, HiArrowRight, HiArrowDown } from "react-icons/hi";
import { HiClipboard, HiClipboardCheck, HiExternalLink, HiClock } from "react-icons/hi";
import { HiArrowPath } from "react-icons/hi2";
import { toast, Toaster } from "react-hot-toast";
import { connectWallet, disconnectWallet, getBalance, getSolanaPrice, getRecentTransactions, getTokenBalances, type TokenBalance } from "../utils/phantom";
import SendTransactionModal from "./SendTransactionModal";
import ReceiveModal from "./ReceiveModal";
import TransactionList from "./TransactionList";
import Image from "next/image";

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
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);

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

  // Fetch initial balance and tokens when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
      fetchTokenBalances();
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
      setIsBalanceLoading(true);
      try {
        const bal = await getBalance();
        setBalance(bal);
        toast.success("Balance updated!");
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch balance");
      } finally {
        setIsBalanceLoading(false);
      }
    }
  };

  const fetchTokenBalances = async () => {
    if (walletAddress) {
      try {
        const balances = await getTokenBalances();
        setTokenBalances(balances);
      } catch (error: any) {
        console.error("Failed to fetch token balances:", error);
      }
    }
  };

  const fetchTransactions = async () => {
    if (walletAddress) {
      setIsTransactionsLoading(true);
      try {
        const txs = await getRecentTransactions(walletAddress);
        setTransactions(txs);
        toast.success("Transactions refreshed!");
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch transactions");
      } finally {
        setIsTransactionsLoading(false);
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
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
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
      
      <div className={`${walletAddress ? 'flex gap-6 w-full max-w-6xl' : 'flex justify-center w-full max-w-md'} mx-auto`}>
        {/* Main Wallet Container */}
        <div className={`container-neumorphic p-8 rounded-2xl ${walletAddress ? 'w-[540px]' : 'w-full'}`}>
          <h1 className="text-3xl font-bold text-white/90 mb-8 text-left flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src="/fred-mascot3.png"
                alt="Fred mascot"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            fred.fun
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
                
                <div className="space-y-4">
                  {/* SOL Balance */}
                  <div className="bg-accent rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/60 text-sm">SOL Balance</p>
                      <button
                        onClick={() => {
                          fetchBalance();
                          fetchTokenBalances();
                        }}
                        className="text-white/60 hover:text-white/90 transition-colors p-1"
                        title="Refresh Balances"
                        disabled={isBalanceLoading}
                      >
                        <HiRefresh className={`w-4 h-4 ${isBalanceLoading ? 'animate-spin' : ''}`} />
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

                  {/* Token Balances */}
                  {tokenBalances.length > 0 && (
                    <div className="bg-accent/50 rounded-lg divide-y divide-white/5">
                      {tokenBalances.map((token) => (
                        <div key={token.mint} className="p-4 first:rounded-t-lg last:rounded-b-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {token.logoURI && (
                                <img
                                  src={token.logoURI}
                                  alt={token.symbol}
                                  className="w-5 h-5 rounded-full"
                                />
                              )}
                              <p className="text-white/90 font-mono">
                                {token.balance.toFixed(4)} {token.symbol}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

                <button
                  onClick={handleDisconnect}
                  className="w-full bg-accent/30 hover:bg-accent/50 text-white/90 font-medium py-2.5 px-4 rounded-lg transition-all border border-transparent hover:border-white/10"
                >
                  Disconnect Wallet
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full btn-primary text-white/90 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Image
                  src="/phantom-logo.svg"
                  alt="Phantom"
                  width={20}
                  height={20}
                  className="opacity-80"
                />
                Connect Phantom Wallet
              </button>
            )}
          </div>
        </div>

        {/* Recent Transactions Container */}
        {walletAddress && (
          <div className="container-neumorphic p-8 rounded-2xl flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <HiClock className="w-5 h-5 text-white/60" />
                <h2 className="text-xl font-bold text-white/90">Recent Transactions</h2>
              </div>
              <button
                onClick={fetchTransactions}
                className="text-white/60 hover:text-white/90 transition-colors p-1"
                title="Refresh transactions"
                disabled={isTransactionsLoading}
              >
                <HiRefresh className={`w-5 h-5 ${isTransactionsLoading ? 'animate-spin' : ''}`} />
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
        )}
      </div>
    </div>
  );
};

export default PhantomWallet;