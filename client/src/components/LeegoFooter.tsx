import { useState, useRef, useEffect, useCallback } from "react";

export default function LeegoFooter() {
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Matrix rain effect
  const startMatrixRain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    // Matrix characters — katakana + latin + digits
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";

    const draw = () => {
      // Semi-transparent black to create fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];

        // Randomly vary the green shade for depth
        const brightness = Math.random();
        if (brightness > 0.95) {
          ctx.fillStyle = "#fff"; // occasional white flash
        } else if (brightness > 0.8) {
          ctx.fillStyle = "#0f0"; // bright green
        } else {
          ctx.fillStyle = `rgba(0, ${Math.floor(150 + brightness * 105)}, 0, ${0.6 + brightness * 0.4})`;
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly after it passes the screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, []);

  const stopMatrixRain = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  const handleClick = () => {
    if (expanded) return; // Prevent re-triggering while active

    setExpanded(true);
    startMatrixRain();

    // Collapse after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setExpanded(false);
      stopMatrixRain();
    }, 5000);
  };

  // Handle window resize during animation
  useEffect(() => {
    if (!expanded) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expanded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMatrixRain();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [stopMatrixRain]);

  return (
    <>
      {/* Matrix rain overlay — covers entire screen when active */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{ background: "rgba(0, 0, 0, 0.92)" }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      <div className="w-full flex justify-center items-center py-8 mt-auto relative z-[9999]">
        <img
          src="/leego-logo.png"
          alt="Created by Leego"
          onClick={handleClick}
          className={`
            object-contain leego-glow select-none
            transition-transform duration-700 ease-in-out
            ${expanded
              ? "h-24 sm:h-28 scale-[2.5] cursor-default drop-shadow-[0_0_40px_rgba(0,255,0,0.6)]"
              : "h-24 sm:h-28 scale-100 cursor-pointer hover:scale-110"
            }
          `}
          draggable={false}
          style={{
            filter: expanded
              ? "drop-shadow(0 0 20px rgba(0, 255, 0, 0.8)) drop-shadow(0 0 60px rgba(0, 255, 0, 0.4))"
              : undefined,
          }}
        />
      </div>
    </>
  );
}
