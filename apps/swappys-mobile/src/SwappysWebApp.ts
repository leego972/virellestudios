export const SWAPPYS_HTML = String.raw`<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <title>Swappys by Virelle Studios</title>
    <style>
      :root{
        --bg:#07070e;--panel:#0c0b18;--gold:#d4af37;--gold2:#ffbf3f;
        --pink:#ff2e78;--cyan:#20f6ff;--purple:#a855f7;
        --text:#f8fbff;--muted:#9ba8c7;--border:#ffffff18
      }
      *{box-sizing:border-box;margin:0;padding:0}
      body{
        background:radial-gradient(circle at 12% 0,#4420ff40,transparent 38%),
                   radial-gradient(circle at 92% 6%,#ff9a0040,transparent 28%),
                   var(--bg);
        color:var(--text);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
        min-height:100vh
      }
      .app{padding:20px 16px 40px}

      /* ── Hero ── */
      .hero{display:flex;align-items:center;gap:14px;margin-bottom:20px}
      .logo{
        width:72px;height:72px;border-radius:22px;flex-shrink:0;
        background:linear-gradient(135deg,#2510ff,#bc18ff 42%,#ff2e78 72%,#ffb000);
        display:grid;place-items:center;
        box-shadow:0 16px 40px #0008
      }
      .logo svg{width:52px}
      .hero-text h1{font-size:30px;font-weight:900;letter-spacing:-1px;line-height:1}
      .hero-text p{margin-top:4px;font-size:12px;color:var(--muted)}

      /* ── Badge ── */
      .free-badge{
        display:inline-flex;align-items:center;gap:6px;
        background:#d4af3718;border:1px solid #d4af3730;
        border-radius:999px;padding:5px 12px;
        font-size:11px;font-weight:700;color:var(--gold2);
        text-transform:uppercase;letter-spacing:.6px;
        margin-bottom:14px
      }

      /* ── Hero copy ── */
      .hero-copy{margin-bottom:20px}
      .hero-copy h2{font-size:20px;font-weight:800;line-height:1.2;margin-bottom:8px}
      .hero-copy p{font-size:13px;color:var(--muted);line-height:1.55}

      /* ── Card ── */
      .card{
        background:#ffffff09;border:1px solid var(--border);
        border-radius:20px;padding:16px;margin-bottom:14px
      }
      .card-title{font-size:14px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:7px}
      .card-title .dot{width:8px;height:8px;border-radius:50%}
      .dot-gold{background:var(--gold2)}
      .dot-purple{background:var(--purple)}
      .dot-cyan{background:var(--cyan)}

      /* ── Feature list ── */
      .feature-list{display:flex;flex-direction:column;gap:9px}
      .feature-row{display:flex;align-items:flex-start;gap:10px}
      .feature-icon{font-size:18px;width:28px;text-align:center;flex-shrink:0}
      .feature-label{font-size:13px;font-weight:700}
      .feature-desc{font-size:11px;color:var(--muted);margin-top:2px}

      /* ── Upgrade banner ── */
      .upgrade-banner{
        background:linear-gradient(135deg,#d4af3712,#a855f712);
        border:1px solid #d4af3730;border-radius:20px;
        padding:16px;margin-bottom:14px
      }
      .upgrade-banner h3{font-size:14px;font-weight:800;color:var(--gold2);margin-bottom:6px}
      .upgrade-banner p{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px}
      .upgrade-perks{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
      .perk{
        background:#d4af3720;border:1px solid #d4af3730;
        border-radius:999px;padding:5px 10px;
        font-size:11px;font-weight:600;color:var(--gold2)
      }

      /* ── Buttons ── */
      .btn{
        width:100%;border:0;border-radius:14px;padding:13px 14px;
        color:#fff;font-weight:800;font-size:13px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:8px
      }
      .btn-gold{background:linear-gradient(135deg,#ffbf3f,#ff8b2e);color:#120800}
      .btn-pink{background:linear-gradient(135deg,#ff2e78,#8d2cff)}
      .btn-ghost{background:#ffffff14;border:1px solid var(--border)}
      .btn-cyan{background:linear-gradient(135deg,#20f6ff 0%,#226dff 100%)}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}

      /* ── Connection ── */
      .conn-label{font-size:11px;color:var(--muted);margin-top:10px;text-align:center;line-height:1.45}
      .good{color:#4ade80!important}
      .bad{color:#f87171!important}
    </style>
  </head>
  <body>
  <div class="app">

    <!-- Hero -->
    <div class="hero">
      <div class="logo">
        <svg viewBox="0 0 120 120" fill="none">
          <rect x="10" y="30" width="100" height="65" rx="20" fill="#fff"/>
          <rect x="10" y="30" width="38" height="65" rx="20" fill="#ff2e78"/>
          <rect x="72" y="30" width="38" height="65" rx="20" fill="#20f6ff"/>
          <circle cx="60" cy="63" r="25" fill="#071024"/>
          <circle cx="60" cy="63" r="17" fill="#394cff"/>
          <circle cx="53" cy="55" r="6" fill="#fff"/>
          <path d="M24 21l-18 14 18 14M96 21l18 14-18 14" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="hero-text">
        <h1>Swappys</h1>
        <p>by Virelle Studios</p>
      </div>
    </div>

    <!-- Badge + copy matching the Virelle website -->
    <div class="free-badge">✦ Free — No Subscription Needed</div>
    <div class="hero-copy">
      <h2>Your free entry into<br/>Hollywood AI filmmaking.</h2>
      <p>Script, storyboard, and generate AI video clips — no subscription needed. Upgrade to Virelle Studios to unlock BYOK, unlimited exports, and remove the watermark.</p>
    </div>

    <!-- Free features — matching website copy -->
    <div class="card">
      <div class="card-title"><span class="dot dot-gold"></span>Free Features</div>
      <div class="feature-list">
        <div class="feature-row">
          <div class="feature-icon">📝</div>
          <div><div class="feature-label">Script Writer</div><div class="feature-desc">Write screenplays from your phone</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon">🖼️</div>
          <div><div class="feature-label">Storyboard</div><div class="feature-desc">Visual planning in your pocket</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon">🎥</div>
          <div><div class="feature-label">AI Video Clips</div><div class="feature-desc">Generate clips — no key required</div></div>
        </div>
        <div class="feature-row">
          <div class="feature-icon">🎬</div>
          <div><div class="feature-label">Director Chat</div><div class="feature-desc">AI creative guidance on the go</div></div>
        </div>
      </div>
    </div>

    <!-- Upgrade banner — matching website upgrade copy -->
    <div class="upgrade-banner">
      <h3>Unlock Virelle Creator</h3>
      <p>Upgrade inside the app to access BYOK, unlimited exports, and full watermark controls — using your own AI provider keys.</p>
      <div class="upgrade-perks">
        <span class="perk">BYOK provider keys</span>
        <span class="perk">Unlimited exports</span>
        <span class="perk">Remove watermark</span>
        <span class="perk">Broadcast Mode</span>
        <span class="perk">Studio Render</span>
      </div>
      <button class="btn btn-gold" onclick="openVirelle('/register')">Join Creator →</button>
    </div>

    <!-- Virelle connection -->
    <div class="card">
      <div class="card-title"><span class="dot dot-cyan"></span>Virelle Connection</div>
      <div class="grid2" style="margin-bottom:8px">
        <button class="btn btn-ghost" onclick="openVirelle('/login')">Login</button>
        <button class="btn btn-pink" onclick="openVirelle('/virelle-broadcast-render')">Broadcast / Render</button>
      </div>
      <button class="btn btn-cyan" onclick="checkConnection()" style="margin-bottom:0">Verify Connection</button>
      <p id="connection" class="conn-label">Connection not checked.</p>
    </div>

  </div>
  <script>
    const post = p => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(p));
    function openVirelle(path) { post({ type: 'openUrl', url: 'https://virelle.life' + path }); }
    function checkConnection() {
      document.getElementById('connection').textContent = 'Checking Virelle connection…';
      document.getElementById('connection').className = 'conn-label';
      post({ type: 'checkVirelleConnection' });
    }
    window.SwappysNative = {
      setVirelleConnection: function(p) {
        const el = document.getElementById('connection');
        if (p.ok) {
          el.textContent = '✓ Connected — ' + (p.health || 'Virelle online');
          el.className = 'conn-label good';
        } else {
          el.textContent = '✗ Not connected — ' + (p.error || p.health || 'check your connection');
          el.className = 'conn-label bad';
        }
      }
    };
    post({ type: 'appReady' });
  </script>
  </body>
  </html>`;
  