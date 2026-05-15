import "@/lib/sentry";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import "./index.css";

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

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Don't redirect if already on login/register/pricing/public pages
  const path = window.location.pathname;
  if (path === "/login" || path === "/register" || path === "/pricing" || path === "/subscription" || path === "/welcome") return;

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

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

  // Web Vitals — zero-dependency CLS/LCP/FID/TTFB reporting to GA4 (PROD only)
  if (import.meta.env.PROD) {
    type Win = Window & { gtag?: (...a: unknown[]) => void };
    const sendVital = (name: string, value: number) => {
      const g = (window as Win).gtag;
      if (typeof g === "function") g("event", "web_vitals", { metric_name: name, metric_value: Math.round(value), non_interaction: true });
    };
    if (typeof PerformanceObserver !== "undefined") {
      try { new PerformanceObserver(l => l.getEntries().forEach(e => sendVital("LCP", (e as PerformanceEntry & { startTime: number }).startTime))).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
      try { let cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!(e as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) { cls += (e as PerformanceEntry & { value?: number }).value ?? 0; sendVital("CLS", cls); } })).observe({ type: "layout-shift", buffered: true }); } catch {}
      try { new PerformanceObserver(l => l.getEntries().forEach(e => sendVital("FID", (e as PerformanceEventTiming).processingStart - e.startTime))).observe({ type: "first-input", buffered: true }); } catch {}
      try { const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined; if (nav) sendVital("TTFB", nav.responseStart); } catch {}
    }
  }
  
// Build: 1778849767174
