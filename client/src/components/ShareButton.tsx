import { useState } from "react";
import { Share2, Copy, Check, Twitter, Facebook, Linkedin, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string; // defaults to current page URL
  compact?: boolean;
}

export default function ShareButton({ title, description, url, compact = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = url || window.location.href;
  const shareText = description || title;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
      } catch (_) { /* user cancelled */ }
    } else {
      setOpen(!open);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialLinks = [
    {
      name: "Twitter / X",
      icon: <Twitter className="h-4 w-4" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={compact ? "sm" : "default"}
        onClick={handleNativeShare}
        className="text-white/60 hover:text-white"
      >
        <Share2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {!compact && <span className="ml-1.5">Share</span>}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2">
          {/* Copy Link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Link2 className="h-4 w-4 text-white/60" />
            )}
            <span className={copied ? "text-green-400" : "text-white/80"}>
              {copied ? "Copied!" : "Copy Link"}
            </span>
          </button>

          <div className="h-px bg-white/10 my-1" />

          {/* Social Links */}
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-white/80"
              onClick={() => setOpen(false)}
            >
              {social.icon}
              <span>{social.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
