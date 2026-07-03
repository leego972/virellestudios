export const SWAPPYS_HTML = String.raw`<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
    <title>Swappys</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#07070e;color:#f8fbff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;min-height:100vh}
      .app{padding:18px 16px 48px;max-width:480px;margin:0 auto}

      /* header */
      .hdr{display:flex;align-items:center;gap:12px;margin-bottom:22px}
      .logo{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#2510ff,#bc18ff 40%,#ff2e78 70%,#ffb000);display:grid;place-items:center;flex-shrink:0;box-shadow:0 8px 24px #0006}
      .logo svg{width:38px}
      .hdr-text h1{font-size:22px;font-weight:900;letter-spacing:-0.5px}
      .hdr-text p{font-size:11px;color:#9ba8c7;margin-top:2px}

      /* upload zones */
      .zones{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
      .zone{border:2px dashed #ffffff25;border-radius:18px;padding:0;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;position:relative;overflow:hidden;background:#0c0b18;transition:border-color .2s}
      .zone:active{border-color:#ff2e78}
      .zone.has-img{border-style:solid;border-color:#ffffff18}
      .zone input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:100px}
      .zone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px}
      .zone-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ba8c7;z-index:1;pointer-events:none}
      .zone-icon{font-size:26px;z-index:1;pointer-events:none}
      .zone-hint{font-size:9px;color:#ffffff40;z-index:1;pointer-events:none}
      .zone-overlay{position:absolute;bottom:0;left:0;right:0;background:#00000099;padding:5px;text-align:center;font-size:9px;font-weight:700;color:#fff;z-index:2;pointer-events:none}

      /* swap arrow */
      .swap-arrow{text-align:center;font-size:22px;margin:0 0 14px;color:#ff2e78}

      /* swap button */
      .btn-swap{width:100%;padding:16px;border:0;border-radius:18px;font-size:17px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .2s;letter-spacing:.3px}
      .btn-swap:active{transform:scale(.97)}
      .btn-swap.ready{background:linear-gradient(135deg,#ff2e78,#bc18ff 50%,#2510ff);color:#fff;box-shadow:0 8px 28px #ff2e7840}
      .btn-swap.disabled{background:#1a1a2e;color:#ffffff40;cursor:not-allowed}
      .btn-swap.loading{background:linear-gradient(135deg,#ff2e78,#bc18ff);color:#fff;opacity:.7}

      /* result */
      .result-wrap{margin-top:16px;border-radius:20px;overflow:hidden;position:relative;display:none}
      .result-wrap.show{display:block}
      .result-img{width:100%;display:block;border-radius:20px}

      /* watermark — annoying tiled overlay */
      .wm-overlay{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;z-index:10}
      .wm-tile{
        position:absolute;inset:0;
        background-image:repeating-linear-gradient(
          45deg,
          transparent,transparent 60px,
          rgba(255,255,255,0.08) 60px,rgba(255,255,255,0.08) 61px
        );
      }
      .wm-center{
        background:#07070ecc;border:2px solid #ff2e7860;border-radius:14px;
        padding:10px 18px;text-align:center;backdrop-filter:blur(4px)
      }
      .wm-center p{font-size:13px;font-weight:900;color:#ff2e78;letter-spacing:1px;text-transform:uppercase}
      .wm-center small{font-size:10px;color:#ffffff80}
      .wm-corners span{
        position:absolute;font-size:9px;font-weight:700;color:#ffffff50;
        letter-spacing:.5px;text-transform:uppercase
      }
      .wm-corners span:nth-child(1){top:8px;left:10px}
      .wm-corners span:nth-child(2){top:8px;right:10px}
      .wm-corners span:nth-child(3){bottom:8px;left:10px}
      .wm-corners span:nth-child(4){bottom:8px;right:10px}

      /* upgrade banner */
      .upgrade{margin-top:12px;background:linear-gradient(135deg,#ff2e7818,#bc18ff18);border:1px solid #ff2e7840;border-radius:18px;padding:14px 16px;display:none}
      .upgrade.show{display:block}
      .upgrade h3{font-size:14px;font-weight:800;color:#ff2e78;margin-bottom:4px}
      .upgrade p{font-size:12px;color:#9ba8c7;margin-bottom:12px;line-height:1.5}
      .btn-upgrade{width:100%;padding:13px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff2e78,#bc18ff);color:#fff;font-size:14px;font-weight:800;cursor:pointer}

      /* status */
      .status{text-align:center;font-size:12px;color:#9ba8c7;margin-top:10px;min-height:18px}
      .status.err{color:#f87171}
      .status.ok{color:#4ade80}

      /* spinner */
      @keyframes spin{to{transform:rotate(360deg)}}
      .spin{display:inline-block;animation:spin .8s linear infinite}
    </style>
  </head>
  <body>
  <div class="app">

    <div class="hdr">
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
      <div class="hdr-text">
        <h1>Swappys</h1>
        <p>AI face &amp; body swap · by Virelle Studios</p>
      </div>
    </div>

    <div class="zones">
      <div class="zone" id="zoneSource" onclick="document.getElementById('inputSource').click()">
        <input type="file" id="inputSource" accept="image/*" onchange="loadImg('source',this)"/>
        <div class="zone-icon">🤳</div>
        <div class="zone-label">Your Face</div>
        <div class="zone-hint">Tap to choose</div>
      </div>
      <div class="zone" id="zoneTarget" onclick="document.getElementById('inputTarget').click()">
        <input type="file" id="inputTarget" accept="image/*" onchange="loadImg('target',this)"/>
        <div class="zone-icon">🎬</div>
        <div class="zone-label">Target Body</div>
        <div class="zone-hint">Tap to choose</div>
      </div>
    </div>

    <div class="swap-arrow">⇅</div>

    <button class="btn-swap disabled" id="btnSwap" onclick="doSwap()">Swap Face &amp; Body</button>

    <div class="status" id="statusMsg"></div>

    <div class="result-wrap" id="resultWrap">
      <img class="result-img" id="resultImg" src="" alt="Swap result"/>
      <div class="wm-overlay" id="wmOverlay">
        <div class="wm-tile"></div>
        <div class="wm-corners">
          <span>SWAPPYS</span><span>SWAPPYS</span>
          <span>virelle.life</span><span>virelle.life</span>
        </div>
        <div class="wm-center">
          <p>SWAPPYS WATERMARK</p>
          <small>Upgrade to remove</small>
        </div>
      </div>
    </div>

    <div class="upgrade" id="upgradeCard">
      <h3>🔒 Remove the watermark</h3>
      <p>Join Virelle Creator to get clean, full-quality swaps powered by fal.ai — no watermark, unlimited exports.</p>
      <button class="btn-upgrade" onclick="joinCreator()">Join Virelle Creator →</button>
    </div>

  </div>
  <script>
    const VIRELLE = 'https://virelle.life';
    let srcB64 = null, tgtB64 = null;

    function post(p){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(p)); }
    function joinCreator(){ post({ type:'openUrl', url: VIRELLE+'/register?source=swappys-mobile&product=swappys&intent=creator-upgrade' }); }

    function loadImg(which, input){
      const file = input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const b64 = e.target.result;
        const zone = document.getElementById('zone' + (which==='source'?'Source':'Target'));
        let img = zone.querySelector('img.preview');
        if(!img){ img = document.createElement('img'); img.className='preview'; zone.insertBefore(img, zone.firstChild); }
        img.src = b64;
        let lbl = zone.querySelector('.zone-overlay');
        if(!lbl){ lbl = document.createElement('div'); lbl.className='zone-overlay'; zone.appendChild(lbl); }
        lbl.textContent = which==='source' ? 'YOUR FACE' : 'TARGET BODY';
        zone.classList.add('has-img');
        if(which==='source') srcB64 = b64; else tgtB64 = b64;
        updateBtn();
      };
      reader.readAsDataURL(file);
    }

    function updateBtn(){
      const btn = document.getElementById('btnSwap');
      btn.className = 'btn-swap ' + (srcB64 && tgtB64 ? 'ready' : 'disabled');
    }

    async function doSwap(){
      if(!srcB64 || !tgtB64) return;
      const btn = document.getElementById('btnSwap');
      if(btn.classList.contains('loading')) return;
      btn.className = 'btn-swap loading';
      btn.innerHTML = '<span class="spin">⟳</span> Swapping…';
      setStatus('Sending to Virelle AI…');
      document.getElementById('resultWrap').classList.remove('show');
      document.getElementById('upgradeCard').classList.remove('show');

      try {
        const resp = await fetch(VIRELLE + '/api/trpc/swap.bodyFaceSwap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: { sourceImageBase64: srcB64, targetImageBase64: tgtB64 } }),
          credentials: 'include',
        });
        const data = await resp.json();
        const result = data?.result?.data?.json ?? data?.result?.data;
        if(!result?.imageUrl) throw new Error(data?.error?.message || 'Swap failed — try different photos');

        document.getElementById('resultImg').src = result.imageUrl;
        document.getElementById('resultWrap').classList.add('show');
        const isWatermarked = result.hasWatermark !== false;
        document.getElementById('wmOverlay').style.display = isWatermarked ? 'flex' : 'none';
        if(isWatermarked) document.getElementById('upgradeCard').classList.add('show');
        setStatus(isWatermarked ? 'Done — watermark applied. Upgrade to remove it.' : 'Clean swap complete ✓', isWatermarked ? '' : 'ok');
      } catch(err){
        setStatus(err.message || 'Something went wrong — please try again.', 'err');
      }

      btn.className = 'btn-swap ready';
      btn.innerHTML = 'Swap Again';
    }

    function setStatus(msg, cls){
      const el = document.getElementById('statusMsg');
      el.textContent = msg;
      el.className = 'status' + (cls ? ' '+cls : '');
    }

    post({ type: 'appReady' });
  `;
  