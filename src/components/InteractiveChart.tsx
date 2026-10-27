import React, { useMemo, useState } from 'react';
import { Candle, HiddenBullishSetup } from '../types/scanner';

interface InteractiveChartProps {
  candles: Candle[];
  rsiSeries: (number | null)[];
  setup?: HiddenBullishSetup | null;
  symbol: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  rsiSeries,
  setup,
  symbol,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Layout dimensions
  const width = 860;
  const height = 460;
  const priceChartHeight = 280;
  const rsiChartHeight = 120;
  const gap = 20;
  const padding = { top: 25, right: 75, bottom: 25, left: 15 };

  const plotWidth = width - padding.left - padding.right;

  // Price calculations
  const { minPrice, maxPrice, priceRange, candleWidth, getX, getYPrice, getYRsi } = useMemo(() => {
    if (candles.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 1,
        priceRange: 1,
        candleWidth: 10,
        getX: () => 0,
        getYPrice: () => 0,
        getYRsi: () => 0,
      };
    }

    let min = Infinity;
    let max = -Infinity;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    if (setup) {
      if (setup.targetPrice > max) max = setup.targetPrice;
      if (setup.secondLowerWickPrice < min) min = setup.secondLowerWickPrice;
    }

    // Add 8% vertical padding
    const pMargin = (max - min) * 0.08 || min * 0.02;
    const effectiveMin = Math.max(0, min - pMargin);
    const effectiveMax = max + pMargin;
    const range = effectiveMax - effectiveMin || 1;

    const cWidth = Math.max(4, Math.min(18, plotWidth / candles.length - 3));

    const xFn = (idx: number) => padding.left + (idx + 0.5) * (plotWidth / candles.length);
    const yPriceFn = (price: number) =>
      padding.top + priceChartHeight - ((price - effectiveMin) / range) * priceChartHeight;

    const rsiMin = 15;
    const rsiMax = 85;
    const rsiRange = rsiMax - rsiMin;
    const rsiTop = padding.top + priceChartHeight + gap;
    const yRsiFn = (rsiVal: number) =>
      rsiTop + rsiChartHeight - ((rsiVal - rsiMin) / rsiRange) * rsiChartHeight;

    return {
      minPrice: effectiveMin,
      maxPrice: effectiveMax,
      priceRange: range,
      candleWidth: cWidth,
      getX: xFn,
      getYPrice: yPriceFn,
      getYRsi: yRsiFn,
    };
  }, [candles, setup, plotWidth]);

  // Compute Trendlines if setup is present
  const trendlineGeometry = useMemo(() => {
    if (!setup || candles.length === 0) return null;

    // c1 and c2 relative to the candles slice shown
    // Find index of candle1Time and candle2Time
    const idx1 = candles.findIndex((c) => Math.abs(c.openTime - setup.candle1Time) < 1000);
    const idx2 = candles.findIndex((c) => Math.abs(c.openTime - setup.candle2Time) < 1000);

    const activeIdx1 = idx1 >= 0 ? idx1 : candles.length - 1 - setup.candleDistance;
    const activeIdx2 = idx2 >= 0 ? idx2 : candles.length - 1;

    const x1 = getX(activeIdx1);
    const y1 = getYPrice(setup.firstLowerWickPrice);
    const x2 = getX(activeIdx2);
    const y2 = getYPrice(setup.secondLowerWickPrice);

    // RSI line
    const rsiX1 = x1;
    const rsiY1 = getYRsi(setup.rsi1Value);
    const rsiX2 = x2;
    const rsiY2 = getYRsi(setup.rsi2Value);

    return {
      activeIdx1,
      activeIdx2,
      x1,
      y1,
      x2,
      y2,
      rsiX1,
      rsiY1,
      rsiX2,
      rsiY2,
    };
  }, [setup, candles, getX, getYPrice, getYRsi]);

  const activeCandle =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length
      ? candles[hoverIndex]
      : candles[candles.length - 1];

  const activeRsi =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < rsiSeries.length
      ? rsiSeries[hoverIndex]
      : rsiSeries[rsiSeries.length - 1];

  // Helper for formatting prices dynamically
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(5);
    return p.toFixed(7);
  };

  const rsiTop = padding.top + priceChartHeight + gap;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-slate-200 select-none">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold text-white tracking-wide">{symbol}</span>
          <span className="text-xs text-slate-400 font-mono">1H SPOT · BINANCE</span>
          {activeCandle?.isLiveForming && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE FORMING
            </span>
          )}
        </div>

        {activeCandle && (
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <div>
              O: <span className="text-slate-200">{formatPrice(activeCandle.open)}</span>
            </div>
            <div>
              H: <span className="text-slate-200">{formatPrice(activeCandle.high)}</span>
            </div>
            <div>
              L: <span className="text-emerald-300 font-semibold">{formatPrice(activeCandle.low)}</span>
            </div>
            <div>
              C: <span className="text-slate-200">{formatPrice(activeCandle.close)}</span>
            </div>
            {activeRsi !== null && activeRsi !== undefined && (
              <div>
                RSI 14:{' '}
                <span
                  className={
                    activeRsi >= 30 && activeRsi <= 40
                      ? 'text-emerald-400 font-bold'
                      : 'text-cyan-400'
                  }
                >
                  {activeRsi.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair font-mono text-[10px]"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            if (relX >= padding.left && relX <= width - padding.right) {
              const idx = Math.floor(
                ((relX - padding.left) / plotWidth) * candles.length
              );
              if (idx >= 0 && idx < candles.length) setHoverIndex(idx);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Gradient for RSI 30-40 valid zone */}
            <linearGradient id="rsiValidZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.10" />
            </linearGradient>
            <linearGradient id="takeProfitGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines for Price Chart */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const y = padding.top + priceChartHeight * ratio;
            const priceVal = maxPrice - ratio * priceRange;
            return (
              <g key={`grid-p-${ratio}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={width - padding.right + 6}
                  y={y + 3}
                  fill="#64748b"
                  textAnchor="start"
                >
                  {formatPrice(priceVal)}
                </text>
              </g>
            );
          })}

          {/* Target Take Profit (+1%) Line */}
          {setup && (
            <g>
              <line
                x1={padding.left}
                y1={getYPrice(setup.targetPrice)}
                x2={width - padding.right}
                y2={getYPrice(setup.targetPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <rect
                x={width - padding.right + 2}
                y={getYPrice(setup.targetPrice) - 8}
                width={70}
                height={16}
                rx={2}
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1"
              />
              <text
                x={width - padding.right + 6}
                y={getYPrice(setup.targetPrice) + 3}
                fill="#34d399"
                fontWeight="bold"
              >
                TP +1.0%
              </text>
            </g>
          )}

          {/* Horizontal Lower Wick Support Corridor (as shown in user TradingView photo) */}
          {setup && (
            <g>
              {/* Upper support band */}
              <line
                x1={padding.left}
                y1={getYPrice(Math.max(setup.firstLowerWickPrice, setup.secondLowerWickPrice))}
                x2={width - padding.right}
                y2={getYPrice(Math.max(setup.firstLowerWickPrice, setup.secondLowerWickPrice))}
                stroke="#eab308"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
              />
              {/* Lower support band */}
              <line
                x1={padding.left}
                y1={getYPrice(Math.min(setup.firstLowerWickPrice, setup.secondLowerWickPrice))}
                x2={width - padding.right}
                y2={getYPrice(Math.min(setup.firstLowerWickPrice, setup.secondLowerWickPrice))}
                stroke="#eab308"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
              />
            </g>
          )}

          {/* Render 1H Candlesticks */}
          {candles.map((candle, idx) => {
            const x = getX(idx);
            const isBullish = candle.close >= candle.open;
            const openY = getYPrice(candle.open);
            const closeY = getYPrice(candle.close);
            const highY = getYPrice(candle.high);
            const lowY = getYPrice(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            const isC1 = trendlineGeometry?.activeIdx1 === idx;
            const isC2 = trendlineGeometry?.activeIdx2 === idx;

            return (
              <g key={`candle-${candle.openTime}`}>
                {/* Upper and Lower Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={isBullish ? '#10b981' : '#ef4444'}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#10b981' : '#ef4444'}
                  stroke={isBullish ? '#059669' : '#dc2626'}
                  strokeWidth="0.5"
                />

                {/* Lower Wick Highlighting for Point 1 */}
                {isC1 && (
                  <g>
                    <circle
                      cx={x}
                      cy={lowY}
                      r="4"
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={lowY + 16}
                      fill="#38bdf8"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      Point 1 (Wick 1)
                    </text>
                  </g>
                )}

                {/* Lower Wick Highlighting for Point 2 (Live Entry) */}
                {isC2 && (
                  <g>
                    <circle
                      cx={x}
                      cy={lowY}
                      r="5"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={lowY + 18}
                      fill="#34d399"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      Point 2 (LIVE WICK)
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Strict Price Trendline (First Lower Wick -> Second Lower Wick) */}
          {trendlineGeometry && (
            <g>
              <line
                x1={trendlineGeometry.x1}
                y1={trendlineGeometry.y1}
                x2={trendlineGeometry.x2}
                y2={trendlineGeometry.y2}
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              {/* Zero-Touch Clearance Indicator Label */}
              <text
                x={(trendlineGeometry.x1 + trendlineGeometry.x2) / 2}
                y={(trendlineGeometry.y1 + trendlineGeometry.y2) / 2 - 8}
                fill="#38bdf8"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
              >
                ZERO-TOUCH CLEARANCE ({setup?.candleDistance} candles)
              </text>
            </g>
          )}

          {/* RSI Pane Separator Line */}
          <line
            x1={padding.left}
            y1={rsiTop - 10}
            x2={width - padding.right}
            y2={rsiTop - 10}
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            x={padding.left + 4}
            y={rsiTop - 2}
            fill="#94a3b8"
            fontSize="9"
            fontWeight="bold"
          >
            1H RSI (14 CLOSE) · MANDATORY 30.00 – 40.00
          </text>

          {/* RSI Highlight Band for 30 - 40 Range */}
          <rect
            x={padding.left}
            y={getYRsi(40)}
            width={plotWidth}
            height={getYRsi(30) - getYRsi(40)}
            fill="url(#rsiValidZoneGrad)"
            stroke="#10b981"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
          <text
            x={width - padding.right + 6}
            y={getYRsi(40) + 3}
            fill="#10b981"
            fontWeight="bold"
          >
            40.0 (Max)
          </text>
          <text
            x={width - padding.right + 6}
            y={getYRsi(30) + 3}
            fill="#10b981"
            fontWeight="bold"
          >
            30.0 (Min)
          </text>

          {/* RSI 50 midline */}
          <line
            x1={padding.left}
            y1={getYRsi(50)}
            x2={width - padding.right}
            y2={getYRsi(50)}
            stroke="#334155"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
          <text x={width - padding.right + 6} y={getYRsi(50) + 3} fill="#64748b">
            50.0
          </text>

          {/* RSI Curve Path */}
          {(() => {
            const points: string[] = [];
            rsiSeries.forEach((val, idx) => {
              if (val !== null && !isNaN(val)) {
                const x = getX(idx);
                const y = getYRsi(val);
                points.push(`${idx === 0 ? 'M' : 'L'} ${x} ${y}`);
              }
            });
            return (
              <path
                d={points.join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
              />
            );
          })()}

          {/* RSI Trendline connecting Point 1 to Point 2 */}
          {trendlineGeometry && (
            <g>
              <line
                x1={trendlineGeometry.rsiX1}
                y1={trendlineGeometry.rsiY1}
                x2={trendlineGeometry.rsiX2}
                y2={trendlineGeometry.rsiY2}
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <circle
                cx={trendlineGeometry.rsiX1}
                cy={trendlineGeometry.rsiY1}
                r="3"
                fill="#0284c7"
              />
              <circle
                cx={trendlineGeometry.rsiX2}
                cy={trendlineGeometry.rsiY2}
                r="4"
                fill="#10b981"
              />
            </g>
          )}

          {/* Vertical Hover Crosshair */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Chart Footer / Time markers */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
        <span>Candles shown: {candles.length} (1H resolution)</span>
        <span>Zero-Touch Corridor: Checked & Verified</span>
        <span>TP Calculation: Exact Spot +1.00%</span>
      </div>
    </div>
  );
};
