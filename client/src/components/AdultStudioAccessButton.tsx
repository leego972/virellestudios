import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ADULT_STUDIO_ICON = "/icons/tools/visual_effects.svg";

export default function AdultStudioAccessButton() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const statusQuery = (trpc as any).virelleBroadcastRender.getMatureAccessStatus.useQuery();
  const [reauthOpen, setReauthOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const accessGranted = Boolean(statusQuery.data?.accessGranted);

  const handleEntry = () => {
    if (!accessGranted) {
      setLocation("/adult-studio");
      return;
    }

    setPassword("");
    setReauthOpen(true);
  };

  const verifyPasswordAndEnter = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = String(user?.email || "").trim();

    if (!email) {
      toast.error("Your account email could not be confirmed. Please sign in again.");
      return;
    }
    if (!password) {
      toast.error("Enter your password to continue.");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Password verification failed");
      }

      setPassword("");
      setReauthOpen(false);
      setLocation("/adult-studio");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleEntry}
        aria-label={accessGranted ? "Unlock Adult Studio" : "Begin Adult Studio verification"}
        className="group w-full overflow-hidden rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-black/40">
              <img
                src={ADULT_STUDIO_ICON}
                alt=""
                className="h-7 w-7 object-contain opacity-80"
                draggable={false}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-start gap-2 min-[430px]:flex-row min-[430px]:items-center">
                <span className="text-base font-semibold leading-tight text-foreground">
                  Adult Studio
                </span>
                <span className="max-w-full rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-400">
                  18+ verified access
                </span>
              </div>
              <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                {accessGranted
                  ? "Verified members must confirm their password each time before entering."
                  : "Complete age, identity, eligibility, terms and membership verification before access is activated."}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 transition-colors group-hover:bg-amber-500/15 group-hover:text-amber-300 sm:w-auto sm:justify-start">
            {accessGranted ? <KeyRound className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
            <span className="whitespace-nowrap">
              {accessGranted ? "Unlock Adult Studio" : "Begin verification"}
            </span>
          </div>
        </div>
      </button>

      <Dialog open={reauthOpen} onOpenChange={(open) => {
        if (!isVerifying) {
          setReauthOpen(open);
          if (!open) setPassword("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={verifyPasswordAndEnter}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                Confirm password
              </DialogTitle>
              <DialogDescription>
                Re-enter your Virelle password to unlock Adult Studio for this session.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-5">
              <Label htmlFor="adult-studio-password">Password</Label>
              <Input
                id="adult-studio-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={isVerifying}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReauthOpen(false)}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isVerifying || !password}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Enter Adult Studio"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
