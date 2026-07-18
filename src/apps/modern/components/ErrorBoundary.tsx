import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] caught rendering error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: '#0a0614',
                    color: '#ffffff',
                    padding: 40,
                    textAlign: 'center',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(211, 82, 255, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                        fontSize: 36
                    }}>
                        !
                    </div>
                    <h1 style={{
                        fontSize: 24,
                        fontWeight: 700,
                        margin: '0 0 8px',
                        fontFamily: 'Outfit, sans-serif',
                        color: '#c26df0'
                    }}>
                        Something went wrong
                    </h1>
                    <p style={{
                        fontSize: 15,
                        color: '#dcd9fd',
                        margin: '0 0 8px',
                        maxWidth: 400
                    }}>
                        An unexpected error occurred while rendering this page.
                    </p>
                    {this.state.error?.message && (
                        <p style={{
                            fontSize: 13,
                            color: 'rgba(220, 217, 253, 0.5)',
                            margin: '0 0 24px',
                            maxWidth: 400,
                            fontFamily: 'monospace'
                        }}>
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '10px 28px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            borderRadius: 6,
                            border: 'none',
                            background: 'linear-gradient(135deg, #00f0ff 0%, #d352ff 100%)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(211, 82, 255, 0.4)'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
