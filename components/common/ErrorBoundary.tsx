import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900">
                    <h2 className="text-lg font-bold mb-2">Something went wrong.</h2>
                    <div className="font-mono text-xs bg-white p-3 rounded border border-red-100 overflow-auto mb-4">
                        {this.state.error ? this.state.error.toString() : "Unknown error"}
                        {this.state.error?.stack && <div className="mt-2 border-t pt-2 text-gray-500">{this.state.error.stack.slice(0, 300)}...</div>}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
