import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, CreditCard, RefreshCw, AlertCircle, CheckCircle2, Mail, Zap, Clock } from "lucide-react";
  import GoldWatermark from "@/components/GoldWatermark";
  import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";

  export default function RefundPolicy() {
    const [, setLocation] = useLocation();

    return (
      <div className="min-h-screen text-foreground relative" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <GoldWatermark />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>

          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center shrink-0">
              <CreditCard className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Refund & Credit Policy</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Last updated: June 2026 · Effective immediately</p>
            </div>
          </div>

          {/* Plain-language summary */}
          <div className="mt-6 mb-10 p-5 rounded-xl bg-amber-600/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-bold text-sm uppercase tracking-wider mb-2">Plain-Language Summary</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>7-day trial: cancel before it ends and you owe nothing.</li>
                  <li>Credits consumed before a refund request cannot be refunded.</li>
                  <li>If an AI generation fails and no output is delivered, credits are restored automatically.</li>
                  <li>Credit packs are non-refundable once purchased, except where required by law.</li>
                  <li>Subscription refunds are assessed case-by-case within 48 hours of the billing date.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

            {/* 1. Free Trial */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Clock className="w-4 h-4 text-amber-400" />
                1. 7-Day Free Trial
              </h2>
              <p>
                Every new subscription starts with a 7-day free trial. A valid payment method is required at signup. You will not be charged until the trial period ends. If you cancel your subscription before the 7 days are up, your card will not be charged and the subscription will not activate.
              </p>
              <p className="mt-3">
                To cancel during the trial, go to <strong className="text-foreground">Settings → Billing → Cancel Subscription</strong>. Cancellation takes effect immediately — you will retain access until the end of the trial period, after which no further charges are made.
              </p>
            </section>

            {/* 2. Subscriptions */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                2. Subscription Billing & Refunds
              </h2>
              <p>
                Subscription fees are billed at the start of each billing period (monthly or annually). By subscribing, you authorise Virelle Studios to charge your payment method automatically at each renewal until you cancel.
              </p>
              <p className="mt-3"><strong className="text-foreground">Refund eligibility:</strong></p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Refund requests submitted within 48 hours of a billing event and where fewer than 10% of the period's included credits have been consumed may be considered at our discretion.</li>
                <li>Refund requests submitted after 48 hours of a billing event are generally not eligible.</li>
                <li>Credits consumed prior to a refund request are deducted from any refund amount at the plan's per-credit rate.</li>
                <li>Annual plans that are refunded mid-year are calculated on a pro-rata basis minus consumed credits, minus a processing fee of A$15.</li>
              </ul>
              <p className="mt-3">
                Virelle Studios does not guarantee refunds. Refunds are provided where we determine, at our sole discretion, that they are fair and appropriate given the circumstances of the request.
              </p>
            </section>

            {/* 3. Upgrades & Downgrades */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Zap className="w-4 h-4 text-amber-400" />
                3. Plan Changes
              </h2>
              <p><strong className="text-foreground">Upgrades</strong> take effect immediately. You are charged the prorated difference for the remainder of the current billing period. Your credit balance is always preserved in full.</p>
              <p className="mt-3"><strong className="text-foreground">Downgrades</strong> take effect at the start of the next billing period. You continue to have access to your current plan's features until that date. Your credit balance is always preserved in full — unused credits do not reset on a plan change.</p>
              <p className="mt-3"><strong className="text-foreground">Cancellation</strong> takes effect at the end of the current billing period. You retain access to your plan features and credits until that date. Credits in your balance expire 90 days after the subscription end date unless you reactivate.</p>
            </section>

            {/* 4. Credit Packs */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <CreditCard className="w-4 h-4 text-amber-400" />
                4. Credit Packs (Top-Up Purchases)
              </h2>
              <p>
                Credit packs are one-time purchases that add credits to your balance immediately upon payment. Because credits are a digital consumable that is delivered instantly, credit packs are <strong className="text-foreground">non-refundable once purchased</strong>, except where required by applicable consumer protection law in your jurisdiction.
              </p>
              <p className="mt-3">
                Credits in your balance never expire while your subscription is active. If your subscription lapses, remaining credits are held for 90 days. Reactivating your subscription before that period restores full access to your credit balance.
              </p>
            </section>

            {/* 5. Failed Generations */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                5. Failed or Incomplete AI Generations
              </h2>
              <p>
                If an AI generation task fails entirely — meaning no output is produced and the generation is marked as failed in your project — the credits consumed for that request are automatically restored to your balance within 24 hours. You do not need to contact us to request this restoration.
              </p>
              <p className="mt-3">
                If a generation produces partial or lower-quality output but is not marked as fully failed, credits are not automatically restored. If you believe the output is materially defective, contact support at <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> with the project ID and scene reference. We will review and restore credits at our discretion where the output clearly fails to meet reasonable expectations.
              </p>
              <p className="mt-3">
                Virelle Studios is not liable for generation failures caused by third-party AI providers (including Runway, ElevenLabs, OpenAI, fal.ai, or Google), provider outages, or network interruptions. We will work to restore affected credits promptly but cannot guarantee the quality or availability of any specific third-party AI model.
              </p>
            </section>

            {/* 6. Founding Director Offer */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                6. Founding Director Discount
              </h2>
              <p>
                The Founding Director offer (50% off the first year on annual plans) is applied at checkout and reflected in your subscription price from the first billing date. The discount applies to the first 12 months only. Standard pricing applies at renewal. The discount cannot be combined with other promotional codes or applied retroactively.
              </p>
            </section>

            {/* 7. How to Request */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Mail className="w-4 h-4 text-amber-400" />
                7. How to Submit a Refund Request
              </h2>
              <p>To submit a refund request:</p>
              <ol className="list-decimal pl-6 space-y-2 mt-2">
                <li>Email <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> with the subject line <strong className="text-foreground">Refund Request — [your account email]</strong>.</li>
                <li>Include your account email, the billing date in question, and the reason for your request.</li>
                <li>We will acknowledge your request within 2 business days and issue a decision within 5 business days.</li>
                <li>Approved refunds are processed via the original payment method. Processing time is typically 5–10 business days depending on your bank or card issuer.</li>
              </ol>
            </section>

            {/* 8. Consumer Law */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                8. Consumer Guarantees
              </h2>
              <p>
                Nothing in this policy limits or excludes rights you may have under applicable consumer protection legislation, including the Australian Consumer Law (ACL) or equivalent legislation in your jurisdiction. If you have a right to a remedy under consumer law, this policy does not override it.
              </p>
            </section>

          </div>

          <div className="mt-12 p-5 rounded-xl bg-zinc-900/50 border border-amber-500/15 text-xs text-muted-foreground">
            <p>Questions about this policy? Contact <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>. For billing disputes, please include your Stripe receipt number.</p>
          </div>
        </div>
        <LeegoFooterLaunch />
      </div>
    );
  }
  