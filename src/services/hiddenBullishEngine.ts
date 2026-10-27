import {
  Candle,
  CoinScanReport,
  HiddenBullishSetup,
  RejectionDetail,
  SpotSymbolInfo,
  Ticker24h,
} from '../types/scanner';

/**
 * Calculate Wilder's 14-period RSI for a series of candles.
 * Handles the live forming candle at the end of the array.
 */
export function calculateRsiSeries(candles: Candle[], period: number = 14): (number | null)[] {
  const rsiValues: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return rsiValues;

  let gains = 0;
  let losses = 0;

  // First period
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    rsiValues[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiValues[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent candles smoothed with Wilder's technique
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsiValues;
}

export interface EngineConfig {
  minCandleDistance: number; // 6
  maxCandleDistance: number; // 19 (strictly 6 to 19 candles, ideal <= 18)
  minRsi: number; // 30.00
  maxRsi: number; // 40.00
  lowerWickTolerancePct: number; // 1.5%
  maxChasePricePct: number; // 1.2%
  min24hVolumeUsdt: number; // 50,000
  minTradesCount: number; // 150
  maxDailyPumpPct: number; // 35%
  maxDailyDumpPct: number; // -35%
  strictZeroTouch: boolean; // true
}

export const DEFAULT_CONFIG: EngineConfig = {
  minCandleDistance: 6,
  maxCandleDistance: 19,
  minRsi: 30.0,
  maxRsi: 40.0,
  lowerWickTolerancePct: 1.5,
  maxChasePricePct: 1.2,
  min24hVolumeUsdt: 50000,
  minTradesCount: 150,
  maxDailyPumpPct: 35,
  maxDailyDumpPct: -35,
  strictZeroTouch: true,
};

/**
 * Evaluates coin health, age, monitoring tags, volume, and scam indicators.
 */
export function evaluateCoinHealthAndFilters(
  ticker: Ticker24h,
  symbolInfo?: SpotSymbolInfo,
  coinAgeMonths: number = 12,
  config: EngineConfig = DEFAULT_CONFIG
): RejectionDetail[] {
  const rejections: RejectionDetail[] = [];

  // 1. Coin Age Filter (Mandatory: >= 6 months)
  if (coinAgeMonths < 6) {
    rejections.push({
      code: 'COIN_AGE_UNDER_6_MONTHS',
      reason: `Coin age is ${coinAgeMonths.toFixed(1)} months (Mandatory >= 6 months required)`,
      value: coinAgeMonths,
      expected: '>= 6 months',
    });
  }

  // 2. Monitoring & Caution Tags (Excludes only genuine monitoring / delisting tags)
  if (symbolInfo?.tags) {
    const monitoringTags = symbolInfo.tags.filter((t) => {
      const lower = t.toLowerCase();
      return (
        lower.includes('monitoring') ||
        lower.includes('caution') ||
        lower.includes('delist') ||
        lower.includes('warning')
      );
    });
    if (monitoringTags.length > 0) {
      rejections.push({
        code: 'MONITORING_OR_RISK_TAG',
        reason: `Coin has risk/monitoring tags: ${monitoringTags.join(', ')}`,
        value: monitoringTags.join(', '),
      });
    }
  }

  // 3. Delisting Risk
  if (symbolInfo && symbolInfo.status !== 'TRADING') {
    rejections.push({
      code: 'DELISTING_RISK',
      reason: `Coin status is ${symbolInfo.status} (Not active TRADING status)`,
      value: symbolInfo.status,
    });
  }

  // 4. Parabolic Pump or Severe Collapse
  if (ticker.priceChangePercent > config.maxDailyPumpPct) {
    rejections.push({
      code: 'EXCESSIVE_PUMP',
      reason: `Coin is excessively pumped (+${ticker.priceChangePercent.toFixed(1)}% in 24h, max +${config.maxDailyPumpPct}%)`,
      value: ticker.priceChangePercent,
    });
  }
  if (ticker.priceChangePercent < config.maxDailyDumpPct) {
    rejections.push({
      code: 'EXCESSIVE_BEARISH_COLLAPSE',
      reason: `Coin is collapsing / falling knife (${ticker.priceChangePercent.toFixed(1)}% in 24h, min ${config.maxDailyDumpPct}%)`,
      value: ticker.priceChangePercent,
    });
  }

  // 5. Stagnant / Inactive Movement (capable of healthy ~2-3% daily movement)
  const highLowRangePct =
    ticker.lowPrice > 0 ? ((ticker.highPrice - ticker.lowPrice) / ticker.lowPrice) * 100 : 0;
  if (highLowRangePct < 1.0) {
    rejections.push({
      code: 'STAGNANT_MOMENTUM',
      reason: `Coin has stagnant 24h range of only ${highLowRangePct.toFixed(2)}% (Requires healthy ~2-3% movement)`,
      value: highLowRangePct,
    });
  }

  // 6. Healthy Volume & Liquidity
  if (ticker.quoteVolume < config.min24hVolumeUsdt) {
    rejections.push({
      code: 'LOW_VOLUME',
      reason: `24h volume is $${(ticker.quoteVolume / 1000).toFixed(0)}k (Minimum $${(config.min24hVolumeUsdt / 1000).toFixed(0)}k USDT required)`,
      value: ticker.quoteVolume,
    });
  }

  // 7. Scam / Wash Trading Detection
  if (ticker.count < config.minTradesCount) {
    rejections.push({
      code: 'SUSPICIOUS_VOLUME_OR_WASH',
      reason: `24h trades count is only ${ticker.count} (Minimum ${config.minTradesCount} real trades required)`,
      value: ticker.count,
    });
  }

  // Check average trade size abnormality (huge volume with very few trades = wash trading)
  if (ticker.count > 0 && ticker.quoteVolume > 0) {
    const avgTradeUsdt = ticker.quoteVolume / ticker.count;
    if (avgTradeUsdt > 25000 && ticker.count < 3500) {
      rejections.push({
        code: 'SUSPICIOUS_VOLUME_OR_WASH',
        reason: `Abnormal wash-volume profile: avg trade size $${avgTradeUsdt.toFixed(0)} with low participation`,
      });
    }
  }

  // Spread check
  if (ticker.bidPrice > 0 && ticker.askPrice > 0) {
    const spreadPct = ((ticker.askPrice - ticker.bidPrice) / ticker.bidPrice) * 100;
    if (spreadPct > 0.65) {
      rejections.push({
        code: 'INSUFFICIENT_LIQUIDITY',
        reason: `Spread is ${spreadPct.toFixed(2)}% (Insufficient real spot liquidity, max 0.65%)`,
        value: spreadPct,
      });
    }
  }

  return rejections;
}

/**
 * Strict evaluation of the 1H Hidden Bullish Price & RSI pattern.
 */
export function evaluateHiddenBullishSetup(
  symbol: string,
  candles: Candle[],
  ticker: Ticker24h,
  symbolInfo?: SpotSymbolInfo,
  coinAgeMonths: number = 12,
  config: EngineConfig = DEFAULT_CONFIG
): CoinScanReport {
  const scannedAt = Date.now();
  const allRejections: RejectionDetail[] = [];

  // 1. Preliminary coin health filters
  const healthRejections = evaluateCoinHealthAndFilters(
    ticker,
    symbolInfo,
    coinAgeMonths,
    config
  );
  allRejections.push(...healthRejections);

  // Require at least 26 candles for reliable RSI 14 and pattern distance up to 19
  if (candles.length < 26) {
    allRejections.push({
      code: 'RSI_UNAVAILABLE',
      reason: `Insufficient 1H candles (${candles.length} loaded, minimum 26 required for up to 19-candle distance)`,
    });
    return {
      symbol,
      passed: false,
      allRejections,
      primaryRejection: allRejections[0],
      ticker,
      scannedAt,
    };
  }

  // 2. Compute 1H RSI series
  const rsiSeries = calculateRsiSeries(candles, 14);
  const liveIdx = candles.length - 1;
  const livePrice = candles[liveIdx].close;
  const currentLive1hRsi = rsiSeries[liveIdx];

  // Search candidate Point 2 (c2):
  // Can be current live forming candle (len - 1), or immediately preceding closed candles (len - 2, len - 3, len - 4)
  // as long as current price is still at fresh entry zone (not chased, support holding).
  const candidateC2Indices: number[] = [liveIdx];
  if (candles.length >= 28) {
    candidateC2Indices.push(liveIdx - 1);
    candidateC2Indices.push(liveIdx - 2);
  }
  if (candles.length >= 32) {
    candidateC2Indices.push(liveIdx - 3);
  }

  let bestSetup: HiddenBullishSetup | null = null;
  const candidateRejections: RejectionDetail[] = [];
  let evaluatedC2Rsi: number | undefined = undefined;

  for (const c2Idx of candidateC2Indices) {
    const c2Candle = candles[c2Idx];
    const w2 = c2Candle.low;
    const rsi2 = rsiSeries[c2Idx];

    if (rsi2 === null || isNaN(rsi2)) continue;
    if (evaluatedC2Rsi === undefined) evaluatedC2Rsi = rsi2;

    // Strict RSI Rule: 30.00 <= RSI <= 40.00 at Point 2
    if (rsi2 < config.minRsi || rsi2 > config.maxRsi) {
      candidateRejections.push({
        code: 'RSI_OUT_OF_RANGE',
        reason: `1H RSI at candle [${c2Idx === liveIdx ? 'Live' : `-${liveIdx - c2Idx}`}] is ${rsi2.toFixed(2)} (Strictly must be between ${config.minRsi.toFixed(2)} and ${config.maxRsi.toFixed(2)})`,
        value: rsi2.toFixed(2),
        expected: '30.00 - 40.00',
      });
      continue;
    }

    // Check Price Chasing & Fresh Entry:
    // Current live price must be within maxChasePricePct above w2, and must not have collapsed below w2
    const priceMoveFromWickPct = ((livePrice - w2) / w2) * 100;
    if (priceMoveFromWickPct > config.maxChasePricePct) {
      candidateRejections.push({
        code: 'PRICE_CHASE_EXCESSIVE',
        reason: `Price has moved ${priceMoveFromWickPct.toFixed(2)}% above entry wick (Max ${config.maxChasePricePct}% allowed; do not chase)`,
        value: priceMoveFromWickPct,
      });
      continue;
    }

    if (livePrice < w2 * 0.996) {
      candidateRejections.push({
        code: 'PRICE_INTERMEDIATE_WICK_TOUCH',
        reason: 'Price collapsed below second lower wick (support broken)',
      });
      continue;
    }

    // If c2 is a previous candle, verify subsequent candles haven't broken below w2
    let postSupportBroken = false;
    for (let p = c2Idx + 1; p <= liveIdx; p++) {
      if (candles[p].low < w2 * 0.997) {
        postSupportBroken = true;
        break;
      }
    }
    if (postSupportBroken) continue;

    // Search candidate Point 1 (c1) in STRICT distance [6, 19] (ideal <= 18, max 19)
    for (let distance = config.minCandleDistance; distance <= config.maxCandleDistance; distance++) {
      const c1Idx = c2Idx - distance;
      if (c1Idx < 1) continue;

      const candle1 = candles[c1Idx];
      const w1 = candle1.low;
      const rsi1 = rsiSeries[c1Idx];

      if (rsi1 === null || isNaN(rsi1)) continue;

      // Check if candle1 is a valid local pivot low
      const prevCandle = candles[c1Idx - 1];
      const nextCandle = candles[c1Idx + 1];
      const isPivotLow =
        w1 <= prevCandle.low * 1.002 || (nextCandle && w1 <= nextCandle.low * 1.002);

      if (!isPivotLow) {
        continue;
      }

      // A. Lower Wick Matching Check
      const wickDiffPct = Math.abs((w2 - w1) / w1) * 100;
      if (wickDiffPct > config.lowerWickTolerancePct) {
        candidateRejections.push({
          code: 'LOWER_WICK_MISMATCH',
          reason: `Lower wick difference ${wickDiffPct.toFixed(2)}% exceeds strict tolerance of ${config.lowerWickTolerancePct}%`,
          value: wickDiffPct,
        });
        continue;
      }

      // B. Direction: Ascending -> Descending
      // Must have a clear upward peak between c1 and c2
      let peakPrice = -Infinity;
      let peakIdx = -1;
      for (let k = c1Idx + 1; k < c2Idx; k++) {
        if (candles[k].high > peakPrice) {
          peakPrice = candles[k].high;
          peakIdx = k;
        }
      }

      const minRequiredPeakRise = Math.max(w1, w2) * 1.0035; // At least +0.35% higher than wicks
      if (peakPrice < minRequiredPeakRise || peakIdx <= c1Idx || peakIdx >= c2Idx) {
        candidateRejections.push({
          code: 'WRONG_DIRECTION',
          reason: 'Missing clear Ascending -> Descending structure between points',
        });
        continue;
      }

      // C. Strict Price Trendline Zero-Touch Rule
      // Line: T(k) = w1 + ((k - c1Idx) / (c2Idx - c1Idx)) * (w2 - w1)
      let priceZeroTouchViolated = false;
      let priceViolationReason = '';

      for (let k = c1Idx + 1; k < c2Idx; k++) {
        const tPrice = w1 + ((k - c1Idx) / (c2Idx - c1Idx)) * (w2 - w1);
        const intermediateLow = candles[k].low;
        const intermediateBodyLow = Math.min(candles[k].open, candles[k].close);

        // Check Lower Wick Touch
        if (intermediateLow <= tPrice) {
          priceZeroTouchViolated = true;
          priceViolationReason = `Intermediate candle at index -${c2Idx - k} lower wick (${intermediateLow}) touched price trendline (${tPrice.toFixed(4)})`;
          break;
        }

        // Check Body Touch
        if (intermediateBodyLow <= tPrice) {
          priceZeroTouchViolated = true;
          priceViolationReason = `Intermediate candle at index -${c2Idx - k} body (${intermediateBodyLow}) touched price trendline (${tPrice.toFixed(4)})`;
          break;
        }
      }

      if (priceZeroTouchViolated) {
        candidateRejections.push({
          code: 'PRICE_INTERMEDIATE_WICK_TOUCH',
          reason: priceViolationReason,
        });
        continue;
      }

      // D. Strict RSI Structure & Zero-Touch Rule
      // Point 1 RSI in lower accumulation zone
      if (rsi1 < 25.0 || rsi1 > 52.0) {
        candidateRejections.push({
          code: 'RSI_OUT_OF_RANGE',
          reason: `Point 1 RSI is ${rsi1.toFixed(1)} (Must be between 25.0 and 52.0 accumulation range)`,
        });
        continue;
      }

      // Trendline on RSI: R(k) = rsi1 + ((k - c1Idx) / (c2Idx - c1Idx)) * (rsi2 - rsi1)
      let rsiZeroTouchViolated = false;
      let rsiViolationReason = '';

      for (let k = c1Idx + 1; k < c2Idx; k++) {
        const kRsi = rsiSeries[k];
        if (kRsi === null) continue;
        const tRsi = rsi1 + ((k - c1Idx) / (c2Idx - c1Idx)) * (rsi2 - rsi1);

        // Intermediate RSI must stay clean and above the baseline trendline (with 1.0 buffer)
        if (kRsi < Math.min(tRsi, Math.min(rsi1, rsi2)) - 1.2) {
          rsiZeroTouchViolated = true;
          rsiViolationReason = `Intermediate 1H RSI at candle -${c2Idx - k} (${kRsi.toFixed(1)}) fell below RSI baseline`;
          break;
        }
      }

      if (rsiZeroTouchViolated) {
        candidateRejections.push({
          code: 'RSI_INTERMEDIATE_TOUCH',
          reason: rsiViolationReason,
        });
        continue;
      }

      // ALL MANDATORY RULES ARE SATISFIED FOR 100% STRICT CONFIRMED!
      const baseAsset = symbol.replace('USDT', '');
      const entryPrice = livePrice;
      const targetPrice = entryPrice * 1.01; // Strict 1% spot scalp target
      const spreadPct =
        ticker.bidPrice > 0 ? ((ticker.askPrice - ticker.bidPrice) / ticker.bidPrice) * 100 : 0.05;

      bestSetup = {
        symbol,
        baseAsset,
        tier: 'CONFIRMED_LIVE',
        livePrice,
        live1hRsi: Number(rsi2.toFixed(2)),
        tradingViewUrl: `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`,

        candle1Index: c1Idx,
        candle1Time: candle1.openTime,
        firstLowerWickPrice: w1,
        rsi1Value: Number(rsi1.toFixed(2)),

        candle2Index: c2Idx,
        candle2Time: c2Candle.openTime,
        secondLowerWickPrice: w2,
        rsi2Value: Number(rsi2.toFixed(2)),

        candleDistance: distance,
        lowerWickMatchStatus: wickDiffPct <= 0.25 ? 'EXACT' : 'WITHIN_TOLERANCE',
        lowerWickDiffPct: Number(wickDiffPct.toFixed(3)),
        priceTrendlineStatus: 'CLEAN',
        rsiStructureStatus: 'EXACT',
        rsiTrendlineStatus: 'CLEAN',
        directionStatus: 'ASCENDING_TO_DESCENDING',

        volumeStatus: ticker.quoteVolume >= 800000 ? 'HEALTHY' : 'WEAK',
        volume24hUsdt: ticker.quoteVolume,
        trades24h: ticker.count,

        liquidityStatus: spreadPct <= 0.25 ? 'SUFFICIENT' : 'INSUFFICIENT',
        spreadPct: Number(spreadPct.toFixed(3)),

        coinHealthStatus: 'HEALTHY',
        coinAgeMonths: Number(coinAgeMonths.toFixed(1)),
        monitoringTag: false,
        delistingWarning: false,

        entryPrice,
        targetPrice,
        targetPct: 1.0,
        riskStatus: 'STRICT_PASS',
        signalStatus: 'LIVE ENTRY',
        qualificationReason: `Distance ${distance} 1H candles (Strict 6–19 window, ideal <= 18); Lower Wicks matched (${wickDiffPct.toFixed(2)}% diff); 1H RSI ${rsi2.toFixed(1)} in [30-40]; Clean zero-touch price & RSI rays; Fresh entry`,

        priceTrendlineSlope: (w2 - w1) / distance,
        rsiTrendlineSlope: (rsi2 - rsi1) / distance,
        intermediatePeakPrice: peakPrice,
        intermediatePeakIndex: peakIdx,

        candles: candles.slice(-35),
        rsiSeries: rsiSeries.slice(-35),

        detectedAt: Date.now(),
        isLiveForming: c2Idx === liveIdx,
      };

      break; // Found setup for this c2
    }

    if (bestSetup) break; // Found overall best setup
  }

  // If no candidate passed
  // If no candidate passed
  const reportedRsi = evaluatedC2Rsi ?? currentLive1hRsi ?? undefined;

  if (!bestSetup) {
    if (candidateRejections.length > 0) {
      allRejections.push(...candidateRejections);
    } else {
      allRejections.push({
        code: 'NO_PIVOT_LOW_FOUND',
        reason: 'No matching lower-wick structure found in the 6–19 candle window (ideal <= 18, max 19)',
      });
    }

    return {
      symbol,
      passed: false,
      allRejections,
      primaryRejection: allRejections[0],
      ticker,
      live1hRsi: reportedRsi,
      scannedAt,
    };
  }

  // Check if any fatal health rejections exist (monitoring tag, delisting risk, under 6 months)
  const fatalHealth = healthRejections.filter(
    (r) =>
      r.code === 'MONITORING_OR_RISK_TAG' ||
      r.code === 'DELISTING_RISK' ||
      r.code === 'COIN_AGE_UNDER_6_MONTHS'
  );

  if (fatalHealth.length > 0) {
    return {
      symbol,
      passed: false,
      allRejections,
      primaryRejection: fatalHealth[0],
      ticker,
      live1hRsi: reportedRsi,
      scannedAt,
    };
  }

  return {
    symbol,
    passed: true,
    setup: bestSetup,
    allRejections: [],
    ticker,
    live1hRsi: bestSetup.rsi2Value,
    scannedAt,
  };
}
