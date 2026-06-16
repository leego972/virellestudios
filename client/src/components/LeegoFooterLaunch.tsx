import LeegoLogo from "@/components/LeegoLogo";

  const CONTACT_EMAILS = [
    { label: "Support",        email: "studiosvirelle@gmail.com" },
    { label: "Billing",        email: "studiosvirelle@gmail.com" },
    { label: "Partnerships",   email: "studiosvirelle@gmail.com" },
    { label: "Press",          email: "studiosvirelle@gmail.com" },
    { label: "Legal & Privacy",email: "studiosvirelle@gmail.com" },
  ];

  const FOOTER_LINKS = {
    Company: [
      { label: "About",        href: "/about" },
      { label: "Showcase",     href: "/showcase" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "FAQ",          href: "/faq" },
      { label: "Pricing",      href: "/pricing" },
      { label: "Contact",      href: "/contact" },
    ],
    Legal: [
      { label: "Terms of Service",  href: "/terms" },
      { label: "Privacy Policy",    href: "/privacy" },
      { label: "AI Use Policy",     href: "/ai-use-policy" },
      { label: "Refund Policy",     href: "/refund-policy" },
      { label: "Acceptable Use",    href: "/acceptable-use" },
      { label: "IP & Copyright",    href: "/ip-policy" },
    ],
  };

  export default function LeegoFooterLaunch() {
    return (
      <footer className="w-full mt-16 border-t" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Main grid — contact emails + nav links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-8 mb-10">

            {/* Brand column */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <LeegoLogo alt="Leego" className="h-7 w-7 object-contain opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-foreground/80">Virelle Studios</p>
                  <p className="text-xs text-foreground/40">AI Film Production Platform</p>
                </div>
              </div>
              <p className="text-xs text-foreground/35 leading-relaxed max-w-[220px]">
                From screenplay to final export — one platform for every step of AI film production.
              </p>
              <div className="mt-4 space-y-1">
                {CONTACT_EMAILS.slice(0, 2).map(({ label, email }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-foreground/30 font-semibold w-14 shrink-0">{label}</span>
                    <a href={`mailto:${email}`} className="text-xs text-foreground/50 hover:text-amber-400 transition-colors">{email}</a>
                  </div>
                ))}
              </div>
            </div>

            {/* Company links */}
            <div className="col-span-1">
              <p className="text-[10px] uppercase tracking-widest text-foreground/35 font-semibold mb-3">Company</p>
              <ul className="space-y-2">
                {FOOTER_LINKS.Company.map(({ label, href }) => (
                  <li key={href}>
                    <a href={href} className="text-xs text-foreground/55 hover:text-amber-400 transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div className="col-span-1">
              <p className="text-[10px] uppercase tracking-widest text-foreground/35 font-semibold mb-3">Legal & Trust</p>
              <ul className="space-y-2">
                {FOOTER_LINKS.Legal.map(({ label, href }) => (
                  <li key={href}>
                    <a href={href} className="text-xs text-foreground/55 hover:text-amber-400 transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact emails column */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-foreground/35 font-semibold mb-3">Contact</p>
              <div className="space-y-2">
                {CONTACT_EMAILS.map(({ label, email }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[10px] text-foreground/30 uppercase tracking-widest">{label}</span>
                    <a href={`mailto:${email}`} className="text-xs text-foreground/55 hover:text-amber-400 transition-colors">{email}</a>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] mb-6" />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-foreground/25">
              © {new Date().getFullYear()} Virelle Studios. All rights reserved. Operated by Leego972.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-foreground/30">
              <a href="/terms"         className="hover:text-foreground/60 transition-colors">Terms</a>
              <span>·</span>
              <a href="/privacy"       className="hover:text-foreground/60 transition-colors">Privacy</a>
              <span>·</span>
              <a href="/ai-use-policy" className="hover:text-foreground/60 transition-colors">AI Policy</a>
              <span>·</span>
              <a href="/refund-policy" className="hover:text-foreground/60 transition-colors">Refunds</a>
              <span>·</span>
              <a href="mailto:studiosvirelle@gmail.com" className="hover:text-amber-400 transition-colors">studiosvirelle@gmail.com</a>
            </div>
          </div>

        </div>
      </footer>
    );
  }
  