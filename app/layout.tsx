import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react"
import { Onest } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import RoadmapFooter from "./components/RoadmapFooter";
import { WalletProvider } from "./context/WalletContext";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "fred.fun",
  description: "Simple wallet for FRED/SOL",
};

// Disable error overlay in development
if (process.env.NODE_ENV !== 'production') {
  const originalError = console.error;
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${onest.variable} font-onest antialiased`}>
        <WalletProvider>
          <Navbar />
          {children}
          <RoadmapFooter />
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
