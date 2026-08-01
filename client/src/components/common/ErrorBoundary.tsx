import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-error/10 border border-error/20 text-error rounded-xl m-4 space-y-2">
          <h2 className="text-base font-bold font-display">Rendering Exception Caught</h2>
          <p className="text-xs font-semibold leading-relaxed">{this.state.error?.message}</p>
          {this.state.error?.stack && (
            <pre className="text-[10px] bg-bg-dark/80 p-4 rounded-lg overflow-x-auto font-mono text-text-muted max-h-[200px] overflow-y-auto">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
