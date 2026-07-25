import { useMemo, useState } from "react";
import { HollywoodIcon } from "@/components/HollywoodIcon";

export interface Lamalo360ViewerProps {
  frames?: unknown;
  fallback?: string | null;
  alt: string;
  ready?: boolean;
  className?: string;
}

function firstFrame(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === "string" && /^https?:\/\//i.test(entry));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return firstFrame(JSON.parse(value));
    } catch {
      return /^https?:\/\//i.test(value) ? value : undefined;
    }
  }
  return undefined;
}

/**
 * Customer-facing Lamalo image surface.
 *
 * The marketplace intentionally displays one clean product image. The GLB,
 * continuity references and 36 verification views stay hidden in the backend
 * and are consumed by the AI video-generation pipeline only.
 */
export function Lamalo360Viewer({ frames, fallback, alt, className = "" }: Lamalo360ViewerProps) {
  const source = useMemo(() => fallback || firstFrame(frames), [fallback, frames]);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={alt}>
      {source && !failed ? (
        <img
          src={source}
          alt={alt}
          draggable={false}
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black/35">
          <HollywoodIcon tool="asset_marketplace" size={52} className="opacity-45" alt="Garment image unavailable" />
        </div>
      )}
    </div>
  );
}

export default Lamalo360Viewer;
