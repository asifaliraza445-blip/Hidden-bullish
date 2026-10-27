import { Candle, HiddenBullishSetup } from '../types/scanner';
import { calculateRsiSeries } from './hiddenBullishEngine';

/**
 * High-fidelity 1H candlestick series matching the user's TradingView screenshot
 * for HYPER/USDT (Point 1 wick -> Intermediate ascent & descent -> Point 2 wick).
 */
export function generateHyperSampleData(): { candles: Candle[]; setup: HiddenBullishSetup } {
  const baseTime = Date.now() - 48 * 3600 * 1000;
  const candles: Candle[] = [];

  // Generate 48 hours of 1H candles
  // Point 1 occurs at index 30 (17 candles ago)
  // Point 2 occurs at index 46 (2 candles ago / live forming)
  // Candle distance = 16 candles (within strict 6-24 window)

  let cur = 0.0635;

  for (let i = 0; i < 48; i++) {
    const t = baseTime + i * 3600 * 1000;
    let o = cur;
    let h = cur;
    let l = cur;
    let c = cur;
    let vol = 120000 + Math.random() * 80000;

    if (i < 30) {
      cur = 0.0638 + Math.sin(i / 3) * 0.0008;
      o = cur;
      c = cur + (Math.random() - 0.5) * 0.0004;
      h = Math.max(o, c) + Math.random() * 0.0003;
      l = Math.min(o, c) - Math.random() * 0.0003;
    } else if (i === 30) {
      // Point 1: First Lower Wick at 0.06300
      o = 0.0644;
      c = 0.0636;
      h = 0.0647;
      l = 0.06300;
      vol = 350000;
    } else if (i >= 31 && i <= 36) {
      // Intermediate Ascending Wave: rallies up to ~0.0660
      const progress = (i - 30) / 6;
      cur = 0.0636 + progress * 0.0024;
      o = cur;
      c = cur + 0.0003;
      h = Math.max(o, c) + 0.0005;
      l = Math.min(o, c) - 0.0001; // Cleanly above trendline!
      vol = 240000;
    } else if (i >= 37 && i <= 44) {
      // Intermediate Descending Wave: controlled pullback
      const progress = (i - 36) / 8;
      cur = 0.0660 - progress * 0.0028;
      o = cur;
      c = cur - 0.0002;
      h = Math.max(o, c) + 0.0003;
      l = Math.min(o, c) - 0.0001; // Cleanly above trendline!
      vol = 180000;
    } else if (i === 45) {
      o = 0.0634;
      c = 0.0632;
      h = 0.0637;
      l = 0.0629;
      vol = 280000;
    } else if (i === 46) {
      // Point 2: Second Lower Wick at 0.06260 (Lower Low on price)
      o = 0.0632;
      c = 0.0631;
      h = 0.0635;
      l = 0.06260;
      vol = 420000;
    } else {
      // Current live forming candle
      o = 0.0631;
      c = 0.06325;
      h = 0.06340;
      l = 0.06295;
      vol = 150000;
    }

    candles.push({
      openTime: t,
      open: Number(o.toFixed(5)),
      high: Number(h.toFixed(5)),
      low: Number(l.toFixed(5)),
      close: Number(c.toFixed(5)),
      volume: vol,
      closeTime: t + 3599999,
      quoteVolume: vol * c,
      trades: 1200,
      isLiveForming: i === 47,
    });
  }

  const p1Time = candles[30].openTime;
  const p2Time = candles[46].openTime;
  const livePrice = candles[47].close;
  const rsiSeries = calculateRsiSeries(candles, 14);

  const setup: HiddenBullishSetup = {
    symbol: 'HYPERUSDT',
    baseAsset: 'HYPER',
    tier: 'CONFIRMED_LIVE',
    livePrice,
    live1hRsi: 38.45,
    tradingViewUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:HYPERUSDT',

    candle1Index: 30,
    candle1Time: p1Time,
    firstLowerWickPrice: 0.06300,
    rsi1Value: 33.60,

    candle2Index: 46,
    candle2Time: p2Time,
    secondLowerWickPrice: 0.06260,
    rsi2Value: 38.45,

    candleDistance: 16,
    lowerWickMatchStatus: 'EXACT',
    lowerWickDiffPct: 0.63,
    priceTrendlineStatus: 'CLEAN',
    rsiStructureStatus: 'EXACT',
    rsiTrendlineStatus: 'CLEAN',
    directionStatus: 'ASCENDING_TO_DESCENDING',

    volumeStatus: 'HEALTHY',
    volume24hUsdt: 18450000,
    trades24h: 9420,

    liquidityStatus: 'SUFFICIENT',
    spreadPct: 0.04,

    coinHealthStatus: 'HEALTHY',
    coinAgeMonths: 8.5,
    monitoringTag: false,
    delistingWarning: false,

    entryPrice: livePrice,
    targetPrice: Number((livePrice * 1.01).toFixed(5)),
    targetPct: 1.0,
    riskStatus: 'STRICT_PASS',
    signalStatus: 'LIVE ENTRY',
    qualificationReason: '16 1H candles distance; Exact lower wicks match; Live 1H RSI 38.45 in [30-40]; Clean zero-touch price & RSI corridors; Strict Spot +1% TP',

    priceTrendlineSlope: (0.06260 - 0.06300) / 16,
    rsiTrendlineSlope: (38.45 - 33.60) / 16,
    intermediatePeakPrice: 0.0660,
    intermediatePeakIndex: 34,

    candles: candles.slice(-35),
    rsiSeries: rsiSeries.slice(-35),
    detectedAt: Date.now(),
    isLiveForming: true,
  };

  return { candles, setup };
}
