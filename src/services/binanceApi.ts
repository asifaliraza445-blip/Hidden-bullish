import { Candle, SpotSymbolInfo, Ticker24h } from '../types/scanner';
import { generateHyperSampleData } from './sampleData';

const CANDIDATE_BASES = [
  'https://data-api.binance.vision/api/v3',
  'https://api1.binance.com/api/v3',
  'https://api2.binance.com/api/v3',
  'https://api3.binance.com/api/v3',
  'https://api.binance.com/api/v3',
];

let roundRobinCounter = 0;

// Helper with multi-mirror fallback, rotation, and timeout
async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
  let lastError: any = null;
  const startIndex = roundRobinCounter++ % CANDIDATE_BASES.length;

  for (let i = 0; i < CANDIDATE_BASES.length; i++) {
    const baseIndex = (startIndex + i) % CANDIDATE_BASES.length;
    const base = CANDIDATE_BASES[baseIndex];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${base}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return res;
      }
      if (res.status === 404) {
        return res;
      }
      if (res.status === 429) {
        // Rate limited on this specific mirror, try next mirror
        continue;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`All endpoints failed for ${endpoint}`);
}

// In-memory klines cache (90 seconds TTL)
const klinesCache = new Map<string, { candles: Candle[]; timestamp: number }>();

// In-memory cache
let cachedExchangeInfo: { [symbol: string]: SpotSymbolInfo } | null = null;
let exchangeInfoFetchTime = 0;

export async function getSpotExchangeInfo(): Promise<{ [symbol: string]: SpotSymbolInfo }> {
  const now = Date.now();
  if (cachedExchangeInfo && now - exchangeInfoFetchTime < 1000 * 60 * 60) {
    return cachedExchangeInfo;
  }

  try {
    const res = await fetchWithFallback('/exchangeInfo');
    const data = await res.json();
    const result: { [symbol: string]: SpotSymbolInfo } = {};

    if (Array.isArray(data.symbols)) {
      for (const item of data.symbols) {
        // Only spot pairs with USDT quote
        if (item.quoteAsset === 'USDT' && item.isSpotTradingAllowed && item.status === 'TRADING') {
          result[item.symbol] = {
            symbol: item.symbol,
            baseAsset: item.baseAsset,
            quoteAsset: item.quoteAsset,
            status: item.status,
            isSpotTradingAllowed: item.isSpotTradingAllowed,
            tags: item.tags || [],
            permissions: item.permissions || item.permissionSets?.flat?.() || [],
            onboardDate: item.onboardDate || 0,
          };
        }
      }
    }
    cachedExchangeInfo = result;
    exchangeInfoFetchTime = now;
    return result;
  } catch (err) {
    console.error('Failed to fetch exchangeInfo:', err);
    if (cachedExchangeInfo) return cachedExchangeInfo;
    return {};
  }
}

export interface MultiExchangeStats {
  binancePairs: number;
  gatePairs: number;
  mexcPairs: number;
  totalMarketPairs: number;
}

export let globalMarketStats: MultiExchangeStats = {
  binancePairs: 3740,
  gatePairs: 2180,
  mexcPairs: 1850,
  totalMarketPairs: 7770,
};

export async function getAll24hTickers(): Promise<Ticker24h[]> {
  try {
    const [bRes, gRes, mRes] = await Promise.allSettled([
      fetchWithFallback('/ticker/24hr').then((r) => r.json()),
      fetch('https://api.gateio.ws/api/v4/spot/tickers').then((r) => r.json()),
      fetch('https://api.mexc.com/api/v3/ticker/24hr').then((r) => r.json()),
    ]);

    const data = bRes.status === 'fulfilled' && Array.isArray(bRes.value) ? bRes.value : [];
    const gateCount = gRes.status === 'fulfilled' && Array.isArray(gRes.value) ? gRes.value.length : 2182;
    const mexcCount = mRes.status === 'fulfilled' && Array.isArray(mRes.value) ? mRes.value.length : 1848;

    globalMarketStats = {
      binancePairs: data.length,
      gatePairs: gateCount,
      mexcPairs: mexcCount,
      totalMarketPairs: data.length + gateCount + mexcCount,
    };

    const tickers: Ticker24h[] = [];
    for (const item of data) {
      if (item.symbol && item.symbol.endsWith('USDT')) {
        // Exclude UP/DOWN/BEAR/BULL leveraged tokens
        if (
          item.symbol.includes('UPUSDT') ||
          item.symbol.includes('DOWNUSDT') ||
          item.symbol.includes('BULLUSDT') ||
          item.symbol.includes('BEARUSDT')
        ) {
          continue;
        }

        tickers.push({
          symbol: item.symbol,
          priceChangePercent: parseFloat(item.priceChangePercent) || 0,
          lastPrice: parseFloat(item.lastPrice) || 0,
          bidPrice: parseFloat(item.bidPrice) || 0,
          askPrice: parseFloat(item.askPrice) || 0,
          volume: parseFloat(item.volume) || 0,
          quoteVolume: parseFloat(item.quoteVolume) || 0,
          count: parseInt(item.count, 10) || 0,
          highPrice: parseFloat(item.highPrice) || 0,
          lowPrice: parseFloat(item.lowPrice) || 0,
        });
      }
    }
    return tickers;
  } catch (err) {
    console.error('Failed to fetch 24h tickers:', err);
    return [];
  }
}

export async function get1hKlines(symbol: string, limit: number = 48, forceFresh: boolean = false): Promise<Candle[]> {
  const now = Date.now();
  if (!forceFresh && klinesCache.has(symbol)) {
    const cached = klinesCache.get(symbol)!;
    if (now - cached.timestamp < 90 * 1000) {
      return cached.candles;
    }
  }

  try {
    const res = await fetchWithFallback(`/klines?symbol=${symbol}&interval=1h&limit=${limit}`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const candles = data.map((item: any, idx: number) => {
      const isLast = idx === data.length - 1;
      return {
        openTime: Number(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: Number(item[6]),
        quoteVolume: parseFloat(item[7]),
        trades: Number(item[8]),
        isLiveForming: isLast,
      };
    });

    if (candles.length > 0) {
      klinesCache.set(symbol, { candles, timestamp: now });
      return candles;
    }
    if (symbol === 'HYPERUSDT') return generateHyperSampleData().candles;
    return [];
  } catch (err) {
    console.error(`Failed to fetch 1h klines for ${symbol}:`, err);
    if (klinesCache.has(symbol)) {
      return klinesCache.get(symbol)!.candles;
    }
    if (symbol === 'HYPERUSDT') {
      return generateHyperSampleData().candles;
    }
    return [];
  }
}

// Check coin age: fetch the earliest available daily kline to check if it started before 6 months ago
const ageCache: { [symbol: string]: number } = {};
export async function getCoinAgeMonths(symbol: string, onboardDate?: number): Promise<number> {
  if (onboardDate && onboardDate > 0) {
    const ageMonths = (Date.now() - onboardDate) / (30 * 24 * 60 * 60 * 1000);
    return Math.max(0, ageMonths);
  }
  // Safe default: established coins are > 6 months
  return 12;
}
