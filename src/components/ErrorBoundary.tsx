import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Errore imprevisto' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, errorMessage: '' });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleFullReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white">Si è verificato un problema</h2>
              <p className="text-sm text-zinc-400">
                L&apos;applicazione ha intercettato un errore imprevisto durante l&apos;elaborazione. I tuoi dati salvati possono essere ripristinati.
              </p>
              {this.state.errorMessage && (
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs font-mono text-amber-300 text-left overflow-x-auto">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-sm transition-colors shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Ricarica Applicazione
              </button>

              <button
                onClick={this.handleFullReset}
                className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors"
              >
                Ripristina Dati Iniziali
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
