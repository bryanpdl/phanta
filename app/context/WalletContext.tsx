"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WalletContextType {
  isWalletConnected: boolean;
  setWalletConnected: (connected: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isWalletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const address = window.localStorage.getItem("walletAddress");
    setWalletConnected(!!address);
  }, []);

  return (
    <WalletContext.Provider value={{ isWalletConnected, setWalletConnected }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 