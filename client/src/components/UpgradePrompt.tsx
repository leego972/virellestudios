import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Zap, Lock, ArrowRight, Camera, Film, CalendarDays } from "lucide-react";
import { HollywoodBadge } from "@/components/HollywoodIcon";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature?: string;
  // Accepts both canonical keys and legacy aliases
  requiredTier?: "indie" | "amateur" | "independent" | "creator" | "studio" | "industry" | "pro";
  currentTier?: string;
  className?: string;
  compact?: boolean;
}

// Three public-facing tiers: Indie, Creator, Industry.
// Legacy DB keys (independent, creator, studio) all map to Industry.
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
    price: "A$490/month or A$4,900/year",
    credits: "2,000 credits/month included",
  },
  independent: {
    name: "Industry",
    icon: Film,
    color: "text-violet-400",
    price: "A$1,490/month or A$14,900/year",
    credits: "6,000 credits/month included",
  },
  // Legacy aliases — all resolve to Industry
  creator: {
    name: "Industry",
    icon: Film,
    color: "text-violet-400",
    price: "A$1,490/month or A$14,900/year",
    credits: "6,000 credits/month included",
  },
  studio: {
    name: "Industry",
    icon: Film,
    color: "text-violet-400",
    price: "A$1,490/month or A$14,900/year",
    credits: "6,000 credits/month included",
  },
  industry: {
    name: "Industry",
    icon: Crown,
    color: "text-yellow-400",
    price: "Custom pricing",
    credits: "6,000+ credits/month",
  },
};

// Normalise any legacy key to the canonical 3-tier key for display purposes
function normaliseTier(tier: string): string {
  if (tier === "creator" || tier === "studio" || tier === "independent" || tier === "pro") return "independent";
  return tier;
}

// Tier-aware button class — matches Pricing.tsx tier colors
function tierButtonClass(normTier: string): string {
  if (normTier === "indie")       return "bg-emerald-600 hover:bg-emerald-500 text-white";
  if (normTier === "amateur")     return "bg-amber-600 hover:bg-amber-500 text-white";
  if (normTier === "independent") return "bg-violet-600 hover:bg-violet-500 text-white";
  return "bg-yellow-600 hover:bg-yellow-500 text-white"; // industry / contact sales
}

// Tier-aware border/bg class for the compact wrapper
function tierBorderClass(normTier: string): string {
  if (normTier === "indie")       return "border-emerald-500/30 bg-emerald-500/5";
  if (normTier === "amateur")     return "border-amber-500/30 bg-amber-500/5";
  if (normTier === "independent") return "border-violet-500/30 bg-violet-500/5";
  return "border-yellow-500/30 bg-yellow-500/5";
}

export function UpgradePrompt({
  feature,
  requiredTier = "independent",
  className = "",
  compact = false,
}: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const normTier = normaliseTier(requiredTier);
  const tier = TIER_DISPLAY[normTier] || TIER_DISPLAY.independent;
  const Icon = tier.icon;
  // Industry (sales-led) uses contact-sales flow; all three self-serve tiers use /pricing
  const isContactSales = normTier === "industry" && tier.price === "Custom pricing";

  if (compact) {
    const btnClass = tierButtonClass(normTier);
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${tierBorderClass(normTier)} ${className}`}>
        <Lock className={`w-4 h-4 ${tier.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {feature ? `${feature} requires ` : "Requires "}
            <span className={tier.color}>{tier.name}</span>
          </p>
          <p className="text-xs text-muted-foreground">{tier.price}</p>
        </div>
        {isContactSales ? (
          <Button
            size="sm"
            className={`${btnClass} shrink-0`}
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
            className={`${btnClass} shrink-0`}
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
              {isContactSales
                ? `Available on ${tier.name} — contact sales for pricing`
                : `Available from ${tier.name} — ${tier.price}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier info */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          normTier === "indie"        ? "border-blue-500/30 bg-blue-500/5" :
          normTier === "amateur"      ? "border-emerald-500/30 bg-emerald-500/5" :
          normTier === "independent"  ? "border-violet-500/30 bg-violet-500/5" :
          "border-yellow-500/30 bg-yellow-500/5"
        }`}>
          <HollywoodBadge tier={normTier === "indie" ? "indie" : normTier === "amateur" ? "creator" : "industry"} size={32} className="shrink-0" />
          <div>
            <p className={`text-sm font-semibold ${tier.color}`}>{tier.name}</p>
            <p className="text-xs text-muted-foreground">{tier.price}</p>
            <p className="text-xs text-muted-foreground">{tier.credits}</p>
          </div>
        </div>

        {/* Tier progression — 3 public tiers */}
        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { key: "indie",       badgeKey: "indie" as const,    label: "Indie",    color: "text-blue-400",    bg: "bg-blue-500/10" },
            { key: "amateur",     badgeKey: "creator" as const,  label: "Creator",  color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { key: "independent", badgeKey: "industry" as const, label: "Industry", color: "text-violet-400",  bg: "bg-violet-500/10" },
          ].map((t) => (
            <div
              key={t.key}
              className={`p-1.5 rounded flex flex-col items-center gap-0.5 ${
                t.key === normTier ? `${t.bg} ring-1 ring-current ${t.color}` : "opacity-40"
              }`}
            >
              <HollywoodBadge tier={t.badgeKey} size={20} />
              <span className="text-[9px] font-medium">{t.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {isContactSales ? (
          <div className="space-y-2">
            <Button
              className={`w-full ${tierButtonClass(normTier)}`}
              onClick={() => {
                window.location.href = `mailto:Studiosvirelle@gmail.com?subject=${encodeURIComponent(
                  `Virelle Studios — ${tier.name} Enquiry`
                )}`;
              }}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Discuss Enterprise Workflow
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
              className={`w-full ${tierButtonClass(normTier)}`}
              onClick={() => setLocation("/pricing")}
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to {tier.name}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Annual plans save ~17% · Founding members save 50% off first year
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
  requiredTier: "indie" | "amateur" | "independent" | "creator" | "studio" | "industry" | "pro";
  currentTier?: string;
  hasAccess: boolean;
}

export function FeatureGate({ children, feature, requiredTier, currentTier, hasAccess }: FeatureGateProps) {
  if (hasAccess) return <>{children}</>;
  return <UpgradePrompt feature={feature} requiredTier={requiredTier} currentTier={currentTier} />;
}

/**
 * Small inline badge showing membership tier — uses Hollywood branded badge images.
 */
export function IndieBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <HollywoodBadge tier="indie" size={22} />
    </span>
  );
}

export function CreatorBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <HollywoodBadge tier="creator" size={22} />
    </span>
  );
}

export function IndustryBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <HollywoodBadge tier="industry" size={22} />
    </span>
  );
}

// Backward-compat aliases
export function IndependentBadge() { return <IndustryBadge />; }
export function ProBadge() { return <IndustryBadge />; }

export default UpgradePrompt;
