/**
 * LeegoFooter — production / launch version.
 * Clean, restrained footer with no novelty animations.
 * Replaces the old Matrix-rain / click-to-expand novelty footer.
 */
export default function LeegoFooter() {
  return (
    <footer className="w-full mt-16 border-t border-border/40 bg-card/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/leego-logo.png"
            alt="Leego"
            className="h-8 w-8 object-contain opacity-90"
            draggable={false}
          />
          <div>
            <p className="text-sm font-medium text-foreground/80">Powered by Leego</p>
            <p className="text-xs text-foreground/50">Technology partner</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-foreground/45">
          <span>Built for production workflows</span>
          <span className="hidden sm:inline">•</span>
          <span>Commercial launch environment</span>
        </div>
      </div>
    </footer>
  );
}
