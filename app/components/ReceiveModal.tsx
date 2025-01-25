"use client";

import React, { useState } from "react";
import { HiX, HiClipboard, HiClipboardCheck } from "react-icons/hi";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const ReceiveModal = ({ isOpen, onClose, walletAddress }: ReceiveModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
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

        <h2 className="text-xl font-bold text-white/90 mb-6">Receive SOL</h2>

        <div className="flex flex-col items-center space-y-6">
          {/* QR Code with Solana logo */}
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={walletAddress}
              size={200}
              level="H"
              imageSettings={{
                src: "/solana-logo.svg",
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-white/60 text-sm text-center">Your Solana Address</p>
            <div className="bg-accent/50 rounded-lg p-4">
              <p className="text-white/90 font-mono text-sm break-all text-center">
                {walletAddress}
              </p>
            </div>
            
            <button
              onClick={handleCopy}
              className="w-full btn-primary text-white/90 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <HiClipboardCheck className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <HiClipboard className="w-5 h-5" />
                  Copy Address
                </>
              )}
            </button>
          </div>

          <p className="text-white/40 text-xs text-center">
            This address can only be used to receive SOL and SPL tokens
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal; 