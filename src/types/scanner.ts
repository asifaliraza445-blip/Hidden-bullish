export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
  isLiveForming?: boolean;
}

export interface Ticker24h {
  symbol: string;
  priceChangePercent: number;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume: number;
  quoteVolume: number;
  count: number;
  highPrice: number;
  lowPrice: number;
}

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
  tags?: string[];
  permissions?: string[];
  onboardDate?: number;
}

export type RejectionCode =
  | 'RSI_OUT_OF_RANGE'
  | 'RSI_UNAVAILABLE'
  | 'CANDLE_DISTANCE_INVALID'
  | 'LOWER_WICK_MISMATCH'
  | 'PRICE_INTERMEDIATE_BODY_TOUCH'
  | 'PRICE_INTERMEDIATE_WICK_TOUCH'
  | 'RSI_INTERMEDIATE_TOUCH'
  | 'RSI_STRUCTURE_MISMATCH'
  | 'WRONG_DIRECTION'
  | 'EXCESSIVE_PUMP'
  | 'EXCESSIVE_BEARISH_COLLAPSE'
  | 'STAGNANT_MOMENTUM'
  | 'LOW_VOLUME'
  | 'SUSPICIOUS_VOLUME_OR_WASH'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'MONITORING_OR_RISK_TAG'
  | 'DELISTING_RISK'
  | 'COIN_AGE_UNDER_6_MONTHS'
  | 'PRICE_CHASE_EXCESSIVE'
  | 'LIVE_WICK_INVALIDATED'
  | 'NO_PIVOT_LOW_FOUND';

export interface RejectionDetail {
  code: RejectionCode;
  reason: string;
  value?: string | number;
  expected?: string | number;
  timestamp?: number;
}

export type SetupTier = 'CONFIRMED_LIVE' | 'FORMING_SETUP' | 'RSI_RADAR';

export interface HiddenBullishSetup {
  symbol: string;
  baseAsset: string;
  tier: SetupTier;
  livePrice: number;
  live1hRsi: number;
  tradingViewUrl: string;
  
  // Pivot 1
  candle1Index: number;
  candle1Time: number;
  firstLowerWickPrice: number;
  rsi1Value: number;

  // Pivot 2 (Live / Current)
  candle2Index: number;
  candle2Time: number;
  secondLowerWickPrice: number;
  rsi2Value: number;

  candleDistance: number;
  lowerWickMatchStatus: 'EXACT' | 'WITHIN_TOLERANCE' | 'FORMING';
  lowerWickDiffPct: number;
  priceTrendlineStatus: 'CLEAN' | 'VIOLATED' | 'FORMING';
  rsiStructureStatus: 'EXACT' | 'VIOLATED' | 'FORMING';
  rsiTrendlineStatus: 'CLEAN' | 'VIOLATED' | 'FORMING';
  directionStatus: 'ASCENDING_TO_DESCENDING' | 'DESCENDING_ACCUMULATION' | 'INVALID';

  volumeStatus: 'HEALTHY' | 'SUSPICIOUS' | 'WEAK';
  volume24hUsdt: number;
  trades24h: number;

  liquidityStatus: 'SUFFICIENT' | 'INSUFFICIENT';
  spreadPct: number;

  coinHealthStatus: 'HEALTHY' | 'PARABOLIC' | 'COLLAPSING' | 'STAGNANT';
  coinAgeMonths: number;
  monitoringTag: boolean;
  delistingWarning: boolean;

  entryPrice: number;
  targetPrice: number; // +1.00%
  targetPct: number; // 1.00
  riskStatus: 'STRICT_PASS' | 'CAUTION';
  signalStatus: 'LIVE ENTRY' | 'FORMING SETUP' | 'RSI 30-40 RADAR';
  qualificationReason: string;

  // Trendline slope details
  priceTrendlineSlope: number;
  rsiTrendlineSlope: number;
  intermediatePeakPrice: number;
  intermediatePeakIndex: number;

  // Recent 1H candles for visualization
  candles: Candle[];
  rsiSeries: (number | null)[];

  detectedAt: number;
  isLiveForming: boolean;
}

export interface CoinScanReport {
  symbol: string;
  passed: boolean;
  setup?: HiddenBullishSetup;
  primaryRejection?: RejectionDetail;
  allRejections: RejectionDetail[];
  ticker?: Ticker24h;
  live1hRsi?: number;
  scannedAt: number;
}

export interface ScannerStats {
  totalSpotCoins: number;
  eligibleAfterFilters: number;
  rsiInRangeCount: number;
  qualifiedLiveSetups: number;
  lastScanDurationMs: number;
  lastScanTimestamp: number;
  scanCycle: number;
  isScanning: boolean;
}
