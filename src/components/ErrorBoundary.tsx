import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", padding: "2rem", color: "#fff",
          background: "#0a0a0a", fontFamily: "system-ui, sans-serif"
        }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Something went wrong</h1>
          <pre style={{
            whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.06)",
            padding: 16, borderRadius: 8, fontSize: 13
          }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: 16, padding: "8px 16px", borderRadius: 8,
              background: "#9333ea", color: "#fff", border: "none", cursor: "pointer"
            }}
          >Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
