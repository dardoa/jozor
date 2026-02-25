import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class TreeErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Tree Rendering Error:', error, errorInfo);
        // We could also log to an external service here if available
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-[var(--theme-bg)] text-[var(--card-text)] overflow-hidden">
                    <div className="max-w-xl w-full bg-[var(--card-bg)] rounded-3xl p-10 shadow-2xl border border-red-500/20 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-9xl text-red-500/5 select-none font-black">
                            !
                        </div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 mb-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                                <span className="text-4xl">🌳</span>
                            </div>

                            <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">Tree Rendering Failed</h2>

                            <p className="mb-6 text-[var(--text-dim)] leading-relaxed max-w-md">
                                We encountered a problem while trying to draw the family tree. This is usually caused by corrupted data or an infinite loop in the relationships.
                            </p>

                            <div className="w-full bg-black/5 dark:bg-black/40 p-4 rounded-xl mb-8 overflow-auto max-h-40 text-left border border-[var(--border-main)]">
                                <code className="text-xs font-mono text-red-600 dark:text-red-400 break-words whitespace-pre-wrap">
                                    {this.state.error?.message || 'Unknown render error occurred'}
                                </code>
                            </div>

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 py-3 px-6 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-xl font-medium transition-colors shadow-lg shadow-[var(--primary-600)]/20"
                                >
                                    Retry Rendering
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 py-3 px-6 bg-[var(--card-bg)] hover:bg-[var(--theme-bg-elevated)] border border-[var(--border-main)] text-[var(--text-main)] rounded-xl font-medium transition-colors"
                                >
                                    Reload App
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
