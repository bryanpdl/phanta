"use client";

import React, { useState } from "react";
import { HiX, HiClipboard, HiClipboardCheck, HiCode } from "react-icons/hi";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import { createRoot } from "react-dom/client";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const ReceiveModal = ({ isOpen, onClose, walletAddress }: ReceiveModalProps) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedQR, setCopiedQR] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  const copyQRCode = async () => {
    try {
      // Create a temporary QRCode element
      const qrElement = document.createElement('div');
      const root = createRoot(qrElement);
      root.render(
        <QRCodeSVG
          value={walletAddress}
          size={200}
          level="H"
        />
      );
      
      // Wait for the QR code to be rendered
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const embedCode = `<div style="background: white; padding: 20px; border-radius: 12px; display: inline-block;">
  <div style="width: 200px; height: 200px;">
    ${qrElement.innerHTML}
  </div>
  <div style="margin-top: 12px; text-align: center; font-family: monospace; font-size: 12px; color: #000;">
    ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}
  </div>
</div>`;

      await navigator.clipboard.writeText(embedCode);
      setCopiedQR(true);
      toast.success("QR code snippet copied!");
      setTimeout(() => setCopiedQR(false), 2000);
      
      // Cleanup
      root.unmount();
    } catch (error) {
      toast.error("Failed to copy QR code");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="container-neumorphic rounded-2xl p-4 sm:p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white/90 transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white/90 mb-6">Receive SOL</h2>

        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={walletAddress}
              size={200}
              level="H"
              imageSettings={{
                src: "/solana-logo.svg",
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-white/60 text-sm">Wallet Address</p>
            <div className="bg-accent/50 rounded-lg p-3">
              <p className="text-white/90 font-mono text-sm break-all">{walletAddress}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="flex-1 btn-primary text-white/90 font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {copiedAddress ? (
                  <HiClipboardCheck className="w-4 h-4" />
                ) : (
                  <HiClipboard className="w-4 h-4" />
                )}
                Copy Address
              </button>
              <button
                onClick={copyQRCode}
                className="flex-1 btn-primary text-white/90 font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {copiedQR ? (
                  <HiClipboardCheck className="w-4 h-4" />
                ) : (
                  <HiCode className="w-4 h-4" />
                )}
                Embed QR
              </button>
            </div>
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