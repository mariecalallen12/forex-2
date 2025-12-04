'use client';

/**
 * Error Boundary Component
 * 
 * Catches and handles JavaScript errors anywhere in the child component tree.
 * Displays a fallback UI instead of crashing the entire application.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      eventId: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      eventId: Date.now().toString(),
    });

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you would typically log to your error reporting service
      // such as Sentry, Bugsnag, or similar
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          event_id: this.state.eventId,
        });
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, eventId } = this.state;
    
    if (error && eventId) {
      const bugReport = {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        eventId,
      };
      
      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));
      
      // You could also open a bug report form here
      window.open(`mailto:support@digitalutopia.app?subject=Error Report ${eventId}&body=${encodeURIComponent(JSON.stringify(bugReport, null, 2))}`);
    }
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>
            
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground text-center mb-6">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-2">Error Details:</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-muted-foreground font-mono mt-2 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border bg-background text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
            
            <button
              onClick={this.handleReportBug}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bug className="w-4 h-4" />
              Report Bug
            </button>
            
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact our support team.
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Error ID: {this.state.eventId}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;