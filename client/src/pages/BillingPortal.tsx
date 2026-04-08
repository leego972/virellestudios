/**
 * BillingPortal.tsx
 *
 * Auto-redirect page that creates a Stripe billing portal session and
 * immediately redirects the user to it.
 *
 * Used by the mobile app via:
 *   https://virellestudios.com/billing/portal?source=mobile
 *
 * The Stripe portal return_url is set to:
 *   - virelle://billing/callback  (when source=mobile)
 *   - /settings?tab=billing       (web)
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function BillingPortal() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const isMobile = params.get("source") === "mobile";

  const portalMutation = trpc.subscription.createBillingPortal.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => {
      setError(e.message || "Could not open billing portal. Please try again.");
    },
  });

  useEffect(() => {
    const returnUrl = isMobile
      ? "virelle://billing/callback?subscription=portal_return"
      : `${window.location.origin}/settings?tab=billing`;
    portalMutation.mutate({ returnUrl });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          className="text-amber-400 underline text-sm"
          onClick={() => isMobile ? window.close() : setLocation("/settings?tab=billing")}
        >
          {isMobile ? "Close this page" : "Back to Settings"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      <p className="text-zinc-300 text-base">Opening billing portal…</p>
    </div>
  );
}
