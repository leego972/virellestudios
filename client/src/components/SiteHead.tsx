import { useEffect } from "react";

interface SiteHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  noindex?: boolean;
  type?: "website" | "article" | "video.movie";
  jsonLd?: object | object[];
}

const BRAND = "Virelle Studios";
const DEFAULT_DESC = "The unified AI film production studio — script to screen in one platform. Casting, scenes, scoring, VFX, distribution & funding.";
const DEFAULT_IMG = "https://virelle.life/og-default.jpg";
const SITE_URL = "https://virelle.life";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

export function SiteHead({ title, description, image, url, noindex, type = "website", jsonLd }: SiteHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BRAND}` : `${BRAND} — AI Film Production Studio`;
    const desc = description || DEFAULT_DESC;
    const img = image || DEFAULT_IMG;
    const canonical = url || (typeof window !== "undefined" ? window.location.href : SITE_URL);
    document.title = fullTitle;
    setMeta("description", desc);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:image", img, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:type", type, "property");
    setMeta("og:site_name", BRAND, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", img);
    setLink("canonical", canonical);
    // JSON-LD structured data
    let ldEl = document.getElementById("__site_head_jsonld__") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!ldEl) { ldEl = document.createElement("script"); ldEl.id = "__site_head_jsonld__"; ldEl.type = "application/ld+json"; document.head.appendChild(ldEl); }
      ldEl.textContent = JSON.stringify(jsonLd);
    } else if (ldEl) { ldEl.remove(); }
  }, [title, description, image, url, noindex, type, JSON.stringify(jsonLd)]);
  return null;
}

export default SiteHead;
