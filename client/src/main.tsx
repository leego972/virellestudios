import "@/lib/sentry";
import "@/lib/analytics";
import AutomaticContrastGuard from "@/components/AutomaticContrastGuard";
import DesignerCommercePanel from "@/components/DesignerCommercePanel";
import GlobalMediaPlayerControls from "@/components/GlobalMediaPlayerControls";
import GlobalSidebarLogoutConfirm from "@/components/GlobalSidebarLogoutConfirm";
import LandingVerifiedAppsGuard from "@/components/LandingVerifiedAppsGuard";
import PitchDeckExportOverlay from "@/components/PitchDeckExportOverlay";
import PortalAccessBoundary from "@/components/PortalAccessBoundary";
import PortalEntryLinks from "@/components/PortalEntryLinks";
import RequiredSignupAddressCapture from "@/components/RequiredSignupAddressCapture";
import StoryboardShotWorkspaceOverlay from "@/components/StoryboardShotWorkspaceOverlay";
import ThirdPartyDesignerMarketplaceOverlay from "@/components/ThirdPartyDesignerMarketplaceOverlay";
import TimelineEditSuiteOverlay from "@/components/TimelineEditSuiteOverlay";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import "./index.css";
import "./mobile-safari.css";
import "./mobile-sidebar-contrast.css";
import "./white-surface-text.css";
import "./director-mask-identity.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          const code = error.data?.code;
          if (
            code === "UNAUTHORIZED" ||
            code === "FORBIDDEN" ||
            code === "NOT_FOUND"
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(error => console.warn("[SW] Registration failed:", error));
  });
}

if (import.meta.env.PROD && typeof PerformanceObserver !== "undefined") {
  const sendVital = (name: string, value: number) => {
    const gtag = (
      window as unknown as { gtag?: (...args: unknown[]) => void }
    ).gtag;
    if (typeof gtag === "function") {
      gtag("event", name, {
        event_category: "Web Vitals",
        value: Math.round(value),
        non_interaction: true,
      });
    }
  };

  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        sendVital("LCP", entry.startTime);
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Unsupported browser.
  }

  try {
    let cumulativeLayoutShift = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (
          !(entry as PerformanceEntry & { hadRecentInput: boolean })
            .hadRecentInput
        ) {
          cumulativeLayoutShift += (
            entry as PerformanceEntry & { value: number }
          ).value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") {
          sendVital("CLS", cumulativeLayoutShift * 1000);
        }
      },
      { once: true },
    );
  } catch {
    // Unsupported browser.
  }

  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        sendVital(
          "INP",
          (entry as PerformanceEntry & { duration: number }).duration,
        );
      }
    }).observe({ type: "event", buffered: true });
  } catch {
    // Unsupported browser.
  }
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;

  const path = window.location.pathname;
  const publicPaths = [
    "/login",
    "/register",
    "/designer-register",
    "/pricing",
    "/subscription",
    "/welcome",
    "/blog",
    "/about",
    "/contact",
    "/download",
    "/how-it-works",
    "/showcase",
    "/legal",
    "/share",
    "/terms",
    "/privacy",
    "/wardrobe-marketplace",
  ];
  if (
    publicPaths.some(
      publicPath =>
        path === publicPath || path.startsWith(`${publicPath}/`),
    )
  ) {
    return;
  }
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
    if (
      error instanceof TRPCClientError &&
      error.data?.code === "FORBIDDEN"
    ) {
      const message = error.message;
      if (message?.includes("trial has ended")) {
        toast.error(message, {
          duration: 8000,
          action: {
            label: "Upgrade",
            onClick: () => {
              window.location.href = "/pricing";
            },
          },
        });
      }
      if (message?.includes("INSUFFICIENT_CREDITS")) {
        toast.error("You've run out of credits — top up to keep creating.", {
          duration: 10000,
          action: {
            label: "Top Up",
            onClick: () => {
              window.location.href = "/pricing#credit-packs";
            },
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
      <AutomaticContrastGuard />
      <GlobalSidebarLogoutConfirm />
      <LandingVerifiedAppsGuard />
      <PortalAccessBoundary />
      <PortalEntryLinks />
      <RequiredSignupAddressCapture />
      <DesignerCommercePanel />
      <ThirdPartyDesignerMarketplaceOverlay />
      <App />
      <StoryboardShotWorkspaceOverlay />
      <TimelineEditSuiteOverlay />
      <PitchDeckExportOverlay />
      <GlobalMediaPlayerControls />
    </QueryClientProvider>
  </trpc.Provider>,
);
