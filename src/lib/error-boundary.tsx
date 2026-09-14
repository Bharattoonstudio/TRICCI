import React, { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches render errors and provides recovery.
 * Logs errors to console and optionally to monitoring service.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      logErrorToMonitoring({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.reset) || (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error.message || 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
              <details className="mb-4 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                <summary className="cursor-pointer font-bold mb-2">Details</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
              <button
                onClick={this.reset}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Async error logger that doesn't block rendering
 */
function logErrorToMonitoring(error: {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
}) {
  // Queue for next idle time to avoid blocking
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      navigator.sendBeacon('/api/logs/error', JSON.stringify(error));
    });
  } else {
    // Fallback: send immediately but don't wait
    fetch('/api/logs/error', {
      method: 'POST',
      body: JSON.stringify(error),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail if monitoring is unavailable
    });
  }
}

export default ErrorBoundary;
