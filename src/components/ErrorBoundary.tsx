import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("APPLICATION ERROR:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error);
      const stack = this.state.error?.stack || "";

      return (
        <div style={{
          background: "#111",
          color: "white",
          minHeight: "100vh",
          padding: "24px 16px",
          fontFamily: "monospace",
          boxSizing: "border-box",
        }}>
          <h2 style={{ color: "#ff6b6b", marginBottom: 12 }}>💥 Application Crashed</h2>
          <div style={{
            background: "#1e1e1e",
            border: "1px solid #ff6b6b",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}>
            {msg}
          </div>
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", color: "#aaa", marginBottom: 8 }}>
              Stack trace
            </summary>
            <div style={{
              background: "#1e1e1e",
              borderRadius: 8,
              padding: 12,
              fontSize: 11,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              color: "#ccc",
            }}>
              {stack}
            </div>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              background: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Reload Site
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
