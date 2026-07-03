export const SWAPPYS_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Swappys by Virelle Studios</title>
  <style>
    :root{--bg:#070b16;--panel:#11182a;--gold:#ffbf3f;--pink:#ff2e78;--cyan:#20f6ff;--text:#f8fbff;--muted:#9ba8c7}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 10% 0,#4420ff55,transparent 36%),radial-gradient(circle at 95% 8%,#ff9a0055,transparent 28%),var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif}.app{min-height:100vh;padding:22px 15px 34px}.hero{display:flex;gap:12px;align-items:center;margin-bottom:16px}.logo{width:74px;height:74px;border-radius:24px;background:linear-gradient(135deg,#2510ff,#bc18ff 42%,#ff2e78 72%,#ffb000);display:grid;place-items:center;box-shadow:0 16px 40px #0008}.logo svg{width:55px}.title h1{margin:0;font-size:32px;letter-spacing:-1px}.title p{margin:2px 0 0;color:var(--muted);font-size:13px}.card{background:#ffffff0d;border:1px solid #ffffff18;border-radius:24px;padding:16px;margin-top:14px}.card h2{margin:0 0 9px;font-size:17px}.fine{font-size:13px;color:var(--muted);line-height:1.45}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.btn{width:100%;border:0;border-radius:16px;padding:13px 12px;color:#fff;background:#263653;font-weight:800}.btn.gold{background:linear-gradient(135deg,#ffbf3f,#ff8b2e);color:#171000}.btn.pink{background:linear-gradient(135deg,#ff2e78,#8d2cff)}.btn.cyan{background:linear-gradient(135deg,#20f6ff,#226dff)}.stage{height:310px;border-radius:28px;border:1px solid #ffffff22;background:linear-gradient(135deg,#070b16,#161d33);display:grid;place-items:center;text-align:center;padding:28px;box-shadow:0 18px 55px #0008}.watermark{display:inline-block;background:#0009;border:1px solid #fff3;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.7px;margin-top:14px}.status{margin-top:10px;color:var(--muted);font-size:12px}.good{color:#4ade80}.bad{color:#f87171}.pill{display:inline-block;background:#ffffff12;border:1px solid #ffffff24;border-radius:999px;color:#fff;padding:8px 10px;font-size:12px;margin:4px 5px 0 0}
  </style>
</head>
<body>
  <div class="app">
    <div class="hero">
      <div class="logo"><svg viewBox="0 0 120 120"><rect x="10" y="30" width="100" height="65" rx="20" fill="#fff"/><rect x="10" y="30" width="38" height="65" rx="20" fill="#ff2e78"/><rect x="72" y="30" width="38" height="65" rx="20" fill="#20f6ff"/><circle cx="60" cy="63" r="25" fill="#071024"/><circle cx="60" cy="63" r="17" fill="#394cff"/><circle cx="53" cy="55" r="6" fill="#fff"/><path d="M24 21l-18 14 18 14M96 21l18 14-18 14" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/></svg></div>
      <div class="title"><h1>Swappys</h1><p>by Virelle Studios</p></div>
    </div>

    <div class="stage">
      <div>
        <h2>Mobile app shell installed in GitHub</h2>
        <p class="fine">This package is ready for Replit to inspect, run, and replace with the full tested camera/media WebView from the SwappysMobile ZIP.</p>
        <div class="watermark">SWAPPYS · AI</div>
      </div>
    </div>

    <div class="card"><h2>Included feature targets</h2><span class="pill">Live preview</span><span class="pill">Record clips</span><span class="pill">Source media</span><span class="pill">Reference media</span><span class="pill">Virelle upgrade</span><span class="pill">BYOK premium video</span><p class="fine">Standalone mobile output remains marked. Premium broadcast and studio render unlock in Virelle Creator and use the user’s own provider key.</p></div>

    <div class="card"><h2>Virelle connection</h2><div class="grid"><button class="btn cyan" onclick="checkConnection()">Verify connection</button><button class="btn" onclick="openVirelle('/login')">Login</button><button class="btn gold" onclick="openVirelle('/register')">Join Creator</button><button class="btn pink" onclick="openVirelle('/virelle-broadcast-render')">Broadcast / Render</button></div><p id="connection" class="status">Connection not checked.</p></div>
  </div>
  <script>
    const post=(payload)=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    function openVirelle(path){post({type:'openUrl',url:'https://virelle.life'+path})}
    function checkConnection(){document.getElementById('connection').textContent='Checking...';post({type:'checkVirelleConnection'})}
    window.SwappysNative={setVirelleConnection:function(p){const el=document.getElementById('connection');el.textContent=p.ok?'Connected: '+(p.health||'online'):'Not connected: '+(p.error||p.health||'failed');el.className='status '+(p.ok?'good':'bad')}};
    post({type:'appReady'});
  </script>
</body>
</html>`;
