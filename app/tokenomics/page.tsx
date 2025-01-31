"use client";

import { useWallet } from "../context/WalletContext";
import Navbar from "../components/Navbar";
import RoadmapFooter from "../components/RoadmapFooter";
import Image from "next/image";
import React from "react";
import { HiExternalLink } from "react-icons/hi";

const TokenomicsPage = () => {
  const { isWalletConnected } = useWallet();

  const walletData = [
    { 
      wallet: 'PRIMARY',
      allocation: '25%',
      purpose: 'Liquidity pool & market stability',
      address: '7Scjv8kNPvNiAMbFasE3PUwTEeRBtbLUThNfRwCuMaz9' // Add Solscan address here
    },
    { 
      wallet: 'OPS',
      allocation: '20%',
      purpose: 'Operational costs & development',
      address: 'AxmeWHChaBKhnXcNaRPuBW7g9H2VC6vVZoBfAfQHeotH' // Add Solscan address here
    },
    { 
      wallet: 'TEAM',
      allocation: '15%',
      purpose: 'Team rewards with vesting schedule',
      address: '8F7yrWZZyHejCbtveg6iNj9847tm7sHcdEA58Pa7ZySz' // Add Solscan address here
    },
    { 
      wallet: 'STAKE',
      allocation: '30%',
      purpose: 'Staking rewards & incentives',
      address: '8hdrUdRFcuEz9jR5PwLEjXtTgnAFN3KV6XZpgGrytXET' // Add Solscan address here
    },
    { 
      wallet: 'BURN',
      allocation: '10%',
      purpose: 'Permanent removal of tokens from supply',
      address: '2QePPd8XiSa4beM2L4NkyT7rWDE6Jibc6XLsQjAxdFsk' // Add Solscan address here
    },
    { 
      wallet: 'TOTAL',
      allocation: '100%',
      purpose: 'Fully transparent allocation',
      isTotal: true
    }
  ];

  return (
    <main className="min-h-screen bg-background text-white relative">
      <Navbar />
      
      {/* Main content with padding to account for navbar and footer */}
      <div className="pt-20 sm:pt-24 pb-24 sm:pb-28 px-4 sm:px-8">
        <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-8">
            {/* Overview Section */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <Image
                    src="/fred-mascot3.png"
                    alt="Fred mascot"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold">Fred ($FRED) Tokenomics</h1>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-base sm:text-lg text-gray-300">
                Fred (FRED) is a Solana-based token designed for fast transactions, low fees,
                and real DeFi utility.
              </p>
            </section>

            {/* Token Distribution Section */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Token Distribution</h2>
              <div className="bg-white/5 rounded-lg">
                {/* Desktop Table */}
                <div className="hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left">Wallet</th>
                        <th className="px-4 py-3 text-left">Allocation (%)</th>
                        <th className="px-4 py-3 text-left">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletData.map((row, index) => (
                        <tr key={row.wallet} className={index < walletData.length - 1 ? "border-b border-white/10" : ""}>
                          <td className="px-4 py-3">{row.wallet}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{row.allocation}</span>
                              {!row.isTotal && row.address && (
                                <a
                                  href={`https://solscan.io/account/${row.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-secondary hover:opacity-80 transition-opacity"
                                >
                                  <HiExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${row.isTotal ? 'font-semibold' : ''}`}>{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Layout */}
                <div className="sm:hidden divide-y divide-white/10">
                  {walletData.map((row) => (
                    <div key={row.wallet} className={`p-4 space-y-2 ${row.isTotal ? 'font-semibold' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span>{row.wallet}</span>
                        <div className="flex items-center gap-2">
                          <span>{row.allocation}</span>
                          {!row.isTotal && row.address && (
                            <a
                              href={`https://solscan.io/account/${row.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-secondary hover:opacity-80 transition-opacity"
                            >
                              <HiExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-300 text-sm">
                        {row.purpose}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-8">
            {/* Liquidity Strategy Section */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Liquidity Strategy</h2>
              <div className="bg-white/5 rounded-lg p-3 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">Initial Liquidity Contribution:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• SOL Contribution: 29.4 SOL</li>
                    <li>• Token Contribution: 528.38M FRED</li>
                    <li>• Starting Price: Determined by the SOL/token ratio</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">Fee Revenue:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Trading fees generated on fred.fun</li>
                    <li>• Reinvestment into liquidity & ecosystem growth</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Burn Mechanism Section */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Burn Mechanism</h2>
              <div className="bg-white/5 rounded-lg p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <p className="text-gray-300">
                    1. Initial Burn: A portion of total supply burned at launch to increase scarcity.
                  </p>
                </div>
                <div>
                  <p className="text-gray-300">
                    2. Event-Based Burns: Additional burns triggered by milestones (e.g., market cap goals, holder count).
                  </p>
                </div>
              </div>
            </section>

            {/* Governance & Transparency Section */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Governance & Transparency</h2>
              <div className="bg-white/5 rounded-lg p-3 sm:p-6">
                <p className="text-gray-300">
                  Fred is community-driven with full transparency. All wallet allocations and
                  transactions can be verified on-chain.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <RoadmapFooter />
    </main>
  );
};

export default TokenomicsPage; 