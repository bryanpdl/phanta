"use client";

import { useState } from "react";
import Link from "next/link";
import { HiMap } from "react-icons/hi";
import RoadmapModal from "./RoadmapModal";
import { useWallet } from "../context/WalletContext";

const RoadmapFooter = () => {
  const { isWalletConnected } = useWallet();
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-8 py-6">
        <div className="max-w-8xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setIsRoadmapOpen(true)}
            className={`flex-1 sm:flex-none font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110 ${
              isWalletConnected 
                ? 'bg-secondary text-black shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)]'
                : 'bg-accent text-secondary shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-4px_0_var(--accent-shadow)] hover:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-6px_0_var(--accent-shadow)] active:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-1px_0_var(--accent-shadow)]'
            } active:translate-y-[3px] flex items-center justify-center gap-2`}
          >
            <HiMap className="w-5 h-5" />
            Roadmap
          </button>
          
          <Link
            href="https://dexscreener.com/solana/ayftwlahk5nu88h7z4y5p2q7d1lmr4mjd6svhsmfzqbb"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 sm:flex-none font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110 ${
              isWalletConnected 
                ? 'bg-secondary text-black shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)]'
                : 'bg-accent text-secondary shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-4px_0_var(--accent-shadow)] hover:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-6px_0_var(--accent-shadow)] active:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-1px_0_var(--accent-shadow)]'
            } active:translate-y-[3px] text-center`}
          >
            BUY TOKEN
          </Link>
        </div>
      </footer>

      <RoadmapModal isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)} />
    </>
  );
};

export default RoadmapFooter; 