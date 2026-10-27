import React, { useState } from 'react';
import { Search, AlertCircle, Filter, Eye } from 'lucide-react';
import { CoinScanReport, RejectionCode } from '../types/scanner';

interface RejectionInspectorProps {
  reports: CoinScanReport[];
  onInspectCoin: (symbol: string) => void;
  selectedSymbol?: string;
}

export const RejectionInspector: React.FC<RejectionInspectorProps> = ({
  reports,
  onInspectCoin,
  selectedSymbol,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCode, setFilterCode] = useState<string>('ALL');

  const filteredReports = reports.filter((r) => {
    // Search query
    if (searchTerm && !r.symbol.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Filter code
    if (filterCode === 'ALL') return true;
    if (filterCode === 'RSI') return Boolean(r.primaryRejection?.code?.includes('RSI'));
    if (filterCode === 'WICK') return Boolean(r.primaryRejection?.code?.includes('WICK'));
    if (filterCode === 'ZERO_TOUCH')
      return Boolean(
        r.primaryRejection?.code?.includes('TOUCH') ||
        r.primaryRejection?.code?.includes('INTERMEDIATE')
      );
    if (filterCode === 'HEALTH')
      return Boolean(
        r.primaryRejection?.code?.includes('PUMP') ||
        r.primaryRejection?.code?.includes('COLLAPSE') ||
        r.primaryRejection?.code?.includes('AGE') ||
        r.primaryRejection?.code?.includes('MONITORING')
      );
    if (filterCode === 'VOLUME')
      return Boolean(
        r.primaryRejection?.code?.includes('VOLUME') ||
        r.primaryRejection?.code?.includes('LIQUIDITY') ||
        r.primaryRejection?.code?.includes('WASH')
      );
    return true;
  });

  const getRejectionBadgeClass = (code?: RejectionCode) => {
    if (!code) return 'text-slate-400';
    if (code.includes('RSI')) return 'text-cyan-400';
    if (code.includes('TOUCH') || code.includes('WICK')) return 'text-amber-400';
    if (code.includes('PUMP') || code.includes('COLLAPSE')) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Scanner Diagnostic & Rejection Inspector
          </h3>
          <p className="text-xs text-slate-400">
            Internal audit trail of every evaluated spot coin with strict deterministic failure cause
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Total Logged: {reports.length}</span>
          <span aria-hidden="true">·</span>
          <span>Filtered: {filteredReports.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 my-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search coin (e.g. BTC, ETH, HYPER)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
          {[
            { id: 'ALL', label: 'All' },
            { id: 'RSI', label: 'RSI Range' },
            { id: 'WICK', label: 'Wick Mismatch' },
            { id: 'ZERO_TOUCH', label: 'Zero-Touch' },
            { id: 'HEALTH', label: 'Coin Health' },
            { id: 'VOLUME', label: 'Volume/Liquidity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCode(tab.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                filterCode === tab.id
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rejection Table */}
      <div className="overflow-x-auto max-h-[360px] border border-slate-800/80 rounded-lg">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Coin</th>
              <th className="py-2.5 px-3">24h Vol</th>
              <th className="py-2.5 px-3">24h Chg</th>
              <th className="py-2.5 px-3">Live 1H RSI</th>
              <th className="py-2.5 px-3">Primary Rejection Cause</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No coins match the current search filter
                </td>
              </tr>
            ) : (
              filteredReports.slice(0, 100).map((r) => {
                const isSelected = selectedSymbol === r.symbol;
                return (
                  <tr
                    key={r.symbol}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-slate-800/80 ring-1 ring-cyan-500/30' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                      {r.symbol.replace('USDT', '')}
                      <span className="text-slate-500 font-normal">/USDT</span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                      ${r.ticker ? (r.ticker.quoteVolume / 1_000_000).toFixed(2) : '-'}M
                    </td>
                    <td
                      className={`py-2 px-3 whitespace-nowrap ${
                        r.ticker && r.ticker.priceChangePercent >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {r.ticker
                        ? `${r.ticker.priceChangePercent >= 0 ? '+' : ''}${r.ticker.priceChangePercent.toFixed(2)}%`
                        : '-'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.live1hRsi !== undefined ? (
                        <span
                          className={
                            r.live1hRsi >= 30 && r.live1hRsi <= 40
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {r.live1hRsi.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={getRejectionBadgeClass(r.primaryRejection?.code)}>
                        {r.primaryRejection?.reason || 'Candidate did not qualify'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap space-x-1.5">
                      <a
                        href={`https://www.tradingview.com/chart/?symbol=BINANCE:${r.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[11px] font-medium transition-colors"
                        title="Open directly on TradingView"
                      >
                        TV ↗
                      </a>
                      <button
                        onClick={() => onInspectCoin(r.symbol)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
