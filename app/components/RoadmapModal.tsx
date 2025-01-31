"use client";

import { HiX, HiCheck } from "react-icons/hi";

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Phase {
  title: string;
  status: "completed" | "current" | "upcoming";
  items: string[];
}

const phases: Phase[] = [
  {
    title: "Q1 2024 - LAUNCH 🚀",
    status: "current",
    items: [
      "Token Launch on Moonshot",
      "Community Building",
      "Marketing",
      "Migrate to Raydium"
    ]
  },
  {
    title: "Q2 2024 - EXPANSION 📈",
    status: "upcoming",
    items: [
      "Trading Features",
      "Partnerships", 
      "Community Growth"
    ]
  },
  {
    title: "Q3 2024 - STAKING & REWARDS 💰",
    status: "upcoming",
    items: [
      "Staking Platform",
      "Reward System",
      "Governance",
      "Community DAO"
    ]
  },
  {
    title: "Q4 2024 - COMMUNITY & ECOSYSTEMS 🌱",
    status: "upcoming",
    items: [
      "Ecosystem Fund",
      "Community Projects",
      "DeFi Features"
    ]
  },
  {
    title: "2026 - ???",
    status: "upcoming",
    items: [
      "???",
    ]
  }
];

const RoadmapModal = ({ isOpen, onClose }: RoadmapModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="container-neumorphic rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white/90">Project Roadmap</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/90 transition-colors p-1 hover:bg-white/5 rounded-lg"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 max-h-[calc(80vh-120px)]">
          {phases.map((phase, index) => (
            <div
              key={phase.title}
              className="bg-accent/30 rounded-xl p-4 border border-white/5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  phase.status === 'completed' 
                    ? 'bg-secondary text-black' 
                    : phase.status === 'current'
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {phase.status === 'completed' ? (
                    <HiCheck className="w-5 h-5" />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white/90">{phase.title}</h3>
              </div>
              <ul className="space-y-2 ml-12">
                {phase.items.map((item, itemIndex) => (
                  <li 
                    key={itemIndex}
                    className={`text-sm ${
                      phase.status === 'completed' 
                        ? 'text-white/90' 
                        : phase.status === 'current'
                        ? 'text-white/80'
                        : 'text-white/40'
                    }`}
                  >
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoadmapModal; 