import { useState } from "react";
import { useLocation } from "wouter";

const ADULT_STUDIO_LOGO = "/adult-studio-access-logo.png";

export default function AdultStudioAccessButton() {
  const [, setLocation] = useLocation();
  const [assetReady, setAssetReady] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setLocation("/adult-studio")}
      aria-label="Open Adult Studio access and verification"
      className={`${assetReady ? "flex" : "hidden"} mx-auto max-w-full items-center justify-center bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
    >
      <img
        src={ADULT_STUDIO_LOGO}
        alt="Adult Studio"
        className="h-auto max-h-44 w-auto max-w-full object-contain"
        draggable={false}
        onLoad={() => setAssetReady(true)}
        onError={() => setAssetReady(false)}
      />
    </button>
  );
}
