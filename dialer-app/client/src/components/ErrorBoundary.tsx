import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#1a1a1a',
            color: 'white',
            fontFamily: 'sans-serif',
            zIndex: 99999,
          }}
        >
          <h1 style={{ color: '#ff4d4d', fontSize: '2em' }}>Something went wrong.</h1>
          <p style={{ marginTop: '1em', fontSize: '1.2em' }}>An unexpected error occurred. Please try reloading the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2em',
              padding: '10px 20px',
              fontSize: '1em',
              color: 'white',
              backgroundColor: '#ff4d4d',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2em', width: '80%', background: '#333', padding: '1em', borderRadius: '5px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '1em' }}>
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 