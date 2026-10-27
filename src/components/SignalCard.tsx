import React from 'react';
import { ArrowUpRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { HiddenBullishSetup } from '../types/scanner';

interface SignalCardProps {
  setup: HiddenBullishSetup;
  isSelected: boolean;
  onSelect: () => void;
  onOpenCalculator: (setup: HiddenBullishSetup) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  setup,
  isSelected,
  onSelect,
  onOpenCalculator,
}) => {
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(5);
    return p.toFixed(7);
  };

  const [copied, setCopied] = React.useState(false);

  const handleCopyTvSymbol = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`BINANCE:${setup.symbol}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTierBadge = () => {
    if (setup.tier === 'CONFIRMED_LIVE') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 animate-pulse">
          <Zap className="w-3.5 h-3.5" />
          CONFIRMED LIVE ENTRY
        </div>
      );
    }
    if (setup.tier === 'FORMING_SETUP') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
          <Zap className="w-3.5 h-3.5" />
          FORMING HIDDEN BULLISH
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
        <Zap className="w-3.5 h-3.5" />
        1H RSI 30–40 RADAR
      </div>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`relative p-5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Live Badge & Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-400">
            {setup.baseAsset.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-white tracking-wide">
                {setup.symbol.replace('USDT', '/USDT')}
              </span>
              <button
                onClick={handleCopyTvSymbol}
                title="Copy for TradingView Search (BINANCE:SYMBOL)"
                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy TV'}
              </button>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Age: {setup.coinAgeMonths}m</span>
              <span aria-hidden="true">·</span>
              <span>24h Vol: ${(setup.volume24hUsdt / 1_000_000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          {getTierBadge()}
          <div className="text-[11px] font-mono text-slate-300 mt-1">
            STATUS: {setup.signalStatus}
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid (Matching Section 17 Output) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 text-xs font-mono">
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[11px]">Live Price</div>
          <div className="text-white text-sm font-bold mt-0.5">{formatPrice(setup.livePrice)}</div>
          <div className="text-slate-500 text-[10px]">USDT Spot</div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-emerald-900/40">
          <div className="text-slate-400 text-[11px]">LIVE 1H RSI</div>
          <div className="text-emerald-400 text-sm font-bold mt-0.5">{setup.live1hRsi}</div>
          <div className="text-emerald-500 text-[10px]">Valid Range: 30–40</div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[11px]">Candle Distance</div>
          <div className="text-cyan-400 text-sm font-bold mt-0.5">{setup.candleDistance} Candles</div>
          <div className="text-slate-500 text-[10px]">Allowed: 6–24</div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[11px]">1st Lower Wick</div>
          <div className="text-slate-200 font-bold mt-0.5">{formatPrice(setup.firstLowerWickPrice)}</div>
          <div className="text-slate-500 text-[10px]">RSI: {setup.rsi1Value}</div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[11px]">2nd (Live) Wick</div>
          <div className="text-emerald-300 font-bold mt-0.5">{formatPrice(setup.secondLowerWickPrice)}</div>
          <div className="text-slate-500 text-[10px]">Match: {setup.lowerWickMatchStatus} ({setup.lowerWickDiffPct}%)</div>
        </div>

        <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/40">
          <div className="text-emerald-300 text-[11px]">Take Profit (+1%)</div>
          <div className="text-emerald-300 text-sm font-bold mt-0.5">{formatPrice(setup.targetPrice)}</div>
          <div className="text-emerald-400 text-[10px]">Quick Scalp Target</div>
        </div>
      </div>

      {/* Compliance Rule Table */}
      <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800/80 text-[11px] font-mono space-y-1.5 text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Price Trendline</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            CLEAN (ZERO-TOUCH PASSED)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">RSI Structure & Trendline</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            EXACT · CLEAN ZERO-TOUCH
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Pattern Direction</span>
          <span className="text-emerald-400 font-semibold">ASCENDING → DESCENDING</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Volume & Liquidity</span>
          <span className="text-emerald-400 font-semibold">HEALTHY · SUFFICIENT ({setup.trades24h} trades)</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Risk & Coin Health</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            STRICT PASS (No Monitoring / Delisting)
          </span>
        </div>
      </div>

      {/* Qualification Summary Reason */}
      <div className="mt-3 text-xs text-slate-400 leading-relaxed font-sans border-t border-slate-800/60 pt-2">
        <span className="font-semibold text-slate-300">Qualification: </span>
        {setup.qualificationReason}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
        <a
          href={setup.tradingViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-[130px] py-2 px-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Open on TradingView
        </a>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCalculator(setup);
          }}
          className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          1% Scalp Calc
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-medium transition-colors"
        >
          {isSelected ? 'Viewing Chart' : 'Inspect Chart'}
        </button>
      </div>
    </div>
  );
};
