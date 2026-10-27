import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Hidden Bullish Scanner:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="font-mono text-xl font-bold text-white">
              Scanner Initialization Recovery
            </h1>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              An unexpected display issue occurred while connecting to the spot market feed. Click reload below to refresh the live scanner.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-950 rounded-lg text-left font-mono text-[11px] text-rose-300 overflow-x-auto border border-rose-950">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-colors shadow-lg shadow-emerald-950"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Live Scanner
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
