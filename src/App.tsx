import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  Candle,
  CoinScanReport,
  HiddenBullishSetup,
  ScannerStats,
  Ticker24h,
} from './types/scanner';
import {
  getAll24hTickers,
  getSpotExchangeInfo,
  get1hKlines,
  getCoinAgeMonths,
  globalMarketStats,
} from './services/binanceApi';
import {
  evaluateHiddenBullishSetup,
  DEFAULT_CONFIG,
  EngineConfig,
  calculateRsiSeries,
} from './services/hiddenBullishEngine';
import { Navbar } from './components/Navbar';
import { SignalCard } from './components/SignalCard';
import { InteractiveChart } from './components/InteractiveChart';
import { RejectionInspector } from './components/RejectionInspector';
import { ReferenceExampleModal } from './components/ReferenceExampleModal';
import { StrictRulesDrawer } from './components/StrictRulesDrawer';
import { SpotCalculator } from './components/SpotCalculator';
import { soundService } from './services/sound';
import { generateHyperSampleData } from './services/sampleData';

const initialHyper = generateHyperSampleData();

export default function App() {
  // Engine State
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_CONFIG);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanCycle, setScanCycle] = useState<number>(0);
  const [refreshInterval, setRefreshInterval] = useState<number>(300); // 5 minutes default (300 seconds)
  const [nextScanSeconds, setNextScanSeconds] = useState<number>(300);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Results
  const [qualifiedSetups, setQualifiedSetups] = useState<HiddenBullishSetup[]>([]);
  const [scanReports, setScanReports] = useState<CoinScanReport[]>([]);
  const [selectedSetup, setSelectedSetup] = useState<HiddenBullishSetup | null>(initialHyper.setup);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    currentSymbol: string;
  }>({
    current: 0,
    total: 0,
    currentSymbol: '',
  });

  // Inspector Chart State for any selected coin (initialized immediately with sample data)
  const [inspectedSymbol, setInspectedSymbol] = useState<string>('HYPERUSDT');
  const [inspectedCandles, setInspectedCandles] = useState<Candle[]>(initialHyper.candles);
  const [inspectedRsiSeries, setInspectedRsiSeries] = useState<(number | null)[]>(
    calculateRsiSeries(initialHyper.candles, 14)
  );
  const [inspectedSetup, setInspectedSetup] = useState<HiddenBullishSetup | null>(initialHyper.setup);

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calculatorSetup, setCalculatorSetup] = useState<HiddenBullishSetup | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [showRejectionAudit, setShowRejectionAudit] = useState<boolean>(false);

  // Live Stats
  const [stats, setStats] = useState<ScannerStats>({
    totalSpotCoins: 0,
    eligibleAfterFilters: 0,
    rsiInRangeCount: 0,
    qualifiedLiveSetups: 0,
    lastScanDurationMs: 0,
    lastScanTimestamp: 0,
    scanCycle: 0,
    isScanning: false,
  });

  const scanLockRef = useRef<boolean>(false);

  // Load candles and inspect a specific coin
  const inspectCoin = useCallback(
    async (symbol: string, existingSetup?: HiddenBullishSetup | null) => {
      setInspectedSymbol(symbol);
      try {
        const candles = await get1hKlines(symbol, 60);
        if (candles.length > 0) {
          const rsi = calculateRsiSeries(candles, 14);
          setInspectedCandles(candles);
          setInspectedRsiSeries(rsi);

          if (existingSetup) {
            setInspectedSetup(existingSetup);
          } else {
            // Check if there's a setup or report
            const report = scanReports.find((r) => r.symbol === symbol);
            if (report?.setup) {
              setInspectedSetup(report.setup);
            } else if (symbol === 'HYPERUSDT') {
              setInspectedSetup(initialHyper.setup);
            } else {
              setInspectedSetup(null);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to inspect ${symbol}:`, err);
      }
    },
    [scanReports]
  );

  // Core Scanning Routine with Parallel Batches across 120+ coins
  const runScanCycle = useCallback(async () => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setIsScanning(true);
    const startTime = Date.now();

    try {
      // 1. Fetch Spot Exchange Info and 24h Tickers
      const [exchangeInfoMap, allTickers] = await Promise.all([
        getSpotExchangeInfo(),
        getAll24hTickers(),
      ]);

      // 2. Pre-filter Spot Candidates
      // Real spot pairs with minimum volume of $50k and at least 250 trades
      const eligibleTickers = allTickers
        .filter((t) => {
          if (!t.symbol.endsWith('USDT')) return false;

          const info = exchangeInfoMap[t.symbol];
          if (info?.tags) {
            const hasRiskTag = info.tags.some((tag) => {
              const lower = tag.toLowerCase();
              return (
                lower.includes('monitoring') ||
                lower.includes('caution') ||
                lower.includes('delist') ||
                lower.includes('warning')
              );
            });
            if (hasRiskTag) return false;
          }

          if (t.quoteVolume < config.min24hVolumeUsdt) return false;
          if (t.count < config.minTradesCount) return false;
          if (t.priceChangePercent > config.maxDailyPumpPct || t.priceChangePercent < config.maxDailyDumpPct) return false;

          return true;
        })
        .sort((a, b) => b.quoteVolume - a.quoteVolume);

      // Deep scan all eligible spot coins across Binance market (up to 450+ pairs)
      const topSymbols = Array.from(
        new Set(['HYPERUSDT', ...eligibleTickers.map((t) => t.symbol)])
      );

      setScanProgress({
        current: 0,
        total: topSymbols.length,
        currentSymbol: 'Starting Deep Market Scan...',
      });

      const reports: CoinScanReport[] = [];
      const validSetups: HiddenBullishSetup[] = [];
      let rsiInRangeCounter = 0;

      // Rate-safe concurrency of 12 requests per chunk with 45ms pause between batches
      const CHUNK_SIZE = 12;
      for (let i = 0; i < topSymbols.length; i += CHUNK_SIZE) {
        const chunk = topSymbols.slice(i, i + CHUNK_SIZE);
        setScanProgress({
          current: Math.min(i + chunk.length, topSymbols.length),
          total: topSymbols.length,
          currentSymbol: chunk[0] || 'Analyzing...',
        });

        const chunkResults = await Promise.allSettled(
          chunk.map(async (symbol) => {
            const ticker = allTickers.find((t) => t.symbol === symbol);
            if (!ticker) return null;

            const info = exchangeInfoMap[symbol];
            const ageMonths = await getCoinAgeMonths(symbol, info?.onboardDate);
            const candles = await get1hKlines(symbol, 60);

            if (candles.length < 20) return null;

            const report = evaluateHiddenBullishSetup(
              symbol,
              candles,
              ticker,
              info,
              ageMonths,
              config
            );

            return report;
          })
        );

        for (const res of chunkResults) {
          if (res.status === 'fulfilled' && res.value) {
            const report = res.value;
            reports.push(report);

            if (
              report.live1hRsi !== undefined &&
              report.live1hRsi >= config.minRsi &&
              report.live1hRsi <= config.maxRsi
            ) {
              rsiInRangeCounter++;
            }

            if (report.passed && report.setup) {
              validSetups.push(report.setup);
            }
          }
        }

        // PROGRESSIVE UPDATE: Update UI immediately as coins are found!
        if (validSetups.length > 0) {
          const sorted = [...validSetups].sort((a, b) => {
            if (a.tier === 'CONFIRMED_LIVE' && b.tier !== 'CONFIRMED_LIVE') return -1;
            if (b.tier === 'CONFIRMED_LIVE' && a.tier !== 'CONFIRMED_LIVE') return 1;
            return b.volume24hUsdt - a.volume24hUsdt;
          });
          setQualifiedSetups(sorted);
          setScanReports([...reports]);
        }

        // Smooth 45ms pause between chunks to protect IP weight
        await new Promise((resolve) => setTimeout(resolve, 45));
      }

      // Sort setups: Confirmed live first, then highest volume
      validSetups.sort((a, b) => {
        if (a.tier === 'CONFIRMED_LIVE' && b.tier !== 'CONFIRMED_LIVE') return -1;
        if (b.tier === 'CONFIRMED_LIVE' && a.tier !== 'CONFIRMED_LIVE') return 1;
        return b.volume24hUsdt - a.volume24hUsdt;
      });

      // Update state
      setQualifiedSetups(validSetups);
      setScanReports(reports);
      setScanProgress({
        current: topSymbols.length,
        total: topSymbols.length,
        currentSymbol: 'Scan Complete',
      });

      if (validSetups.length > 0) {
        soundService.playSignalChime();
        if (!selectedSetup) {
          setSelectedSetup(validSetups[0]);
          inspectCoin(validSetups[0].symbol, validSetups[0]);
        }
      } else {
        if (inspectedCandles.length === 0) {
          inspectCoin('HYPERUSDT');
        }
      }

      const duration = Date.now() - startTime;
      setStats({
        totalSpotCoins: globalMarketStats.totalMarketPairs,
        eligibleAfterFilters: eligibleTickers.length,
        rsiInRangeCount: rsiInRangeCounter,
        qualifiedLiveSetups: validSetups.length,
        lastScanDurationMs: duration,
        lastScanTimestamp: Date.now(),
        scanCycle: scanCycle + 1,
        isScanning: false,
      });

      setScanCycle((c) => c + 1);
    } catch (err) {
      console.error('Scan cycle encountered an error:', err);
    } finally {
      setIsScanning(false);
      scanLockRef.current = false;
      if (refreshInterval > 0) {
        setNextScanSeconds(refreshInterval);
      }
    }
  }, [config, scanCycle, selectedSetup, inspectedCandles.length, inspectCoin, refreshInterval]);

  // Initial scan on mount
  useEffect(() => {
    runScanCycle();
  }, []);

  // Countdown timer for automatic scanning (e.g. 5m / 300 seconds)
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      setNextScanSeconds((prev) => {
        if (prev <= 1) {
          runScanCycle();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [runScanCycle, refreshInterval]);

  // Audio toggle handler
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundService.enabled = nextState;
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        isScanning={isScanning}
        onRefresh={runScanCycle}
        nextScanSeconds={nextScanSeconds}
        refreshInterval={refreshInterval}
        onSelectInterval={(val) => {
          setRefreshInterval(val);
          setNextScanSeconds(val);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenReference={() => setIsReferenceOpen(true)}
        stats={{
          totalCoins: stats.totalSpotCoins,
          qualifiedCount: qualifiedSetups.length,
          rsiInRangeCount: stats.rsiInRangeCount,
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Strict Engine Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-wide">
                  STRICT LIVE SPOT-CRYPTO SCANNER
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AUTO SCAN: {refreshInterval > 0 ? `${Math.floor(refreshInterval / 60)} MINUTES` : 'MANUAL'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5 font-mono">
                <span>RSI 30.00–40.00 Radar</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-bold">6–19 Candles (Max 19, Ideal ≤18)</span>
                <span aria-hidden="true">·</span>
                <span>Direct TradingView Launch</span>
                <span aria-hidden="true">·</span>
                <span>Top Spot Pairs Evaluated</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showConfigPanel ? 'Hide Tolerances' : 'Engine Tolerances'}</span>
            </button>
          </div>
        </div>

        {/* Live Active Scanning Progress Bar */}
        {isScanning && scanProgress.total > 0 && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-2 shadow-xl shadow-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-emerald-300 font-bold">DEEP SCANNING SPOT COINS:</span>
                <span className="text-white font-extrabold">{scanProgress.current} / {scanProgress.total}</span>
                <span className="text-slate-400">({Math.round((scanProgress.current / scanProgress.total) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>
                  Current: <span className="text-cyan-400 font-bold">{scanProgress.currentSymbol}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Strict Setups Found:{' '}
                  <span className="text-emerald-400 font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                    {qualifiedSetups.length}
                  </span>
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-500 transition-all duration-200 rounded-full"
                style={{ width: `${Math.max(4, Math.round((scanProgress.current / scanProgress.total) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Engine Tolerances Drawer / Panel */}
        {showConfigPanel && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Deterministic Engine Parameters
              </span>
              <span className="text-slate-500 text-[11px]">Strict Compliance Guardrails</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] block">
                  Lower Wick Matching Tolerance ({config.lowerWickTolerancePct}%)
                </label>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={config.lowerWickTolerancePct}
                  onChange={(e) =>
                    setConfig({ ...config, lowerWickTolerancePct: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Exact (0.10%)</span>
                  <span>Standard ({config.lowerWickTolerancePct}%)</span>
                  <span>0.80%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] block">
                  Do Not Chase Threshold ({config.maxChasePricePct}%)
                </label>
                <input
                  type="range"
                  min="0.20"
                  max="1.00"
                  step="0.05"
                  value={config.maxChasePricePct}
                  onChange={(e) =>
                    setConfig({ ...config, maxChasePricePct: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Fresh (0.20%)</span>
                  <span>Max Allowed ({config.maxChasePricePct}%)</span>
                  <span>1.00%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] block">
                  Min 24h Spot Volume (${(config.min24hVolumeUsdt / 1000).toFixed(0)}k)
                </label>
                <input
                  type="range"
                  min="100000"
                  max="2000000"
                  step="100000"
                  value={config.min24hVolumeUsdt}
                  onChange={(e) =>
                    setConfig({ ...config, min24hVolumeUsdt: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>$100k Wide</span>
                  <span>${(config.min24hVolumeUsdt / 1000).toFixed(0)}k</span>
                  <span>$2M High Depth</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="text-emerald-400">
                Timeframe: STRICT 1H LOCKED · 1H RSI: 30.00–40.00 LOCKED · Distance: 6–19 CANDLES (IDEAL ≤18)
              </span>
              <button
                onClick={() => setConfig(DEFAULT_CONFIG)}
                className="text-cyan-400 hover:underline"
              >
                Reset to Master Defaults
              </button>
            </div>
          </div>
        )}

        {/* Strictly Verified Signals Section */}
        {qualifiedSetups.length === 0 ? (
          <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-mono font-extrabold text-white tracking-wide">
                NO 100% ZERO-TOUCH HIDDEN BULLISH SETUP RIGHT NOW
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
                Screened <strong className="text-white">{stats.totalSpotCoins.toLocaleString()}</strong> spot crypto pairs across Binance, Gate.io, and MEXC. Zero-Touch rule is strictly active: No intermediate candle body and no intermediate lower wick is allowed to touch the trendline. Next scan in {Math.floor(nextScanSeconds / 60)}m {nextScanSeconds % 60}s.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Zero-Touch Guard Active
              </span>
              <span aria-hidden="true">·</span>
              <span>Screened {stats.totalSpotCoins.toLocaleString()} Pairs</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-base font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                STRICT 100% ZERO-TOUCH HIDDEN BULLISH SIGNALS ({qualifiedSetups.length})
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ZERO INTERMEDIATE WICK TOUCH · EXACT LOWER-WICK MATCH · +1% QUICK TP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualifiedSetups.map((setup) => (
                <SignalCard
                  key={setup.symbol}
                  setup={setup}
                  isSelected={inspectedSymbol === setup.symbol}
                  onSelect={() => inspectCoin(setup.symbol, setup)}
                  onOpenCalculator={(s) => {
                    setCalculatorSetup(s);
                    setIsCalculatorOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Candlestick & RSI Chart Inspector */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Live 1H Candlestick & RSI Structure Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Visualizing 1H lower wicks, linear zero-touch clearance rays, and 1% take profit target
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-500">Inspect Pair:</span>
              {['HYPERUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => inspectCoin(sym)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    inspectedSymbol === sym
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sym.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>

          <InteractiveChart
            symbol={inspectedSymbol}
            candles={inspectedCandles}
            rsiSeries={inspectedRsiSeries}
            setup={inspectedSetup}
          />
        </div>

        {/* Diagnostic Audit Toggle (Keeps Mismatched / Non-qualifying Coins Off Main Screen) */}
        <div className="pt-2">
          <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
            <button
              onClick={() => setShowRejectionAudit(!showRejectionAudit)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {showRejectionAudit
                  ? 'Hide Audit Diagnostics Log'
                  : `Show Audit Diagnostics Log (${scanReports.length} Checked)`}
              </span>
            </button>
            <span className="text-[11px] font-mono text-emerald-400">
              ✓ Only 100% Strict Verified Coins Displayed Above
            </span>
          </div>

          {showRejectionAudit && (
            <div className="mt-4">
              <RejectionInspector
                reports={scanReports}
                selectedSymbol={inspectedSymbol}
                onInspectCoin={(sym) => inspectCoin(sym)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span>HIDDEN BULLISH SPOT SCANNER</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Touch Mathematical Verification</span>
          <span aria-hidden="true">·</span>
          <span>Binance Spot Public Market Data</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <button onClick={() => setIsReferenceOpen(true)} className="hover:text-cyan-400">
            Attachment Reference
          </button>
          <span aria-hidden="true">·</span>
          <button onClick={() => setIsRulesOpen(true)} className="hover:text-emerald-400">
            Rules Constitution
          </button>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ReferenceExampleModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onLoadHyperUsdt={() => inspectCoin('HYPERUSDT')}
      />

      <StrictRulesDrawer
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <SpotCalculator
        setup={calculatorSetup || selectedSetup || qualifiedSetups[0] || inspectedSetup}
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}
