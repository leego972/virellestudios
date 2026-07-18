import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Smartphone } from "lucide-react";

export default function MobileAuthBridge() {
  const [, navigate] = useLocation();
  const attempted = useRef(false);
  const me = trpc.auth.me.useQuery();
  const tokenMutation = trpc.mobileAuth.createSwappysToken.useMutation({
    onSuccess: ({ token }) => {
      const callback = `swappys://auth?token=${encodeURIComponent(token)}`;
      window.location.assign(callback);
    },
  });

  useEffect(() => {
    if (me.isLoading || attempted.current) return;
    if (!me.data) {
      navigate(`/login?returnTo=${encodeURIComponent("/mobile-auth/swappys")}`);
      return;
    }
    attempted.current = true;
    tokenMutation.mutate();
  }, [me.data, me.isLoading, navigate, tokenMutation]);

  const retry = () => {
    attempted.current = true;
    tokenMutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SiteHead title="Connect Swappys" description="Securely connect your Virelle Studios account to the Swappys daughter app." />
      <Card className="w-full max-w-md border-amber-500/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <CardTitle>Connect Swappys</CardTitle>
          <CardDescription>
            Virelle is issuing a seven-day, Swappys-only access token. It cannot be used to access unrelated studio tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {tokenMutation.isPending || me.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Returning securely to Swappys…
            </div>
          ) : tokenMutation.error ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{tokenMutation.error.message || "The secure mobile connection could not be completed."}</span>
              </div>
              <Button type="button" className="min-h-11 w-full" onClick={retry}>Try again</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Account verified. Opening Swappys…
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This page should close automatically. Return to the Swappys app if your browser remains open.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
