import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PERFORMANCE crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
          <div className="panel-surface p-6 max-w-sm text-center">
            <div className="eyebrow eyebrow-accent">Algo se rompió</div>
            <p className="text-[13px] text-[var(--color-muted)] mt-2.5">
              La app tuvo un error inesperado. Tus datos están a salvo en este navegador.
            </p>
            <p className="text-[11px] text-[var(--color-muted-2)] mt-2 num">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-[var(--color-red)] text-black py-2.5 text-[12.5px] font-semibold uppercase tracking-wide"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
