"use client";

import React from "react";
import { HiArrowUp, HiArrowDown } from "react-icons/hi";
import { TransactionInfo } from "../utils/phantom";

interface TransactionListProps {
  transactions: TransactionInfo[];
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
    return <p className="text-white/60 text-sm text-center py-4">Loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-white/60 text-sm text-center py-4">No recent transactions</p>;
  }

  return (
    <div className="divide-y divide-white/5 overflow-hidden">
      {transactions.map((tx) => (
        <div 
          key={tx.signature}
          className="group transaction-item flex items-center justify-between p-4 transition-all duration-200 cursor-pointer hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl"
          onClick={() => window.open(`https://solscan.io/tx/${tx.signature}`, '_blank')}
        >
          <div className="flex items-center gap-3">
            {tx.type === "TRANSFER" ? (
              tx.amount ? (
                tx.amount > 0 ? (
                  <HiArrowDown className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform duration-200" />
                ) : (
                  <HiArrowUp className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-200" />
                )
              ) : (
                <div className="w-5 h-5" />
              )
            ) : (
              <div className="w-5 h-5" />
            )}
            <div>
              <p className="text-white/90 text-base font-medium group-hover:text-white transition-colors duration-200">
                {tx.type === "TRANSFER" && tx.amount 
                  ? `${tx.amount.toFixed(4)} SOL` 
                  : tx.type === "TOKEN" 
                  ? "Token Transfer"
                  : tx.type}
              </p>
              <p className="text-white/60 text-sm group-hover:text-white/80 transition-colors duration-200">
                {formatDate(tx.timestamp)}
              </p>
              {tx.security?.warning && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`${
                    tx.security.isDust 
                      ? "text-yellow-400" 
                      : tx.security.isSuspicious 
                      ? "text-red-400" 
                      : "text-white/60"
                  }`}>⚠️</span>
                  <p className={`text-sm hidden sm:block ${
                    tx.security.isDust 
                      ? "text-yellow-400" 
                      : tx.security.isSuspicious 
                      ? "text-red-400" 
                      : "text-white/60"
                  }`}>
                    {tx.security.warning}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-sm font-mono group-hover:text-white/80 transition-colors duration-200">
              {shortenSignature(tx.signature)}
            </p>
            <p className={`text-sm font-medium ${tx.status === "Success" ? "text-green-400" : "text-red-400"} group-hover:brightness-110 transition-all duration-200`}>
              {tx.status}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList; 