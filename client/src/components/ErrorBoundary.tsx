import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const isProd = import.meta.env.PROD;

// Detect chunk-load / dynamic-import failures (network hiccup on first nav)
function isChunkLoadError(err: Error | null): boolean {
  const msg = err?.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("dynamically imported module")
  );
}

class ErrorBoundary extends Component<Props, State> {
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in all environments for debugging
    console.error("[ErrorBoundary] Caught error:", error, info);
    // Auto-retry once for chunk-load errors (network blip on first navigation)
    if (isChunkLoadError(error) && this.state.retryCount === 0) {
      this._retryTimer = setTimeout(() => {
        this.setState({ hasError: false, error: null, retryCount: 1 });
      }, 800);
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
  }

  render() {
    if (this.state.hasError) {
      // For chunk-load errors on first try — show spinner while auto-retrying
      if (isChunkLoadError(this.state.error) && this.state.retryCount === 0) {
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <RotateCcw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Loading page…</p>
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-lg text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle size={40} className="text-destructive" />
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              An unexpected error occurred. Your work has been saved. Please
              reload the page or return to the home screen.
            </p>

            {/* Show technical details only in development */}
            {!isProd && this.state.error && (
              <div className="p-4 w-full rounded-lg bg-muted overflow-auto mb-6 text-left">
                <p className="text-xs font-semibold text-destructive mb-1">
                  {this.state.error.message}
                </p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg",
                  "bg-primary text-primary-foreground font-medium",
                  "hover:opacity-90 transition-opacity cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload Page
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className={cn(
                  "flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg",
                  "bg-muted text-foreground font-medium border border-border",
                  "hover:bg-muted/80 transition-colors cursor-pointer"
                )}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
