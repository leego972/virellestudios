import LeegoLogo from "@/components/LeegoLogo";

/**
 * LeegoFooter — production / launch version.
 * Clean, restrained footer with professional contact emails.
 */
const CONTACT_EMAILS = [
  { label: "Support", email: "studiosvirelle@gmail.com" },
  { label: "Billing", email: "studiosvirelle@gmail.com" },
  { label: "Partnerships", email: "studiosvirelle@gmail.com" },
  { label: "Press", email: "studiosvirelle@gmail.com" },
  { label: "Legal & Privacy", email: "studiosvirelle@gmail.com" },
];

export default function LeegoFooter() {
  return (
    <footer className="w-full mt-16 border-t" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.95)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Contact emails grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {CONTACT_EMAILS.map(({ label, email }) => (
            <div key={email} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-semibold">{label}</span>
              <a
                href={`mailto:${email}`}
                className="text-xs text-foreground/70 hover:text-amber-400 transition-colors truncate"
              >
                {email}
              </a>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 mb-6" />

        {/* Branding + legal links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LeegoLogo
              alt="Leego"
              className="h-8 w-8 object-contain opacity-90"
            />
            <div>
              <p className="text-sm font-medium text-foreground/80">Powered by Leego</p>
              <p className="text-xs text-foreground/50">Technology partner</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/45">
            <a href="/terms" className="hover:text-foreground/70 transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-foreground/70 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/acceptable-use" className="hover:text-foreground/70 transition-colors">Acceptable Use</a>
            <span>·</span>
            <a href="mailto:studiosvirelle@gmail.com" className="hover:text-amber-400 transition-colors">studiosvirelle@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
