import React from 'react';
import { X, ShieldCheck, Check, AlertOctagon } from 'lucide-react';

interface StrictRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrictRulesDrawer: React.FC<StrictRulesDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      num: 1,
      title: 'Spot Market Only (No Futures / Leverage)',
      desc: 'Strictly Spot crypto trading. No futures signals, no leverage, no liquidation, no futures positioning.',
    },
    {
      num: 2,
      title: 'Coin Age & Health Filters',
      desc: 'Coin must be >= 6 months old. Reject any monitoring, warning, watchlist, caution tag, or delisting risk. Reject abnormal/wash volume.',
    },
    {
      num: 3,
      title: '1-Hour (1H) Timeframe STRICT',
      desc: 'Both candle marking and RSI must be on the 1H timeframe. Never substitute 4H or 1D.',
    },
    {
      num: 4,
      title: 'LIVE 1H RSI: 30.00 – 40.00 Mandatory',
      desc: 'The current live 1H RSI must be strictly between 30.00 and 40.00. Unverifiable or out-of-bounds RSI = NO SIGNAL.',
    },
    {
      num: 5,
      title: 'Price Candle Pattern: Lower Wick ONLY',
      desc: 'Must use ONLY the lower wicks of the 1H candles. Upper wicks are ignored. Wicks must match at exact structural level.',
    },
    {
      num: 6,
      title: 'Candle Distance: 6 to 19 Candles (Max 19, Ideal ≤18)',
      desc: 'The second candle must form 6 to 19 candles after the first candle. Minimum 6, Maximum 19 (preferred ≤18). Anything beyond 19 is strictly rejected.',
    },
    {
      num: 7,
      title: 'Zero-Touch Price Trendline Rule',
      desc: 'Between Point 1 and Point 2, no intermediate candle body and no intermediate lower wick may touch the trendline.',
    },
    {
      num: 8,
      title: 'Direction: Ascending → Descending ONLY',
      desc: 'Pattern must follow Ascending → Descending structure. Reverse arrangement (Descending → Ascending) is strictly rejected.',
    },
    {
      num: 9,
      title: 'RSI Hidden-Bullish Structure & Zero-Touch',
      desc: 'RSI structure must correspond to the two candles and intermediate RSI values must stay cleanly above the RSI trendline.',
    },
    {
      num: 10,
      title: 'Price + RSI Must Agree Simultaneously',
      desc: 'Both price candle structure and RSI structure must qualify at the exact same moment. No partial qualification.',
    },
    {
      num: 11,
      title: 'Live Entry During Formation',
      desc: 'Signal is generated immediately as Candle 2 forms when all conditions align. Do not wait for candle close.',
    },
    {
      num: 12,
      title: 'Live Wick Invalidation',
      desc: 'If live price movement breaks the lower wick or RSI leaves 30–40 before entry, setup is invalidated immediately.',
    },
    {
      num: 13,
      title: 'Target: +1% Quick Scalp Target',
      desc: 'Take Profit = +1.00% from entry price. Strictly quick spot profit scalp.',
    },
    {
      num: 14,
      title: 'Do Not Chase Price',
      desc: 'Reject setup if price has already moved away from the fresh lower wick entry area (>0.35%).',
    },
    {
      num: 15,
      title: 'No Forced Results (Honest Scanner)',
      desc: 'If zero coins qualify, the scanner prominently displays: "NO VALID HIDDEN BULLISH SETUP RIGHT NOW". Never force or fabricate signals.',
    },
    {
      num: 16,
      title: 'Critical Anti-Relaxation Rule',
      desc: 'The scanner never uses "close enough" or relaxes tolerances. All 22 rules are deterministic requirements.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-mono text-sm font-bold text-white tracking-wide">
                Strict Master Prompt Constitution
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                22 Deterministic Rules Enforced Without Exception
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 font-mono text-xs">
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] leading-relaxed flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All rules are hardcoded into the scanner mathematical pipeline. No fuzzy approximations or loosened thresholds.
            </span>
          </div>

          {rules.map((rule) => (
            <div
              key={rule.num}
              className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Rule {rule.num}: {rule.title}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  LOCKED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                {rule.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Deterministic Engine: Active</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
