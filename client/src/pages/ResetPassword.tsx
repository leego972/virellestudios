import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Film, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const validateQuery = trpc.auth.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setResetComplete(true);
      toast.success("Password reset successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    resetMutation.mutate({ token, newPassword: password });
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <GoldWatermark />
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="w-7 h-7 text-white" />
            </div>
          </div>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-xl">Invalid link</CardTitle>
              <CardDescription>This password reset link is missing a token. Please request a new one.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/forgot-password" className="text-sm text-amber-500 hover:text-amber-400 font-medium">
                Request a new reset link
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Token is invalid or expired
  if (validateQuery.data && !validateQuery.data.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <GoldWatermark />
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="w-7 h-7 text-white" />
            </div>
          </div>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-xl">Link expired</CardTitle>
              <CardDescription>This password reset link has expired or has already been used. Please request a new one.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/forgot-password" className="text-sm text-amber-500 hover:text-amber-400 font-medium">
                Request a new reset link
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <GoldWatermark />
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="w-7 h-7 text-white" />
            </div>
          </div>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-xl">Password reset!</CardTitle>
              <CardDescription>Your password has been updated successfully. You can now sign in with your new password.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (validateQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <GoldWatermark />
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Film className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Virelle Studios</h1>
            <p className="text-sm text-muted-foreground mt-1">Set a new password</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Reset password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    enterKeyHint="next"
                    autoFocus
                    disabled={resetMutation.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  disabled={resetMutation.isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
              <Link href="/login" className="text-sm text-amber-500 hover:text-amber-400 font-medium text-center">
                <ArrowLeft className="w-3 h-3 inline mr-1" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
      <LeegoFooter />
    </div>
  );
}
