import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, UserPlus } from "lucide-react";
import GoldWatermark from "@/components/GoldWatermark";
import StudioOpener from "@/components/StudioOpener";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOpener, setShowOpener] = useState(false);

  // Show OAuth error if redirected back with error param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth_failed") {
      toast.error("OAuth sign-in failed. Please try again or use email/password.");
      // Clean the URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Welcome back!");
      // Show the studio opener splash screen
      setShowOpener(true);
    },
    onError: (err) => {
      toast.error(err.message || "Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleOpenerComplete = () => {
    setShowOpener(false);
    navigate("/");
  };

  // Show the studio opener fullscreen
  if (showOpener) {
    return <StudioOpener onComplete={handleOpenerComplete} mode="login" skippable />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <GoldWatermark />
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full max-w-3xl">
        {/* Left side: Login form */}
        <div className="w-full max-w-sm space-y-6">
          {/* Virelle Studios Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Outer ambient glow */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 300,
                  height: 300,
                  background: "radial-gradient(ellipse at center, rgba(180,100,10,0.35) 0%, rgba(120,60,5,0.18) 35%, transparent 70%)",
                }}
              />
              {/* Inner glow ring */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 170,
                  height: 170,
                  background: "radial-gradient(ellipse at center, rgba(210,130,20,0.28) 0%, transparent 70%)",
                }}
              />
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
                alt="Virelle Studios"
                className="relative z-10 w-32 h-32 rounded-2xl"
                style={{ boxShadow: "0 0 40px 8px rgba(180,100,10,0.45), 0 0 80px 20px rgba(120,60,5,0.25)" }}
                draggable={false}
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Virelle Studios</h1>
              <p className="text-sm text-muted-foreground mt-1">Create Hollywood grade productions with AI</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-center">Sign In</CardTitle>
              <CardDescription className="text-center">Enter your email and password to continue</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    enterKeyHint="next"
                    autoFocus
                    disabled={loginMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      enterKeyHint="done"
                      disabled={loginMutation.isPending}
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
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-amber-500 hover:text-amber-400 font-medium">
                    Forgot password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative w-full my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or continue with</span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <a
                    href="/api/auth/google"
                    className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </a>
                  <a
                    href="/api/auth/github"
                    className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </a>
                </div>

                {/* Sign Up CTA */}
                <div className="w-full pt-2">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-600/5 p-3.5">
                    <p className="text-sm text-muted-foreground text-center mb-2.5">
                      Don't have an account?
                    </p>
                    <Link href="/register" className="block">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-amber-500/40 text-amber-500 hover:bg-amber-600/10 hover:text-amber-400 font-semibold"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right side on desktop / Below on mobile: Leego logo */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <img
            src="/leego-logo.png"
            alt="Created by Leego"
            className="h-28 sm:h-32 lg:h-40 w-auto object-contain leego-glow"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
