import React from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  RefreshCw,
  BookOpen,
  Image as ImageIcon,
  ShieldCheck,
  Radio,
  Share2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { soundService } from '../services/sound';

interface NavbarProps {
  isScanning: boolean;
  onRefresh: () => void;
  nextScanSeconds: number;
  refreshInterval: number;
  onSelectInterval: (seconds: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenReference: () => void;
  stats: {
    totalCoins: number;
    qualifiedCount: number;
    rsiInRangeCount: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  isScanning,
  onRefresh,
  nextScanSeconds,
  refreshInterval,
  onSelectInterval,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenReference,
  stats,
}) => {
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard?.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        // Fallback
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const formatCountdown = (secs: number) => {
    if (isScanning) return 'Scanning Spot Coins...';
    if (refreshInterval === 0) return 'Manual Mode';
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins > 0) return `${mins}m ${remSecs.toString().padStart(2, '0')}s`;
    return `${remSecs}s`;
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Core Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-extrabold text-white tracking-wide">
                HIDDEN BULLISH
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                STRICT SPOT SCANNER
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                {isScanning ? 'SCANNING SPOT PAIRS...' : '1H ENGINE ACTIVE'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">Next deep scan: {formatCountdown(nextScanSeconds)}</span>
              <span aria-hidden="true">·</span>
              <select
                value={refreshInterval}
                onChange={(e) => onSelectInterval(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-800 text-[11px] text-cyan-400 rounded px-1.5 py-0.5 focus:outline-none"
                title="Auto-refresh scan interval"
              >
                <option value={60}>Auto: 1 min (Active)</option>
                <option value={120}>Auto: 2 min</option>
                <option value={300}>Auto: 5 min</option>
                <option value={600}>Auto: 10 min</option>
                <option value={0}>Manual Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-slate-500">Evaluated:</span>{' '}
            <span className="text-white font-bold">{stats.totalCoins}</span>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-slate-500">1H RSI [30-40]:</span>{' '}
            <span className="text-cyan-400 font-bold">{stats.rsiInRangeCount}</span>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 border border-emerald-900/60 rounded-lg">
            <span className="text-slate-500">Live Setups:</span>{' '}
            <span className="text-emerald-400 font-bold">{stats.qualifiedCount}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Reference Modal Trigger */}
          <button
            onClick={onOpenReference}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
            title="View TradingView Master Reference Screenshot (HYPER/USDT)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">User Reference</span>
          </button>

          {/* Rules Constitution Trigger */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
            title="View Strict Master Rules Constitution"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">22 Strict Rules</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Live Audio Alerts Enabled' : 'Live Audio Alerts Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Copy / Share Link Trigger */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-mono transition-all ${
              copiedLink
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
            }`}
            title="Copy app link to clipboard"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          {/* Scan Now Manual Trigger */}
          <button
            onClick={onRefresh}
            disabled={isScanning}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>
    </header>
  );
};
