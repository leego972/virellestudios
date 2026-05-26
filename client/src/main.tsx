import "@/lib/sentry";
  import "@/lib/analytics";
  import { trpc } from "@/lib/trpc";
  import { UNAUTHED_ERR_MSG } from '@shared/const';
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { httpBatchLink, TRPCClientError } from "@trpc/client";
  import { createRoot } from "react-dom/client";
  import superjson from "superjson";
  import { toast } from "sonner";
  import App from "./App";
  import "./index.css";

  // ── DEBUG: intercept React 18's silent render crashes ────────────────────────
  // React 18 production mode calls window.reportError() for uncaught render errors
  // (before any ErrorBoundary). On some iOS Safari versions this doesn't reach
  // window.onerror, so we patch it here to show the crash on screen.
  (window as any).__vlShowErr = function(msg: string) {
    const splash = document.getElementById('_vl_splash');
    if (splash) {
      // Show in splash
      const el = document.createElement('div');
      el.style.cssText = 'margin-top:20px;max-width:88vw;padding:10px 14px;background:#1a0000;border:1px solid #ff4444;border-radius:6px;color:#ff9999;font:11px/1.6 monospace;white-space:pre-wrap;word-break:break-all;text-align:left;';
      el.textContent = msg;
      splash.appendChild(el);
      // Show splash again in case it was hidden
      splash.style.opacity = '1';
      splash.style.zIndex = '999999';
      splash.style.pointerEvents = 'auto';
      const dots = document.getElementById('_vl_dots');
      if (dots) dots.style.display = 'none';
    } else {
      // Splash already removed — inject overlay directly
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;padding:32px;';
      el.innerHTML = '<div style="max-width:600px;padding:24px;border:1px solid #ff4444;border-radius:8px;background:#1a0000;"><p style="color:#ff6666;font:bold 14px monospace;margin:0 0 12px">VIRELLE — APP CRASH</p><pre id="_vl_err_pre" style="color:#ffaaaa;font:12px/1.6 monospace;white-space:pre-wrap;word-break:break-all;margin:0"></pre></div>';
      document.body.appendChild(el);
      const pre = document.getElementById('_vl_err_pre');
      if (pre) pre.textContent = msg;
    }
  };

  // Override window.reportError so React 18's internal errors reach us
  const _origReportError = (window as any).reportError;
  (window as any).reportError = function(err: unknown) {
    const msg = err instanceof Error ? (err.message + '
' + (err.stack || '')) : String(err);
    (window as any).__vlShowErr('React internal error:
' + msg);
    if (_origReportError) _origReportError.call(window, err);
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Never retry on auth/permission errors
          if (error instanceof TRPCClientError) {
            const code = error.data?.code;
            if (code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "NOT_FOUND") return false;
          }
          return failureCount < 2;
        },
        // Fresh for 60s, kept warm for 5min — cuts redundant fetches by ~70%
        // when users navigate between project tabs without changing data.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Register the service worker (PWA shell + offline fallback). Disabled in dev
  // to avoid caching Vite's HMR scripts.
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] Registration failed:", err));
    });
  }

  // Web Vitals — native PerformanceObserver (no extra dependency), prod only
    if (import.meta.env.PROD && typeof PerformanceObserver !== "undefined") {
      const sendVital = (name: string, value: number) => {
        const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
        if (typeof g === "function") {
          g("event", name, { event_category: "Web Vitals", value: Math.round(value), non_interaction: true });
        }
      };
      try { new PerformanceObserver((list) => {
        for (const e of list.getEntries()) sendVital("LCP", e.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* unsupported */ }
      try { let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!(e as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput)
            cls += (e as PerformanceEntry & { value: number }).value;
        }).observe({ type: "layout-shift", buffered: true });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") sendVital("CLS", cls * 1000);
        }, { once: true });
      } catch { /* unsupported */ }
      try { new PerformanceObserver((list) => {
        for (const e of list.getEntries()) sendVital("INP", (e as PerformanceEntry & { duration: number }).duration);
      }).observe({ type: "event", buffered: true }); } catch { /* unsupported */ }
    }

  const redirectToLoginIfUnauthorized = (error: unknown) => {
    if (!(error instanceof TRPCClientError)) return;
    if (typeof window === "undefined") return;

    const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
    if (!isUnauthorized) return;

    // Don't redirect if already on login/register/pricing/public pages
    const path = window.location.pathname;
    const PUBLIC_PATHS = ["/login", "/register", "/pricing", "/subscription", "/welcome", "/blog", "/about", "/contact", "/download", "/how-it-works", "/showcase", "/legal", "/share", "/terms", "/privacy"];
      if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"))) return;

    window.location.href = "/login";
  };

  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.query.state.error;
      redirectToLoginIfUnauthorized(error);
      if (import.meta.env.DEV) console.error("[API Query Error]", error);
    }
  });

  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.mutation.state.error;
      redirectToLoginIfUnauthorized(error);
      // Show a friendly toast for FORBIDDEN (e.g. expired tester, subscription gate)
      if (error instanceof TRPCClientError && error.data?.code === "FORBIDDEN") {
        // Only show if the error message is the expired tester message (not subscription gate)
        const msg = error.message;
        if (msg && msg.includes("trial has ended")) {
          toast.error(msg, {
            duration: 8000,
            action: {
              label: "Upgrade",
              onClick: () => { window.location.href = "/pricing"; },
            },
          });
        }
      }
      if (import.meta.env.DEV) console.error("[API Mutation Error]", error);
    }
  });

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });

  try {
    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("#root element not found in DOM");
    createRoot(rootEl, {
      onRecoverableError(err: unknown) {
        const m = err instanceof Error ? (err.message + '\n' + (err.stack || '')) : String(err);
        (window as any).__vlShowErr('React recoverable error:\n' + m);
      },
    }).render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    );
  } catch (err: unknown) {
    const m = err instanceof Error ? (err.message + '\n' + (err.stack || '')) : String(err);
    (window as any).__vlShowErr('createRoot crash:\n' + m);
  }
  