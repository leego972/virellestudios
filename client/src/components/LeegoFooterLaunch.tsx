const CONTACT_EMAILS = [
  { label: "Support", email: "studiosvirelle@gmail.com" },
  { label: "Billing", email: "studiosvirelle@gmail.com" },
  { label: "Partnerships", email: "studiosvirelle@gmail.com" },
  { label: "Press", email: "studiosvirelle@gmail.com" },
  { label: "Legal & Privacy", email: "studiosvirelle@gmail.com" },
];

const FOOTER_LINKS = {
  Company: [
    { label: "About", href: "/about" },
    { label: "Showcase", href: "/showcase" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "FAQ", href: "/faq" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
    { label: "Designers", href: "/designers" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "AI Use Policy", href: "/ai-use-policy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Acceptable Use", href: "/acceptable-use" },
    { label: "IP & Copyright", href: "/ip-policy" },
  ],
};

export default function LeegoFooterLaunch() {
  return (
    <footer className="mt-8 w-full border-t border-border/50 bg-card/35 text-foreground backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/virelle-logo-square.png"
                alt="Virelle Studios"
                className="h-10 w-10 shrink-0 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Virelle Studios</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  AI Film Production Platform
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
              From screenplay to final export — one platform for every step of AI
              film production.
            </p>
            <a
              href="mailto:studiosvirelle@gmail.com"
              className="mt-3 inline-block text-xs text-muted-foreground transition-colors hover:text-amber-400"
            >
              studiosvirelle@gmail.com
            </a>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Company
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:block sm:space-y-1.5">
              {FOOTER_LINKS.Company.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="block text-xs text-muted-foreground transition-colors hover:text-amber-400"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Legal & Trust
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:block sm:space-y-1.5">
              {FOOTER_LINKS.Legal.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="block text-xs text-muted-foreground transition-colors hover:text-amber-400"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Contact
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-1">
              {CONTACT_EMAILS.map(({ label, email }) => (
                <div key={label} className="min-w-0">
                  <p className="truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
                    {label}
                  </p>
                  <a
                    href={`mailto:${email}`}
                    className="block truncate text-[11px] text-muted-foreground transition-colors hover:text-amber-400"
                  >
                    {email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border/50 pt-4 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Virelle Studios. All rights reserved.
            Operated by Leego972.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
            <span aria-hidden="true">·</span>
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/ai-use-policy" className="hover:text-foreground">
              AI Policy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/refund-policy" className="hover:text-foreground">
              Refunds
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
