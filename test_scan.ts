import { getAll24hTickers, getSpotExchangeInfo, get1hKlines, getCoinAgeMonths } from './src/services/binanceApi';
import { evaluateHiddenBullishSetup, DEFAULT_CONFIG } from './src/services/hiddenBullishEngine';

async function testScan() {
  console.log('Fetching exchange info and tickers...');
  const [exchangeInfo, tickers] = await Promise.all([
    getSpotExchangeInfo(),
    getAll24hTickers(),
  ]);
  console.log(`Loaded ${tickers.length} tickers, ${Object.keys(exchangeInfo).length} symbols in exchangeInfo.`);

  const eligible = tickers.filter(t => t.symbol.endsWith('USDT') && t.quoteVolume >= 50000 && t.count >= 250);
  console.log(`Eligible tickers >= 50k vol: ${eligible.length}`);

  let passedCount = 0;
  let evaluated = 0;
  const sample = eligible.slice(0, 100);

  for (const t of sample) {
    evaluated++;
    const candles = await get1hKlines(t.symbol, 60);
    if (candles.length < 26) continue;
    const report = evaluateHiddenBullishSetup(t.symbol, candles, t, exchangeInfo[t.symbol], 12, DEFAULT_CONFIG);
    if (report.passed) {
      console.log(`>>> PASSED: ${t.symbol}`, report.setup?.qualificationReason);
      passedCount++;
    }
  }

  console.log(`Evaluation complete. Evaluated: ${evaluated}, Passed: ${passedCount}`);
}

testScan().catch(console.error);
