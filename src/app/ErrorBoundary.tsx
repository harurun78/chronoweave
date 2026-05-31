import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(
        '[Chronoweave] Unhandled error:',
        error,
        info.componentStack
      );
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (fallback) {
        return fallback(error, this.reset);
      }
      return (
        <div
          role="alert"
          style={{
            padding: 'var(--space-6, 24px)',
            margin: 'var(--space-4, 16px)',
            border: '1px solid var(--color-border, #ddd)',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--color-surface, #fff)',
            color: 'var(--color-text, #111)',
            fontFamily: 'var(--font-family-sans, system-ui, sans-serif)',
            maxWidth: 720
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong.</h2>
          <p>
            Chronoweave hit an unexpected error. Your unsaved changes may be
            lost. Try resetting the view or reload the page.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: 'var(--color-surface-muted, #f5f5f5)',
              padding: 'var(--space-3, 12px)',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              overflowX: 'auto'
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            onClick={this.reset}
            style={{ marginRight: 'var(--space-2, 8px)' }}
          >
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
