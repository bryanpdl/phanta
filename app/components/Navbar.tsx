"use client";

import Link from "next/link";
import { FaDiscord, FaTelegram } from "react-icons/fa";
import { useWallet } from "../context/WalletContext";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import Image from "next/image";

const Navbar = () => {
  const { isWalletConnected } = useWallet();
  const pathname = usePathname();
  const isTokenomicsPage = pathname === "/tokenomics";
  const shouldShowConnectedState = isWalletConnected || isTokenomicsPage;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleConnect = () => {
    (window as any).handlePhantomConnect?.();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-6">
      <div className="max-w-8xl mx-auto flex items-center justify-between">
        {/* Logo and Connect Button Group */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className={`text-4xl font-extrabold transition-all duration-300 ${shouldShowConnectedState ? 'text-secondary' : 'text-black'}`}>fred.fun</span>
          </Link>
          
          {!isWalletConnected && (
            <button
              onClick={handleConnect}
              className="hidden sm:flex items-center gap-2 font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110 bg-primary text-white shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-4px_0_var(--primary-shadow)] hover:shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-6px_0_var(--primary-shadow)] active:shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-1px_0_var(--primary-shadow)] active:translate-y-[3px]"
            >
              <Image
                src="/phantom-logo.svg"
                alt="Phantom"
                width={16}
                height={16}
                className="opacity-80"
              />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/tokenomics"
            className={`
              font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110
              ${shouldShowConnectedState 
                ? 'bg-secondary text-black shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)]'
                : 'bg-accent text-secondary shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-4px_0_var(--accent-shadow)] hover:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-6px_0_var(--accent-shadow)] active:shadow-[inset_0_1px_1px_var(--accent-shadow-top),inset_0_-1px_0_var(--accent-shadow)]'
              } active:translate-y-[3px]`
            }
          >
            Tokenomics
          </Link>
          <Link
            href="https://dexscreener.com/solana/ayftwlahk5nu88h7z4y5p2q7d1lmr4mjd6svhsmfzqbb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
              <g clipPath="url(#clip0_9_251)">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.2539 9.26172C14.0551 8.86513 15.0745 8.28135 16.0951 7.4815C16.3103 7.92515 16.3339 8.31229 16.223 8.62489C16.1445 8.8452 15.9964 9.03682 15.8017 9.18927C15.5909 9.35402 15.3276 9.47397 15.0365 9.53879C14.4842 9.66229 13.8394 9.59019 13.2539 9.26172ZM13.3928 13.3252L14.4533 13.9333C12.2879 15.1382 11.6992 17.3754 11 19.5544C10.3008 17.3754 9.71199 15.1382 7.54665 13.9333L8.60719 13.3252C8.70979 13.2867 8.79747 13.2169 8.8577 13.1259C8.91792 13.035 8.94758 12.9274 8.94243 12.8186C8.84526 10.7779 9.40033 9.87541 10.149 9.30878C10.4176 9.10581 10.7107 9.00389 11 9.00389C11.2892 9.00389 11.5823 9.10581 11.851 9.30878C12.5997 9.87541 13.1547 10.7779 13.0576 12.8186C13.0524 12.9274 13.0821 13.035 13.1423 13.1259C13.2025 13.2169 13.2902 13.2867 13.3928 13.3252ZM11 0C12.2258 0.0326733 13.4548 0.268927 14.5214 0.72852C15.2599 1.04719 15.9491 1.46813 16.5731 1.97149C16.8549 2.19873 17.087 2.41826 17.3426 2.67098C18.032 2.69464 19.0396 1.93431 19.5073 1.22287C18.7023 3.8428 15.0288 6.93671 12.4857 8.12058C12.4846 8.12015 12.4839 8.11954 12.4831 8.11902C12.0267 7.77305 11.5134 7.60006 11 7.60006C10.4865 7.60006 9.97329 7.77305 9.51687 8.11902C9.51609 8.11945 9.51539 8.12023 9.51434 8.12058C6.97107 6.93671 3.29768 3.8428 2.49268 1.22287C2.96035 1.93431 3.9679 2.69464 4.65732 2.67098C4.91303 2.41835 5.14507 2.19873 5.4268 1.97149C6.05083 1.46813 6.73999 1.04719 7.47856 0.72852C8.54521 0.268927 9.77415 0.0326733 11 0ZM8.746 9.26172C7.94492 8.86513 6.92541 8.28135 5.90486 7.4815C5.68966 7.92515 5.66609 8.31229 5.77687 8.62489C5.85553 8.8452 6.0036 9.03682 6.19819 9.18927C6.40911 9.35402 6.67241 9.47397 6.96348 9.53879C7.51575 9.66229 8.16047 9.59019 8.746 9.26172Z" 
                  fill={shouldShowConnectedState ? "var(--secondary)" : "#000"}
                />
                <path fillRule="evenodd" clipRule="evenodd" d="M17.213 6.50131C17.7749 5.93841 18.27 5.31537 18.668 4.7594L18.8702 5.13718C19.5212 6.42999 19.8594 7.71759 19.8594 9.16666L19.858 11.4661L19.8702 12.6581C19.9173 15.5845 20.5552 18.5453 22 21.2548L18.977 18.8349L16.838 22.2807L14.5909 20.1807L11 25.9656L7.40911 20.1808L5.16206 22.2808L3.02308 18.835L0 21.2549C1.44484 18.5454 2.08267 15.5846 2.1299 12.6582L2.14212 11.4662L2.14072 9.16675C2.14072 7.71759 2.47884 6.42999 3.12994 5.13727L3.33204 4.75949C3.73013 5.31545 4.22513 5.93841 4.7871 6.5014L4.61162 6.86323C4.27071 7.56601 4.15783 8.35182 4.4234 9.09915C4.5946 9.58049 4.90705 9.99329 5.30986 10.3084C5.70097 10.6144 6.16384 10.8207 6.64845 10.929C6.96414 10.9996 7.28575 11.0286 7.60528 11.0187C7.53072 11.4383 7.49816 11.8734 7.49606 12.3168L4.64444 13.9519L6.84497 15.1764C7.02085 15.2743 7.18828 15.3864 7.34556 15.5117C9.15977 17.1287 10.2505 21.9125 11.0001 24.2491C11.7497 21.9125 12.8404 17.1287 14.6547 15.5117C14.812 15.3864 14.9794 15.2743 15.1553 15.1764L17.3558 13.9519L14.5041 12.3168C14.502 11.8734 14.4695 11.4383 14.3949 11.0187C14.7144 11.0286 15.036 10.9996 15.3517 10.929C15.8363 10.8207 16.2993 10.6144 16.6903 10.3084C17.093 9.99329 17.4056 9.58049 17.5767 9.09915C17.8423 8.35182 17.7294 7.5661 17.3886 6.86323L17.2131 6.5014L17.213 6.50131Z" 
                  fill={shouldShowConnectedState ? "var(--secondary)" : "#000"}
                />
              </g>
              <defs>
                <clipPath id="clip0_9_251">
                  <rect width="22" height="26" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </Link>
          <Link
            href="https://x.com/getfredcoin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
              <path d="M17.2685 13.1334L26.1475 2.8125H24.0438L16.3338 11.7741L10.1763 2.8125H3.07471L12.386 16.3641L3.07471 27.1875H5.17846L13.3197 17.7234L19.8222 27.1875H26.9247L17.2685 13.1334ZM14.3866 16.4831L13.4435 15.1341L5.93689 4.39688H9.16846L15.2266 13.0622L16.1697 14.4113L24.0447 25.6753H20.8131L14.3875 16.4841L14.3866 16.4831Z" 
                fill={shouldShowConnectedState ? "var(--secondary)" : "#000"}
              />
            </svg>
          </Link>
          <Link
            href="https://t.me/getfred"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-all duration-300 ${shouldShowConnectedState ? 'text-secondary' : 'text-black'} hover:opacity-80`}
          >
            <FaTelegram className="w-7 h-7" />
          </Link>
        
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="sm:hidden p-2 hover:opacity-80 transition-opacity"
        >
          <HiMenu className={`w-8 h-8 transition-all duration-300 ${shouldShowConnectedState ? 'text-secondary' : 'text-black'}`} />
        </button>

        {/* Mobile Menu Overlay */}
        <div 
          className={`
            fixed top-0 left-0 right-0 bg-background transition-transform duration-300 min-h-screen sm:hidden
            ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}
          `}
          ref={overlayRef}
        >
          {/* Close Button */}
          <div className="absolute top-6 right-4">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:opacity-80 transition-opacity"
            >
              <HiX className="w-8 h-8 transition-all duration-300 text-secondary" />
            </button>
          </div>

          <div className="px-4 pt-24 pb-8 space-y-8">
            <Link
              href="/tokenomics"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                block w-full font-bold px-6 py-3 rounded-lg text-center transition-all hover:brightness-110
                bg-secondary text-black shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-4px_0_var(--secondary-shadow)] 
                hover:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-6px_0_var(--secondary-shadow)] 
                active:shadow-[inset_0_1px_1px_var(--secondary-shadow-top),inset_0_-1px_0_var(--secondary-shadow)]
                active:translate-y-[3px]
              `}
            >
              Tokenomics
            </Link>

            {!isWalletConnected && (
              <button
                onClick={() => {
                  handleConnect();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-lg transition-all hover:brightness-110 bg-primary text-white shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-4px_0_var(--primary-shadow)] hover:shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-6px_0_var(--primary-shadow)] active:shadow-[inset_0_1px_1px_var(--primary-shadow-top),inset_0_-1px_0_var(--primary-shadow)] active:translate-y-[3px]"
              >
                <Image
                  src="/phantom-logo.svg"
                  alt="Phantom"
                  width={16}
                  height={16}
                  className="opacity-80"
                />
                Connect Wallet
              </button>
            )}

            <div className="flex justify-center items-center gap-8">
              <Link
                href="https://dexscreener.com/solana/ayftwlahk5nu88h7z4y5p2q7d1lmr4mjd6svhsmfzqbb"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:opacity-80 transition-opacity"
              >
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
                  <g clipPath="url(#clip0_9_251)">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.2539 9.26172C14.0551 8.86513 15.0745 8.28135 16.0951 7.4815C16.3103 7.92515 16.3339 8.31229 16.223 8.62489C16.1445 8.8452 15.9964 9.03682 15.8017 9.18927C15.5909 9.35402 15.3276 9.47397 15.0365 9.53879C14.4842 9.66229 13.8394 9.59019 13.2539 9.26172ZM13.3928 13.3252L14.4533 13.9333C12.2879 15.1382 11.6992 17.3754 11 19.5544C10.3008 17.3754 9.71199 15.1382 7.54665 13.9333L8.60719 13.3252C8.70979 13.2867 8.79747 13.2169 8.8577 13.1259C8.91792 13.035 8.94758 12.9274 8.94243 12.8186C8.84526 10.7779 9.40033 9.87541 10.149 9.30878C10.4176 9.10581 10.7107 9.00389 11 9.00389C11.2892 9.00389 11.5823 9.10581 11.851 9.30878C12.5997 9.87541 13.1547 10.7779 13.0576 12.8186C13.0524 12.9274 13.0821 13.035 13.1423 13.1259C13.2025 13.2169 13.2902 13.2867 13.3928 13.3252ZM11 0C12.2258 0.0326733 13.4548 0.268927 14.5214 0.72852C15.2599 1.04719 15.9491 1.46813 16.5731 1.97149C16.8549 2.19873 17.087 2.41826 17.3426 2.67098C18.032 2.69464 19.0396 1.93431 19.5073 1.22287C18.7023 3.8428 15.0288 6.93671 12.4857 8.12058C12.4846 8.12015 12.4839 8.11954 12.4831 8.11902C12.0267 7.77305 11.5134 7.60006 11 7.60006C10.4865 7.60006 9.97329 7.77305 9.51687 8.11902C9.51609 8.11945 9.51539 8.12023 9.51434 8.12058C6.97107 6.93671 3.29768 3.8428 2.49268 1.22287C2.96035 1.93431 3.9679 2.69464 4.65732 2.67098C4.91303 2.41835 5.14507 2.19873 5.4268 1.97149C6.05083 1.46813 6.73999 1.04719 7.47856 0.72852C8.54521 0.268927 9.77415 0.0326733 11 0ZM8.746 9.26172C7.94492 8.86513 6.92541 8.28135 5.90486 7.4815C5.68966 7.92515 5.66609 8.31229 5.77687 8.62489C5.85553 8.8452 6.0036 9.03682 6.19819 9.18927C6.40911 9.35402 6.67241 9.47397 6.96348 9.53879C7.51575 9.66229 8.16047 9.59019 8.746 9.26172Z" 
                      fill="var(--secondary)"
                    />
                    <path fillRule="evenodd" clipRule="evenodd" d="M17.213 6.50131C17.7749 5.93841 18.27 5.31537 18.668 4.7594L18.8702 5.13718C19.5212 6.42999 19.8594 7.71759 19.8594 9.16666L19.858 11.4661L19.8702 12.6581C19.9173 15.5845 20.5552 18.5453 22 21.2548L18.977 18.8349L16.838 22.2807L14.5909 20.1807L11 25.9656L7.40911 20.1808L5.16206 22.2808L3.02308 18.835L0 21.2549C1.44484 18.5454 2.08267 15.5846 2.1299 12.6582L2.14212 11.4662L2.14072 9.16675C2.14072 7.71759 2.47884 6.42999 3.12994 5.13727L3.33204 4.75949C3.73013 5.31545 4.22513 5.93841 4.7871 6.5014L4.61162 6.86323C4.27071 7.56601 4.15783 8.35182 4.4234 9.09915C4.5946 9.58049 4.90705 9.99329 5.30986 10.3084C5.70097 10.6144 6.16384 10.8207 6.64845 10.929C6.96414 10.9996 7.28575 11.0286 7.60528 11.0187C7.53072 11.4383 7.49816 11.8734 7.49606 12.3168L4.64444 13.9519L6.84497 15.1764C7.02085 15.2743 7.18828 15.3864 7.34556 15.5117C9.15977 17.1287 10.2505 21.9125 11.0001 24.2491C11.7497 21.9125 12.8404 17.1287 14.6547 15.5117C14.812 15.3864 14.9794 15.2743 15.1553 15.1764L17.3558 13.9519L14.5041 12.3168C14.502 11.8734 14.4695 11.4383 14.3949 11.0187C14.7144 11.0286 15.036 10.9996 15.3517 10.929C15.8363 10.8207 16.2993 10.6144 16.6903 10.3084C17.093 9.99329 17.4056 9.58049 17.5767 9.09915C17.8423 8.35182 17.7294 7.5661 17.3886 6.86323L17.2131 6.5014L17.213 6.50131Z" 
                      fill="var(--secondary)"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_9_251">
                      <rect width="22" height="26" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </Link>
              <Link
                href="https://x.com/getfredcoin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:opacity-80 transition-opacity"
              >
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
                  <path d="M17.2685 13.1334L26.1475 2.8125H24.0438L16.3338 11.7741L10.1763 2.8125H3.07471L12.386 16.3641L3.07471 27.1875H5.17846L13.3197 17.7234L19.8222 27.1875H26.9247L17.2685 13.1334ZM14.3866 16.4831L13.4435 15.1341L5.93689 4.39688H9.16846L15.2266 13.0622L16.1697 14.4113L24.0447 25.6753H20.8131L14.3875 16.4841L14.3866 16.4831Z" 
                    fill="var(--secondary)"
                  />
                </svg>
              </Link>
              <Link
                href="https://t.me/getfredcoin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-secondary hover:opacity-80 transition-opacity"
              >
                <FaTelegram className="w-7 h-7" />
              </Link>
          
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
