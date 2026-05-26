import { createRoot, flushSync } from "react-dom/client";
  import "./index.css";

  function step(n: number, msg: string) {
    const splash = document.getElementById('_vl_splash');
    if (!splash) return;
    const dots = document.getElementById('_vl_dots');
    if (dots) dots.style.display = 'none';
    const p = document.createElement('p');
    p.style.cssText = 'color:#c8b49a;font:11px/1.6 monospace;margin:4px 0;max-width:88vw;text-align:center;';
    p.textContent = 'Step ' + n + ': ' + msg;
    splash.style.opacity = '1';
    (splash as HTMLElement).style.zIndex = '999999';
    splash.appendChild(p);
  }

  step(1, 'module loaded');

  window.addEventListener('error', (e) => step(99, 'onerror: ' + (e.message||'').slice(0,180)));
  window.addEventListener('unhandledrejection', (e) => step(99, 'rejection: ' + ((e.reason as any)?.message ?? String(e.reason)).slice(0,180)));

  step(2, 'handlers registered');

  function DiagApp() {
    step(7, 'React component function ran');
    return (
      <div style={{
        position: 'fixed', inset: '0', zIndex: 99999,
        background: '#0a0a0a', color: '#c8b49a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{ fontSize: '28px', letterSpacing: '6px' }}>VIRELLE</div>
        <div style={{ fontSize: '13px', color: '#aaa', fontFamily: 'monospace' }}>React 18 flushSync OK</div>
        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{navigator.userAgent.slice(0, 100)}</div>
      </div>
    );
  }

  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) { step(3, 'ERROR: #root missing'); } else {
      step(3, '#root found — createRoot');
      const root = createRoot(rootEl);
      step(4, 'createRoot OK');

      // flushSync forces React to commit SYNCHRONOUSLY — no MessageChannel needed
      step(5, 'calling flushSync render');
      flushSync(() => {
        root.render(<DiagApp />);
      });
      step(6, 'flushSync returned — commit done');
    }
  } catch (err: unknown) {
    step(99, 'catch: ' + ((err as Error)?.stack ?? String(err)).slice(0, 300));
  }

  step(8, 'module done');
  