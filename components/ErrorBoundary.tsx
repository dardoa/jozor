import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[var(--theme-bg)] text-[var(--card-text)]">
                    <div className="max-w-md w-full bg-[var(--card-bg)] rounded-2xl p-8 shadow-xl border border-[var(--border-color)]">
                        <h1 className="text-2xl font-bold mb-4 text-red-500">Oops! Something went wrong.</h1>
                        <p className="mb-6 opacity-80">
                            The application encountered an unexpected error. This might be due to a data synchronization issue or a temporary glitch.
                        </p>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 overflow-auto max-h-40">
                            <code className="text-sm text-red-600 dark:text-red-400">
                                {this.state.error?.message}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
