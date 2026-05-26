import { createRoot, flushSync } from "react-dom/client";
  import "./index.css";

  function step(n: number, msg: string) {
    const splash = document.getElementById('_vl_splash');
    if (!splash) return;
    const dots = document.getElementById('_vl_dots');
    if (dots) dots.style.display = 'none';
    const p = document.createElement('p');
    p.style.cssText = 'color:#c8b49a;font:11px/1.6 monospace;margin:4px 0;max-width:90vw;word-break:break-all;text-align:center;';
    p.textContent = 'Step ' + n + ': ' + msg;
    (splash as HTMLElement).style.opacity = '1';
    (splash as HTMLElement).style.zIndex = '999999';
    splash.appendChild(p);
  }

  step(1, 'module loaded');
  window.addEventListener('error', (e) => step(99, 'onerror: ' + e.message.slice(0,200)));
  window.addEventListener('unhandledrejection', (e) => step(99, 'rejection: ' + ((e.reason as any)?.message ?? String(e.reason)).slice(0,200)));
  step(2, 'handlers registered');

  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) { step(3, 'ERROR: #root missing'); } else {
      step(3, '#root found');
      const root = createRoot(rootEl);
      step(4, 'createRoot OK');
      step(5, 'calling flushSync');
      try {
        flushSync(() => {
          root.render(
            <div style={{position:'fixed',inset:'0',zIndex:99999,background:'#0a0a0a',color:'#c8b49a',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:'12px',fontFamily:'Georgia,serif'}}>
              <div style={{fontSize:'28px',letterSpacing:'6px'}}>VIRELLE</div>
              <div style={{fontSize:'13px',color:'#aaa',fontFamily:'monospace'}}>React 18 OK</div>
            </div>
          );
        });
        step(6, 'flushSync OK — React rendered!');
      } catch (fe: unknown) {
        const e = fe as any;
        step(55, 'flushSync threw: name=' + (e?.name ?? '?') + ' msg=' + (e?.message ?? String(e)).slice(0,200));
        step(56, 'stack: ' + (e?.stack ?? '').slice(0,250));
      }
    }
  } catch (err: unknown) {
    const e = err as any;
    step(99, 'outer catch: ' + (e?.name ?? '') + ': ' + (e?.message ?? String(e)).slice(0,200));
  }

  step(8, 'done');
  