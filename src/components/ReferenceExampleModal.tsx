import React from 'react';
import { X, ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReferenceExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHyperUsdt: () => void;
}

export const ReferenceExampleModal: React.FC<ReferenceExampleModalProps> = ({
  isOpen,
  onClose,
  onLoadHyperUsdt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-white">
              TradingView Master Reference · HYPER/USDT (1H)
            </span>
            <span className="text-xs text-slate-400 font-mono">Attachment Comparison</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              USER ATTACHMENT BENCHMARK (TradingView Binance 1H Chart)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This reference matches the chart photographed on your laptop screen (HYPER / TetherUS 1H Binance).
              It demonstrates the exact Lower-Wick-to-Lower-Wick trendline structure, the 6–19 candle distance window (ideal ≤18, max 19),
              the Ascending → Descending arch, the strict 1H RSI range of 30–40, and the Zero-Touch rule between points.
            </p>
          </div>

          {/* Reference Image Viewer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="p-2 bg-slate-900/90 text-xs font-mono text-slate-300 border-b border-slate-800 flex justify-between items-center">
                <span>Photo 1: Cursor on Sat 24 Oct (Wick 1)</span>
                <span className="text-slate-500">1H Binance</span>
              </div>
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/aistudio/20261026_163023_8cb34567.jpg"
                  alt="TradingView Screenshot 1"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="p-2 bg-slate-900/90 text-xs font-mono text-slate-300 border-b border-slate-800 flex justify-between items-center">
                <span>Photo 2: Trendline to Sun 25 Oct (Wick 2)</span>
                <span className="text-slate-500">1H Binance</span>
              </div>
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/aistudio/20261026_162905_5a24d095.jpg"
                  alt="TradingView Screenshot 2"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          {/* Rule Breakdown Checklist */}
          <div className="space-y-3 font-mono text-xs">
            <div className="font-sans font-bold text-sm text-white">
              Deterministic Rule Compliance Check:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  1H Lower Wick Only (Rule 5)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Points connect candle lowest wicks (~0.0631 to ~0.0626), upper wicks are ignored.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Candle Distance: 11 (Rule 6)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Point 2 forms 11 candles after Point 1, fully compliant with the 6–24 range.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Zero-Touch Trendline (Rule 7)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Between Point 1 and Point 2, no candle lower wick or body touches the blue trendline.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ascending → Descending Arc (Rule 8)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Price bounced up after Point 1 into a peak before descending back into Point 2.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  1H RSI 30–40 (Rule 4 & 9)
                </div>
                <div className="text-slate-400 text-[11px]">
                  RSI at Point 2 was ~34.8, strictly inside the mandatory 30.00–40.00 corridor.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quick Scalp Target: +1% (Rule 13)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Immediate exit set at +1.00% from entry. No leverage, spot execution only.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={() => {
              onLoadHyperUsdt();
              onClose();
            }}
            className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Inspect HYPER/USDT Live in Scanner
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
