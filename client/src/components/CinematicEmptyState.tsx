import { useMemo, type ReactNode } from "react";
import { Film } from "lucide-react";

const DIRECTOR_QUOTES: { text: string; author: string }[] = [
  { text: "Cinema is a matter of what's in the frame and what's out.", author: "Martin Scorsese" },
  { text: "Every great film should seem new every time you see it.", author: "Roger Ebert" },
  { text: "A film is — or should be — more like music than like fiction.", author: "Stanley Kubrick" },
  { text: "Make visible what, without you, might perhaps never have been seen.", author: "Robert Bresson" },
  { text: "There's no terror in the bang, only in the anticipation of it.", author: "Alfred Hitchcock" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "Drama is life with the dull bits cut out.", author: "Alfred Hitchcock" },
  { text: "The best teacher is your last mistake.", author: "Ralph Nader" },
  { text: "Film is a battleground. Love, hate, action, violence, death.", author: "Sam Fuller" },
  { text: "I think cinema, movies, and magic have always been closely associated.", author: "Francis Ford Coppola" },
  { text: "Cinema is the most beautiful fraud in the world.", author: "Jean-Luc Godard" },
  { text: "If my films make one more person miserable, I'll feel I've done my job.", author: "Woody Allen" },
];

export interface CinematicEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Stable seed (e.g. page name) so the quote doesn't change on every re-render */
  quoteSeed?: string;
}

/**
 * Hand-crafted empty state with rotating director quote. Use anywhere a list,
 * gallery, or table has zero items. Replaces the generic "No items yet" patterns
 * scattered across the app.
 */
export default function CinematicEmptyState({
  icon,
  title,
  description,
  action,
  quoteSeed,
}: CinematicEmptyStateProps) {
  const quote = useMemo(() => {
    const seed = quoteSeed ?? title;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return DIRECTOR_QUOTES[h % DIRECTOR_QUOTES.length];
  }, [quoteSeed, title]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-xl mx-auto">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
        <div className="relative w-20 h-20 rounded-full border border-primary/30 bg-black/60 flex items-center justify-center">
          {icon ?? <Film className="h-9 w-9 text-primary/70" />}
        </div>
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl text-white mb-2 tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-md">{description}</p>
      )}
      {action && <div className="mb-10">{action}</div>}

      <figure className="mt-8 max-w-md border-t border-primary/15 pt-6">
        <blockquote className="font-serif italic text-sm text-primary/60 leading-relaxed">
          "{quote.text}"
        </blockquote>
        <figcaption className="mt-2 text-[11px] uppercase tracking-[0.2em] text-primary/40">
          — {quote.author}
        </figcaption>
      </figure>
    </div>
  );
}
