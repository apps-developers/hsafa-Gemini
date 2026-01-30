import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName: string;
  resolvedColors: {
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    inputBackground: string;
    errorColor: string;
    errorColorLight: string;
    errorColorDark: string;
  };
  toolCallId?: string;
  toolName?: string;
  onError?: (toolCallId: string, toolName: string, error: Error) => void;
  onSuccess?: (toolCallId: string, toolName: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class UIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidMount() {
    // Report success if component mounted without errors
    const { toolCallId, toolName, onSuccess } = this.props;
    if (toolCallId && toolName && onSuccess && !this.state.hasError) {
      // Use setTimeout to ensure this happens after the render completes
      setTimeout(() => {
        if (!this.state.hasError) {
          onSuccess(toolCallId, toolName);
        }
      }, 0);
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`UI Component Error (${this.props.componentName}):`, error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Report error back to agent if callback provided
    const { toolCallId, toolName, onError } = this.props;
    if (toolCallId && toolName && onError) {
      onError(toolCallId, toolName, error);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { resolvedColors, componentName } = this.props;
      return (
        <div
          style={{
            padding: '16px',
            backgroundColor: resolvedColors.errorColorLight,
            border: `2px solid ${resolvedColors.errorColor}`,
            borderRadius: '12px',
            color: resolvedColors.errorColorDark,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <strong style={{ fontSize: '16px' }}>Component Error: {componentName}</strong>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontFamily: 'monospace' }}>
            {this.state.error.message}
          </div>
          {this.state.errorInfo && (
            <details style={{ fontSize: '12px', marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Stack Trace
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: resolvedColors.errorColorLight,
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  fontSize: '11px',
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

