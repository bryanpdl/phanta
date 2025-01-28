"use client";

import Link from "next/link";
import { HiCheck } from "react-icons/hi";
import { useWallet } from "../context/WalletContext";

const RoadmapFooter = () => {
  const { isWalletConnected } = useWallet();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 px-8 py-6">
      <div className={`max-w-8xl mx-auto flex items-center ${isWalletConnected ? 'justify-between' : 'justify-center mb-4'}`}>
        {/* Progress Tabs - Only show when connected */}
        {isWalletConnected && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-background border-2 border-secondary px-4 py-2 rounded-lg text-secondary">
              <HiCheck className="w-5 h-5" />
              <span className="font-bold">Q1 - LAUNCH</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 border-2 border-white/20 px-4 py-2 rounded-lg text-white/20">
              <span className="font-medium">Q2 - EXPANSION</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 border-2 border-white/20 px-4 py-2 rounded-lg text-white/20">
              <span className="font-medium">Q3 - STAKING & REWARDS</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 border-2 border-white/20 px-4 py-2 rounded-lg text-white/20">
              <span className="font-medium">Q4 - COMMUNITY & ECOSYSTEMS</span>
            </div>
            <div className="flex items-center gap-2 bg-background/50 border-2 border-white/20 px-4 py-2 rounded-lg text-white/20">
              <span className="font-medium">??? (2026)</span>
            </div>
          </div>
        )}
        
        {/* Buy Token Button */}
        <Link
          href="https://dexscreener.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110
            ${isWalletConnected 
              ? 'bg-secondary text-black shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)]'
              : 'bg-accent text-secondary shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-4px_0_var(--accent-shadow)] hover:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-6px_0_var(--accent-shadow)] active:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-1px_0_var(--accent-shadow)]'
            } active:translate-y-[3px]`
          }
        >
          BUY TOKEN
        </Link>
      </div>
    </footer>
  );
};

export default RoadmapFooter; 