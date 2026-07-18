import VSWatermark from "@/components/VSWatermark";
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Film, Loader2, ArrowLeft, Mail } from "lucide-react";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error(err.message || "We couldn't send the reset email right now. Please try again in a moment.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    resetMutation.mutate({ email, origin: window.location.origin });
  };

  return (
    <div
      className="relative isolate flex min-h-[100dvh] w-full min-w-0 flex-col overflow-x-hidden"
      style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}
    >
      <VSWatermark />

      <main className="relative z-10 flex w-full min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full min-w-0 max-w-md space-y-6 sm:space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
              <Film className="h-7 w-7 text-white" />
            </div>
            <div className="w-full min-w-0 text-center">
              <h1 className="break-normal text-2xl font-bold tracking-tight text-gold-shimmer">Virelle Studios</h1>
              <p className="mt-1 break-normal text-sm text-muted-foreground">AI-powered film production</p>
            </div>
          </div>

          <Card className="w-full min-w-0 overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-amber-500/5 backdrop-blur-sm transition-shadow hover:shadow-amber-500/20 glass-card gold-glow">
            {submitted ? (
              <>
                <CardHeader className="min-w-0 space-y-1 pb-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <Mail className="h-6 w-6 text-amber-500" />
                  </div>
                  <CardTitle className="break-normal text-xl gradient-text-gold">Check your email</CardTitle>
                  <CardDescription className="break-words">
                    If an account with <span className="font-medium text-foreground">{email}</span> exists,
                    you&apos;ll receive a password reset link shortly.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex min-w-0 flex-col gap-4 pt-2">
                  <Button
                    variant="outline"
                    className="min-h-11 w-full whitespace-normal hover:border-amber-500/50 hover:text-amber-400"
                    onClick={() => { setSubmitted(false); setEmail(""); }}
                  >
                    Try a different email
                  </Button>
                  <Link href="/login" className="inline-flex min-h-11 w-full items-center justify-center break-normal text-center text-sm font-medium text-amber-500 hover:text-amber-400">
                    <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
                    Back to sign in
                  </Link>
                </CardFooter>
              </>
            ) : (
              <>
                <CardHeader className="min-w-0 space-y-1 pb-4">
                  <CardTitle className="break-normal text-xl gradient-text-gold">Forgot password</CardTitle>
                  <CardDescription className="break-normal">Enter your email and we&apos;ll send you a reset link</CardDescription>
                </CardHeader>
                <form className="min-w-0" onSubmit={handleSubmit}>
                  <CardContent className="min-w-0 space-y-4">
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        className="min-h-11 w-full min-w-0"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="email"
                        enterKeyHint="send"
                        autoFocus
                        disabled={resetMutation.isPending}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex min-w-0 flex-col gap-4 pt-2">
                    <Button
                      type="submit"
                      className="min-h-11 w-full whitespace-normal bg-amber-600 text-white hover:bg-amber-700"
                      disabled={resetMutation.isPending}
                    >
                      {resetMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-amber-400" />
                          Sending...
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                    <Link href="/login" className="inline-flex min-h-11 w-full items-center justify-center break-normal text-center text-sm font-medium text-amber-500 hover:text-amber-400">
                      <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
                      Back to sign in
                    </Link>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>
        </div>
      </main>

      <div className="relative z-10 w-full shrink-0 overflow-hidden">
        <LeegoFooterLaunch />
      </div>
    </div>
  );
}
