import { useEffect, useMemo, useRef, useState } from "react";
import { Rotate3D } from "lucide-react";

export interface Lamalo360ViewerProps {
  frames?: unknown;
  fallback?: string | null;
  alt: string;
  ready?: boolean;
  className?: string;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && /^https?:\/\//i.test(entry));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return stringList(JSON.parse(value));
    } catch {
      return /^https?:\/\//i.test(value) ? [value] : [];
    }
  }
  return [];
}

export function Lamalo360Viewer({ frames, fallback, alt, ready = false, className = "" }: Lamalo360ViewerProps) {
  const urls = useMemo(() => {
    const values = stringList(frames);
    if (values.length >= 12) return values;
    return fallback ? [fallback] : [];
  }, [frames, fallback]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; index: number } | null>(null);
  const canRotate = ready && urls.length >= 12;

  useEffect(() => {
    setIndex(0);
    setFailed(false);
    if (!canRotate) return;
    for (const url of urls.slice(0, 8)) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    }
  }, [canRotate, urls]);

  function rotate(delta: number) {
    if (!canRotate) return;
    setIndex((current) => (current + delta + urls.length) % urls.length);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!canRotate) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, index };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !canRotate) return;
    const frameDelta = Math.round((event.clientX - drag.current.x) / 9);
    setIndex((drag.current.index - frameDelta + urls.length * 10) % urls.length);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const source = !failed ? urls[index] : fallback ?? undefined;

  return (
    <div
      className={`relative select-none touch-pan-y overflow-hidden ${canRotate ? "cursor-ew-resize" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") rotate(-1);
        if (event.key === "ArrowRight") rotate(1);
      }}
      tabIndex={canRotate ? 0 : -1}
      role={canRotate ? "slider" : "img"}
      aria-label={canRotate ? `${alt} 360 degree turntable. Drag or use arrow keys to rotate.` : alt}
      aria-valuemin={canRotate ? 1 : undefined}
      aria-valuemax={canRotate ? urls.length : undefined}
      aria-valuenow={canRotate ? index + 1 : undefined}
    >
      {source ? (
        <img
          src={source}
          alt={alt}
          draggable={false}
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/20">
          <Rotate3D className="h-10 w-10" />
        </div>
      )}
      {canRotate && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/75 backdrop-blur-sm">
          <Rotate3D className="h-3 w-3" /> Drag to rotate · {index + 1}/{urls.length}
        </div>
      )}
    </div>
  );
}

export default Lamalo360Viewer;
