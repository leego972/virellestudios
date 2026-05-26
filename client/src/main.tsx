import { createRoot } from "react-dom/client";
  import "./index.css";

  // ── DIAGNOSTIC BUILD: bypasses all app code ──────────────────────────────────
  // If this renders, React works and the bug is INSIDE App.
  // If this also produces a blank screen, React itself is broken in this environment.

  (window as any).reportError = function(err: unknown) {
    const msg = (err as any)?.message ?? String(err);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff9999;font:14px monospace;padding:20px;white-space:pre-wrap;';
    el.textContent = 'window.reportError:\n' + msg;
    document.body.appendChild(el);
  };

  try {
    const rootEl = document.getElementById('root')!;
    createRoot(rootEl).render(
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#0a0a0a', color: '#c8b49a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{ fontSize: 28, letterSpacing: 6 }}>VIRELLE</div>
        <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace' }}>
          React 18 OK — diagnostic build
        </div>
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
          UA: {navigator.userAgent.slice(0, 80)}
        </div>
      </div>
    );
  } catch (err: unknown) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff9999;font:14px monospace;padding:20px;white-space:pre-wrap;';
    el.textContent = 'createRoot crash:\n' + ((err as Error)?.stack ?? String(err));
    document.body.appendChild(el);
  }
  