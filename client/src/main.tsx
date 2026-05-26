import { createRoot } from "react-dom/client";
  import "./index.css";

  // Append a breadcrumb line into the splash so we can see where execution stops
  function step(n: number, msg: string) {
    const splash = document.getElementById('_vl_splash');
    if (!splash) return;
    const dots = document.getElementById('_vl_dots');
    if (dots) dots.style.display = 'none';
    const p = document.createElement('p');
    p.style.cssText = 'color:#c8b49a;font:11px/1.6 monospace;margin:4px 0;max-width:88vw;text-align:center;';
    p.textContent = 'Step ' + n + ': ' + msg;
    // keep splash visible permanently while we're debugging
    splash.style.opacity = '1';
    splash.style.zIndex = '999999';
    splash.appendChild(p);
  }

  step(1, 'module loaded — React import OK');

  (window as any).reportError = function(err: unknown) {
    step(99, 'window.reportError: ' + ((err as any)?.message ?? String(err)).slice(0, 200));
  };
  window.addEventListener('error', (e) => {
    step(99, 'onerror: ' + (e.message || '').slice(0, 200));
  });
  window.addEventListener('unhandledrejection', (e) => {
    step(99, 'unhandledrejection: ' + ((e.reason as any)?.message ?? String(e.reason)).slice(0, 200));
  });

  step(2, 'error handlers registered');

  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) {
      step(3, 'ERROR: #root not found in DOM');
    } else {
      step(3, '#root found — calling createRoot');
      const root = createRoot(rootEl, {
        onRecoverableError(err: unknown) {
          step(99, 'onRecoverableError: ' + ((err as any)?.message ?? String(err)).slice(0, 200));
        },
      } as any);

      step(4, 'createRoot() OK — calling render()');

      root.render(
        <div style={{
          position: 'fixed', inset: '0', zIndex: 99999,
          background: '#0a0a0a', color: '#c8b49a',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontFamily: 'Georgia, serif',
        }}>
          <div style={{ fontSize: '28px', letterSpacing: '6px' }}>VIRELLE</div>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: 'monospace' }}>
            React 18 OK
          </div>
          <div style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>
            {navigator.userAgent.slice(0, 100)}
          </div>
        </div>
      );

      step(5, 'render() called — waiting for commit');
    }
  } catch (err: unknown) {
    step(99, 'catch: ' + ((err as Error)?.stack ?? String(err)).slice(0, 300));
  }

  step(6, 'module execution complete');
  