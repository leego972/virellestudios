import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Gift } from "lucide-react";
import LeegoFooter from "@/components/LeegoFooter";

export default function Register() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // Extract referral code from URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchString]);

  const utils = trpc.useUtils();
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Account created! Welcome to Virelle Studios.");
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
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
    registerMutation.mutate({ email, password, name, referralCode: referralCode || undefined });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Virelle Studios Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/apple-touch-icon.png"
            alt="Virelle Studios"
            className="w-24 h-24 rounded-2xl shadow-lg shadow-amber-500/20"
            draggable={false}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Virelle Studios</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered film production</p>
          </div>
        </div>

        {/* Referral Banner */}
        {referralCode && (
          <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm">
            <Gift className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-amber-400">
              You've been referred! Sign up to get <strong>3 bonus AI generations</strong> free.
            </span>
          </div>
        )}

        {/* Register Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Create an account</CardTitle>
            <CardDescription className="text-center">Enter your details to get started</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={registerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={registerMutation.isPending}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={registerMutation.isPending}
                />
              </div>

              {/* Referral code field - pre-filled if from URL, but editable */}
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  Referral Code
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  disabled={registerMutation.isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Leego Footer */}
      <div className="mt-8">
        <LeegoFooter />
      </div>
    </div>
  );
}
