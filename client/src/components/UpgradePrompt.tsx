import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Lock, ArrowRight, Camera, Film, Building2, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature?: string;
  // Accepts both DB keys (amateur/independent/studio/industry) and backward-compat names (creator/pro)
  requiredTier?: "indie" | "amateur" | "independent" | "studio" | "industry" | "creator" | "pro";
  currentTier?: string;
  className?: string;
  compact?: boolean;
}

// Tier display names — internal DB keys map to public-facing names
const TIER_DISPLAY: Record<string, { name: string; icon: React.ElementType; color: string; price: string; credits: string }> = {
  indie: {
    name: "Indie",
    icon: Zap,
    color: "text-blue-400",
    price: "A$149/month or A$1,490/year",
    credits: "500 credits/month included",
  },
  amateur: {
    name: "Creator",
    icon: Camera,
    color: "text-emerald-400",
    price: "A$1,250/month or A$12,000/year",
    credits: "2,000 credits/month included",
  },
  independent: {
    name: "Studio",
    icon: Film,
    color: "text-amber-400",
    price: "A$3,900/month or A$36,000/year",
    credits: "5,500 credits/month included",
  },
  studio: {
    name: "Production",
    icon: Building2,
    color: "text-violet-400",
    price: "From A$150,000/year",
    credits: "15,500 credits/month included",
  },
  industry: {
    name: "Enterprise",
    icon: Crown,
    color: "text-yellow-400",
    price: "Custom pricing",
    credits: "50,500+ credits/month",
  },
};

export function UpgradePrompt({
  feature,
  requiredTier = "independent",
  className = "",
  compact = false,
}: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const tier = TIER_DISPLAY[requiredTier] || TIER_DISPLAY.independent;
  const Icon = tier.icon;
  const isEnterprise = requiredTier === "studio" || requiredTier === "industry";

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 ${className}`}>
        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {feature ? `${feature} requires ` : "Requires "}
            <span className={tier.color}>{tier.name}</span>
          </p>
          <p className="text-xs text-muted-foreground">{tier.price}</p>
        </div>
        {isEnterprise ? (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
            onClick={() => {
              window.location.href = `mailto:Studiosvirelle@gmail.com?subject=${encodeURIComponent(
                `Virelle Studios — ${tier.name} Enquiry`
              )}`;
            }}
          >
            <CalendarDays className="w-3 h-3 mr-1" />
            Contact Sales
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
            onClick={() => setLocation("/pricing")}
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-amber-500/30 bg-amber-500/5 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base">
              {feature ? `${feature} is locked` : "Feature locked"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {isEnterprise
                ? `Available on ${tier.name} — contact sales for pricing`
                : `Available from ${tier.name} — ${tier.price}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier info */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          requiredTier === "amateur" ? "border-emerald-500/30 bg-emerald-500/5" :
          requiredTier === "independent" ? "border-amber-500/30 bg-amber-500/5" :
          requiredTier === "studio" ? "border-violet-500/30 bg-violet-500/5" :
          "border-yellow-500/30 bg-yellow-500/5"
        }`}>
          <Icon className={`w-5 h-5 ${tier.color} shrink-0`} />
          <div>
            <p className={`text-sm font-semibold ${tier.color}`}>{tier.name}</p>
            <p className="text-xs text-muted-foreground">{tier.price}</p>
            <p className="text-xs text-muted-foreground">{tier.credits}</p>
          </div>
        </div>

        {/* Tier progression */}
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { key: "amateur",     label: "Creator",     color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { key: "independent", label: "Studio",      color: "text-amber-400",   bg: "bg-amber-500/10" },
            { key: "studio",      label: "Production",  color: "text-violet-400",  bg: "bg-violet-500/10" },
            { key: "industry",    label: "Enterprise",  color: "text-yellow-400",  bg: "bg-yellow-500/10" },
          ].map((t) => (
            <div
              key={t.key}
              className={`p-1.5 rounded text-[10px] font-medium ${
                t.key === requiredTier ? `${t.bg} ${t.color} ring-1 ring-current` : "text-muted-foreground"
              }`}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        {isEnterprise ? (
          <div className="space-y-2">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              onClick={() => {
                window.location.href = `mailto:Studiosvirelle@gmail.com?subject=${encodeURIComponent(
                  `Virelle Studios — ${tier.name} Enquiry`
                )}`;
              }}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {requiredTier === "studio" ? "Book a Private Demo" : "Discuss Enterprise Workflow"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setLocation("/pricing")}
            >
              View all plans
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              onClick={() => setLocation("/pricing")}
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to {tier.name}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Annual plans save ~20% · Founding members save 50% off first year
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  requiredTier: "indie" | "amateur" | "independent" | "studio" | "industry" | "creator" | "pro";
  currentTier?: string;
  hasAccess: boolean;
}

export function FeatureGate({ children, feature, requiredTier, currentTier, hasAccess }: FeatureGateProps) {
  if (hasAccess) return <>{children}</>;
  return <UpgradePrompt feature={feature} requiredTier={requiredTier} currentTier={currentTier} />;
}

/**
 * Small inline badge showing membership tier.
 */
export function IndependentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Film className="w-2.5 h-2.5" /> INDEPENDENT
    </span>
  );
}

// Backward compat aliases
export function CreatorBadge() {
  return <IndependentBadge />;
}

export function ProBadge() {
  return <IndustryBadge />;
}

export function IndustryBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-500 border border-violet-500/20">
      <Zap className="w-2.5 h-2.5" /> INDUSTRY
    </span>
  );
}


export default UpgradePrompt;
