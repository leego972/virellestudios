import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recoveringChunk: boolean;
}

const isProd = import.meta.env.PROD;
const CHUNK_RECOVERY_KEY = "virelle:chunk-recovery";

function isChunkLoadError(err: Error | null): boolean {
  const msg = `${err?.name || ""} ${err?.message || ""}`.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("dynamically imported module") ||
    msg.includes("module script")
  );
}

async function clearStaleClientAssets(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn("[ErrorBoundary] Service worker cleanup failed:", error);
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("[ErrorBoundary] Cache cleanup failed:", error);
  }
}

async function hardRecoverFromChunkError(): Promise<void> {
  await clearStaleClientAssets();

  const url = new URL(window.location.href);
  url.searchParams.set("__virelle_reload", Date.now().toString());
  window.location.replace(url.toString());
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, recoveringChunk: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error, info);

    if (!isChunkLoadError(error)) return;

    const recoveryScope = `${window.location.pathname}:${window.location.search}`;
    const previousRecovery = sessionStorage.getItem(CHUNK_RECOVERY_KEY);

    if (previousRecovery === recoveryScope) return;

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, recoveryScope);
    this.setState({ recoveringChunk: true });

    void hardRecoverFromChunkError().catch((recoveryError) => {
      console.error("[ErrorBoundary] Chunk recovery failed:", recoveryError);
      this.setState({ recoveringChunk: false });
    });
  }

  private handleReload = () => {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    this.setState({ recoveringChunk: true });

    void clearStaleClientAssets().finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("__virelle_reload", Date.now().toString());
      window.location.replace(url.toString());
    });
  };

  private handleHome = () => {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      if (this.state.recoveringChunk) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-background p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <RotateCcw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Refreshing the studio…</p>
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

            <h2 className="text-2xl font-bold mb-2 gradient-text-gold">
              Cut — something broke on this take
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The studio hit an unexpected error on this view. Your project work is autosaved. Reload the studio to fetch the current app version, or return home.
            </p>

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
                onClick={this.handleReload}
                className={cn(
                  "flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg",
                  "bg-amber-500 text-primary-foreground font-medium",
                  "hover:opacity-90 transition-opacity cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload Studio
              </button>
              <button
                onClick={this.handleHome}
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
