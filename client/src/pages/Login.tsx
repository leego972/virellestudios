import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Welcome back!");
      navigate("/");
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full max-w-3xl">
        {/* Left side: Login form */}
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

          {/* Login Card */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-center">Sign in</CardTitle>
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
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <Link href="/forgot-password" className="text-sm text-amber-500 hover:text-amber-400 font-medium text-center">
                  Forgot your password?
                </Link>
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-amber-500 hover:text-amber-400 font-medium">
                    Create one
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right side on desktop / Below on mobile: Leego logo */}
        <div className="flex-shrink-0 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300">
          <img
            src="/leego-logo.png"
            alt="Created by Leego"
            className="h-28 sm:h-32 lg:h-40 w-auto object-contain"
            style={{
              mixBlendMode: "lighten",
              filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6)) drop-shadow(0 0 20px rgba(34, 197, 94, 0.4)) drop-shadow(0 0 40px rgba(34, 197, 94, 0.2))",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
