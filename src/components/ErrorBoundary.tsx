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
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    // Attempt clear possible corrupted states and reload
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Algo deu errado na renderização
            </h1>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Ocorreu um erro inesperado ao processar os dados ou renderizar a tela. Clique abaixo para recarregar a aplicação de forma segura.
            </p>

            {this.state.error && (
              <div className="bg-slate-50 rounded-lg p-3 text-left mb-6 border border-slate-100 max-h-32 overflow-y-auto">
                <p className="text-xs font-mono text-slate-500 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 text-white rounded-xl py-3 px-4 font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
