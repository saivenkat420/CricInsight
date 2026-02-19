import React from 'react'

class ErrorBoundary extends React.Component {
  state = {hasError: false, error: null}

  static getDerivedStateFromError(error) {
    return {hasError: true, error}
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#0a0f0a',
            color: '#f9fafb',
          }}
        >
          <h1 style={{fontSize: '1.5rem', marginBottom: 8}}>
            Something went wrong
          </h1>
          <p style={{color: '#9ca3af', marginBottom: 24, textAlign: 'center'}}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.assign('/')}
            style={{
              padding: '10px 20px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Go to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
