import React, { useState } from 'react';
import { Calculator, X, Copy, Check, DollarSign, Percent } from 'lucide-react';
import { HiddenBullishSetup } from '../types/scanner';

interface SpotCalculatorProps {
  setup: HiddenBullishSetup | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpotCalculator: React.FC<SpotCalculatorProps> = ({ setup, isOpen, onClose }) => {
  const [capitalUsdt, setCapitalUsdt] = useState<number>(1000);
  const [feeRatePct, setFeeRatePct] = useState<number>(0.1); // 0.1% Binance spot maker/taker standard
  const [copied, setCopied] = useState(false);

  if (!isOpen || !setup) return null;

  const entryPrice = setup.entryPrice;
  const targetPrice = setup.targetPrice; // +1.00%
  const buyQty = entryPrice > 0 ? capitalUsdt / entryPrice : 0;
  const exitValueUsdt = buyQty * targetPrice;
  const grossProfitUsdt = exitValueUsdt - capitalUsdt;

  const buyFee = (capitalUsdt * feeRatePct) / 100;
  const sellFee = (exitValueUsdt * feeRatePct) / 100;
  const totalFees = buyFee + sellFee;
  const netProfitUsdt = grossProfitUsdt - totalFees;
  const netRoiPct = (netProfitUsdt / capitalUsdt) * 100;

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(5);
    return p.toFixed(7);
  };

  const handleCopy = () => {
    const text = `SPOT LIMIT ORDER: ${setup.symbol}\nType: BUY LIMIT\nEntry Price: ${formatPrice(entryPrice)} USDT\nQuantity: ${buyQty.toFixed(4)} ${setup.baseAsset}\nTake Profit: ${formatPrice(targetPrice)} USDT (+1.00%)\nCapital: $${capitalUsdt} USDT`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white text-sm">
              SPOT 1% Scalp Order Calculator
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div>
            <div className="text-slate-400 text-[11px] mb-1">Target Coin (Spot)</div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-sm font-bold text-white">
              <span>{setup.symbol}</span>
              <span className="text-emerald-400 font-mono text-xs">NO LEVERAGE · CASH SPOT</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">
              Spot Capital Allocation (USDT)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
              <input
                type="number"
                min="10"
                step="50"
                value={capitalUsdt}
                onChange={(e) => setCapitalUsdt(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-slate-500 text-[10px]">Entry Price</div>
              <div className="text-slate-200 font-bold text-xs mt-0.5">
                {formatPrice(entryPrice)}
              </div>
            </div>

            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg">
              <div className="text-emerald-400 text-[10px]">Take Profit (+1.00%)</div>
              <div className="text-emerald-300 font-bold text-xs mt-0.5">
                {formatPrice(targetPrice)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-[11px]">
            <div className="flex justify-between items-center text-slate-400">
              <span>Spot Coins to Purchase:</span>
              <span className="text-white font-bold">
                {buyQty.toFixed(4)} {setup.baseAsset}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Gross Profit (+1.00%):</span>
              <span className="text-emerald-400 font-bold">+${grossProfitUsdt.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Est. Spot Fees (0.1% maker/taker):</span>
              <span className="text-slate-500">-${totalFees.toFixed(2)} USDT</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-sm">
              <span className="text-white">Net Scalp Profit:</span>
              <span className="text-emerald-400">+${netProfitUsdt.toFixed(2)} USDT ({netRoiPct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Order Copied to Clipboard!' : 'Copy Spot Order Spec'}
          </button>
        </div>
      </div>
    </div>
  );
};
