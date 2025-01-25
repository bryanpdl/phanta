"use client";

import React from "react";
import { HiArrowUp, HiArrowDown } from "react-icons/hi";
import { Transaction } from "../utils/phantom";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const shortenSignature = (signature: string) => {
  return signature.slice(0, 4) + "..." + signature.slice(-4);
};

const TransactionList = ({ transactions, isLoading }: TransactionListProps) => {
  if (isLoading) {
    return <p className="text-white/60 text-sm text-center py-2">Loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-white/60 text-sm text-center py-2">No recent transactions</p>;
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div 
          key={tx.signature}
          className="group transaction-item flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer hover:bg-accent/30"
          onClick={() => window.open(`https://solscan.io/tx/${tx.signature}`, '_blank')}
        >
          <div className="flex items-center gap-2">
            {tx.type === "TRANSFER" ? (
              tx.amount ? (
                tx.amount > 0 ? (
                  <HiArrowDown className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
                ) : (
                  <HiArrowUp className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform duration-200" />
                )
              ) : (
                <div className="w-4 h-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
            <div>
              <p className="text-white/90 text-sm font-medium group-hover:text-white transition-colors duration-200">
                {tx.type === "TRANSFER" && tx.amount 
                  ? `${tx.amount.toFixed(4)} SOL` 
                  : tx.type === "TOKEN" 
                  ? "Token Transfer"
                  : tx.type}
              </p>
              <p className="text-white/60 text-xs group-hover:text-white/80 transition-colors duration-200">
                {formatDate(tx.timestamp)}
              </p>
              {tx.security?.warning && (
                <p className={`text-xs mt-1 ${
                  tx.security.isDust 
                    ? "text-yellow-400" 
                    : tx.security.isSuspicious 
                    ? "text-red-400" 
                    : "text-white/60"
                }`}>
                  ⚠️ {tx.security.warning}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs font-mono group-hover:text-white/80 transition-colors duration-200">
              {shortenSignature(tx.signature)}
            </p>
            <p className={`text-xs ${tx.status === "Success" ? "text-green-400" : "text-red-400"} group-hover:brightness-110 transition-all duration-200`}>
              {tx.status}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList; 