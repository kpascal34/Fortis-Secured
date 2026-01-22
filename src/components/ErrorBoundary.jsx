import React from 'react';
import { AiOutlineWarning } from 'react-icons/ai';

/**
 * Global Error Boundary Component
 * Catches errors anywhere in the child component tree and displays a friendly error message
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // Here you could also log to an error tracking service like Sentry
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    
    // Send to your backend error logging service
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently fail if logging fails
      });
    } catch (err) {
      // Ignore logging errors
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4">
          <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/5 p-8 backdrop-blur-md">
            <div className="flex items-center justify-center mb-6">
              <div className="rounded-full bg-red-500/20 p-4">
                <AiOutlineWarning className="text-3xl text-red-400" />
              </div>
            </div>

            <h1 className="text-center text-2xl font-bold text-white mb-3">
              Something Went Wrong
            </h1>

            <p className="text-center text-white/70 mb-4">
              We encountered an unexpected error. Our team has been notified and is working on a fix.
            </p>

            {isDevelopment && this.state.error && (
              <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-xs font-mono text-red-300 mb-2 font-semibold">Error Details:</p>
                <p className="text-xs font-mono text-red-300/80 break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-red-300 hover:text-red-200">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-red-300/70 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-night-sky hover:bg-accent/90 transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Try Again
              </button>
            </div>

            <p className="text-center text-xs text-white/50 mt-4">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
