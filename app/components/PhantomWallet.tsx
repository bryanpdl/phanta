"use client";

import React from "react";
import { useState, useEffect } from "react";
import { HiWifi, HiPaperAirplane, HiRefresh, HiArrowRight, HiArrowDown, HiClock, HiArrowLeft } from "react-icons/hi";
import { HiClipboard, HiClipboardCheck, HiExternalLink } from "react-icons/hi";
import { HiArrowPath, HiArrowsUpDown } from "react-icons/hi2";
import { toast, Toaster } from "react-hot-toast";
import { connectWallet, disconnectWallet, getBalance, getSolanaPrice, getRecentTransactions, getTokenPrice, getTokenBalance, DexscreenerPair, checkWalletConnection } from "../utils/phantom";
import SendTransactionModal from "./SendTransactionModal";
import ReceiveModal from "./ReceiveModal";
import SwapModal from "./SwapModal";
import TransactionList from "./TransactionList";
import AnimatedBackground from "./AnimatedBackground";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { TOKEN_ADDRESS } from "../utils/constants";
import { useWallet } from "../context/WalletContext";

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
  const { setWalletConnected } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<DexscreenerPair | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // Check wallet connection status on mount and set up event listeners
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // First check localStorage
        const savedAddress = window.localStorage.getItem("walletAddress");
        
        if (savedAddress) {
          // Verify the connection is still valid
          const isStillConnected = await checkWalletConnection();
          
          if (isStillConnected) {
            setWalletAddress(savedAddress);
            setWalletConnected(true);
          } else {
            // Clean up if the connection is no longer valid
            window.localStorage.removeItem("walletAddress");
            setWalletAddress(null);
            setWalletConnected(false);
          }
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    // Set up event listeners for wallet state changes
    const handleDisconnect = () => {
      setWalletAddress(null);
      setWalletConnected(false);
      setBalance(null);
    };

    const handleAccountChange = () => {
      const newAddress = window.localStorage.getItem("walletAddress");
      if (newAddress) {
        setWalletAddress(newAddress);
        setWalletConnected(true);
        // Refresh balances when account changes
        fetchBalance();
      } else {
        handleDisconnect();
      }
    };

    window.addEventListener('walletDisconnected', handleDisconnect);
    window.addEventListener('walletChanged', handleAccountChange);

    // Check connection on mount
    checkConnection();

    // Cleanup event listeners
    return () => {
      window.removeEventListener('walletDisconnected', handleDisconnect);
      window.removeEventListener('walletChanged', handleAccountChange);
    };
  }, [setWalletConnected]);

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

  useEffect(() => {
    const fetchTokenInfo = async () => {
      const chainId = "solana";
      const info = await getTokenPrice(chainId, TOKEN_ADDRESS);
      setTokenInfo(info);
      fetchTokenBalance();
    };

    fetchTokenInfo();
    const interval = setInterval(fetchTokenInfo, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const fetchTokenBalance = async () => {
    if (walletAddress) {
      try {
        const balance = await getTokenBalance(TOKEN_ADDRESS);
        setTokenBalance(balance);
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
        setTokenBalance(null);
      }
    }
  };

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setBalance(null); // Reset balance
      setWalletConnected(true);
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
      setWalletConnected(false);
      toast.success("Wallet disconnected successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect from Phantom Wallet.");
    }
  };

  const fetchBalance = async () => {
    if (walletAddress) {
      setIsBalanceLoading(true);
      try {
        const [solBalance, tokenBal] = await Promise.all([
          getBalance(),
          getTokenBalance(TOKEN_ADDRESS)
        ]);
        setBalance(solBalance);
        setTokenBalance(tokenBal);
        toast.success("Balances updated!");
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch balances");
      } finally {
        setIsBalanceLoading(false);
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

  // Add this function after the other formatting functions
  const formatTokenPrice = (priceStr: string): React.ReactNode => {
    const price = parseFloat(priceStr || "0");
    
    // If price is 0 or not a valid number, return "0"
    if (!price || isNaN(price)) return "$0";
    
    // If price is greater than 0.0001, use regular formatting
    if (price >= 0.0001) {
      return `$${price.toFixed(4)}`;
    }
    
    // For very small numbers, use sub notation
    const priceString = price.toFixed(10);
    const [whole, decimal] = priceString.split('.');
    
    // Count leading zeros in decimal
    let leadingZeros = 0;
    for (const char of decimal) {
      if (char === '0') {
        leadingZeros++;
      } else {
        break;
      }
    }
    
    // Format with subscript notation
    const significantDigits = decimal.slice(leadingZeros, leadingZeros + 4);
    return (
      <span className="whitespace-nowrap">
        $0.0<sub className="text-xs">{leadingZeros}</sub>{significantDigits}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      {!walletAddress && <AnimatedBackground />}
      <div className="max-w-7xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {!showTransactions ? (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: -100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="flex flex-col items-center"
            >
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
                  tokenInfo={tokenInfo ? {
                    symbol: tokenInfo.baseToken.symbol,
                    balance: tokenBalance,
                    imageUrl: tokenInfo.info?.imageUrl,
                    priceUsd: tokenInfo.priceUsd
                  } : undefined}
                  solPrice={solPrice || 0}
                />
              )}
              {walletAddress && (
                <ReceiveModal
                  isOpen={isReceiveModalOpen}
                  onClose={() => setIsReceiveModalOpen(false)}
                  walletAddress={walletAddress}
                />
              )}
              {walletAddress && tokenInfo && (
                <SwapModal
                  isOpen={isSwapModalOpen}
                  onClose={() => setIsSwapModalOpen(false)}
                  walletAddress={walletAddress}
                  solBalance={balance || 0}
                  solPrice={solPrice || 0}
                  tokenInfo={tokenInfo}
                  tokenBalance={tokenBalance || 0}
                />
              )}
              {/* Wallet Container */}
              <div className="w-full sm:w-[500px] container-neumorphic rounded-2xl p-6 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl font-bold text-white/90 flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src="/fred-mascot3.png"
                        alt="Fred mascot"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    Wallet
                  </h1>
                  {walletAddress && (
                    <button
                      onClick={() => setShowTransactions(true)}
                      className="bg-secondary text-white/90 p-2.5 rounded-lg transition-all hover:brightness-110 shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)] active:translate-y-[3px]"
                      title="View Transactions"
                    >
                      <HiClock className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {walletAddress ? (
                    <>
                      {/* Address Container */}
                      <div className="bg-accent/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/60 text-sm font-medium">Wallet Address</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={copyAddress}
                              className="text-white/60 hover:text-white/90 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
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
                              className="text-white/60 hover:text-white/90 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                              title="View on Solana Explorer"
                            >
                              <HiExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-white/90 font-mono text-sm break-all">{walletAddress}</p>
                      </div>
                      
                      {/* Balance Section */}
                      <div className="bg-accent/50 rounded-xl border border-white/5">
                        {/* Header */}
                        <div className="p-4 border-b border-white/5">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white/90">Balance</h2>
                            <button
                              onClick={fetchBalance}
                              disabled={isBalanceLoading}
                              className="p-2 hover:bg-white/5 rounded-lg transition-colors duration-200"
                            >
                              <HiRefresh className={`w-4 h-4 text-white/60 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>
                        
                        {/* SOL Balance */}
                        <div className="p-4 border-b border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="relative w-8 h-8">
                                <Image
                                  src="/solana-logo.svg"
                                  alt="Solana"
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              </div>
                              <p className="text-lg font-semibold text-white">
                                SOL
                              </p>
                            </div>
                            <p className="text-white/60 text-sm font-medium">
                              ${solPrice ? solPrice.toFixed(2) : "Loading..."} USD
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-semibold text-white">
                              {balance !== null ? balance.toLocaleString() : "Loading..."} SOL
                            </p>
                            {balance !== null && solPrice && (
                              <p className="text-white/40 text-sm">
                                ≈ ${(balance * solPrice).toFixed(2)} USD
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Swap direction Button */}
                        <div className="relative h-[1px]">
                          <div className="absolute left-0 right-0 top-0 border-b border-white/5" />
                          <button
                            onClick={() => setIsSwapModalOpen(true)}
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-2.5 rounded-lg transition-all hover:brightness-110 shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-4px_0_var(--container-shadow)] hover:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-6px_0_var(--container-shadow)] active:shadow-[inset_0_1px_1px_var(--container-shadow-top),inset_0_-1px_0_var(--container-shadow)] border border-white/5 z-10"
                            title="Swap Tokens"
                          >
                            <HiArrowsUpDown className="w-5 h-5 text-white" />
                          </button>
                        </div>

                        {/* Token Info */}
                        {tokenInfo && (
                          <div className="p-4 relative">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  {tokenInfo.info?.imageUrl && (
                                    <div className="relative w-8 h-8">
                                      <Image
                                        src={tokenInfo.info.imageUrl}
                                        alt={tokenInfo.baseToken.symbol}
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                      />
                                    </div>
                                  )}
                                  <p className="text-lg font-semibold text-white">
                                    {tokenInfo.baseToken.symbol}
                                  </p>
                                </div>
                                <p className="text-white/60 text-sm font-medium flex items-baseline">
                                  {formatTokenPrice(tokenInfo.priceUsd)}
                                </p>
                              </div>
                              <div className="space-y-1">
                                {tokenBalance !== null && (
                                  <p className="text-2xl font-semibold text-white">
                                    {tokenBalance.toLocaleString()} {tokenInfo.baseToken.symbol}
                                  </p>
                                )}
                                {tokenBalance !== null && tokenInfo.priceUsd && (
                                  <p className="text-white/40 text-sm">
                                    ≈ ${(tokenBalance * parseFloat(tokenInfo.priceUsd)).toFixed(2)} USD
                                  </p>
                                )}
                                {tokenInfo.marketCap && (
                                  <p className="text-white/40 text-sm">
                                    Market Cap: ${tokenInfo.marketCap.toLocaleString()}
                                  </p>
                                )}
                                {tokenInfo.liquidity?.usd && (
                                  <p className="text-white/40 text-sm">
                                    24h Volume: ${tokenInfo.liquidity.usd.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsSendModalOpen(true)}
                          className="flex-1 btn-primary text-white/90 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-base"
                        >
                          Send
                          <HiArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsReceiveModalOpen(true)}
                          className="flex-1 btn-primary text-white/90 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-base"
                        >
                          Receive
                          <HiArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={handleDisconnect}
                        className="w-full bg-accent/30 hover:bg-accent/50 text-white/90 font-bold py-4 rounded-xl transition-all border border-white/5 hover:border-white/10 text-base"
                      >
                        Disconnect Wallet
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="w-full btn-primary text-white/90 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2.5 text-base"
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
            </motion.div>
          ) : (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
              className="w-full max-w-xl mx-auto"
            >
              {/* Recent Transactions Container */}
              <div className="container-neumorphic rounded-2xl p-6 w-full relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowTransactions(false)}
                      className="text-white/60 hover:text-white/90 transition-colors p-1 hover:bg-white/5 rounded-lg"
                    >
                      <HiArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-white/90">Recent Transactions</h2>
                  </div>
                  <button
                    onClick={fetchTransactions}
                    disabled={isTransactionsLoading}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors duration-200"
                  >
                    <HiRefresh className={`w-5 h-5 text-white/60 ${isTransactionsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="bg-accent/50 rounded-xl border border-white/5">
                  <TransactionList transactions={transactions} isLoading={isLoading} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PhantomWallet;