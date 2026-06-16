import type { Express, Request, Response } from "express";
  import { logger } from "./_core/logger";
  import { requireAdminExpress } from "./_core/context";
  import { ENV } from "./_core/env";

  const TIKTOK_SCOPES = "user.info.basic,video.publish,video.upload";

  function getRedirectUri(req: Request): string {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    return `${protocol}://${host}/api/tiktok/callback`;
  }

  export function registerTikTokOAuthRoutes(app: Express) {
    /** GET /api/tiktok/connect — admin only, redirects to TikTok OAuth */
    app.get("/api/tiktok/connect", requireAdminExpress, (req: Request, res: Response) => {
      const clientKey = ENV.tiktokClientKey.trim();
      if (!clientKey) {
        res.status(400).send(`
          <html><body style="font-family:sans-serif;background:#080808;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
          <div style="max-width:500px;background:#111;border:1px solid #c9a84c;border-radius:16px;padding:40px;">
            <h2 style="color:#c9a84c;margin-bottom:16px;">⚠️ TikTok Not Configured</h2>
            <p style="color:#aaa;margin-bottom:20px;">You need to add your TikTok app credentials to Railway first.</p>
            <ol style="color:#aaa;line-height:2;padding-left:20px;">
              <li>Go to <a href="https://developers.tiktok.com" target="_blank" style="color:#c9a84c;">developers.tiktok.com</a></li>
              <li>Create an app → add <strong style="color:#fff;">Content Posting API</strong> product</li>
              <li>Set redirect URI to: <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;color:#4ade80;">${getRedirectUri(req)}</code></li>
              <li>Copy <strong style="color:#fff;">Client Key</strong> → Railway → <code style="color:#c9a84c;">TIKTOK_CLIENT_KEY</code></li>
              <li>Copy <strong style="color:#fff;">Client Secret</strong> → Railway → <code style="color:#c9a84c;">TIKTOK_CLIENT_SECRET</code></li>
              <li>Redeploy, then click Connect again</li>
            </ol>
            <a href="/content-creator" style="display:block;margin-top:24px;color:#c9a84c;font-size:14px;">← Back to Content Creator</a>
          </div></body></html>
        `);
        return;
      }
      const params = new URLSearchParams({
        client_key: clientKey,
        redirect_uri: getRedirectUri(req),
        scope: TIKTOK_SCOPES,
        response_type: "code",
        state: crypto.randomUUID(),
      });
      res.redirect(302, `https://www.tiktok.com/v2/auth/authorize/?${params}`);
    });

    /** GET /api/tiktok/callback — exchanges code for tokens */
    app.get("/api/tiktok/callback", requireAdminExpress, async (req: Request, res: Response) => {
      const code = req.query.code as string;
      const error = req.query.error as string;

      if (error) {
        logger.error("[TikTok OAuth] Auth error", { error });
        res.status(400).send(`<pre style="color:red">TikTok auth error: ${error}</pre>`);
        return;
      }
      if (!code) {
        res.status(400).send("No authorisation code received from TikTok.");
        return;
      }

      const clientKey = ENV.tiktokClientKey.trim();
      const clientSecret = ENV.tiktokClientSecret.trim();
      if (!clientKey || !clientSecret) {
        res.status(400).send("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET not configured.");
        return;
      }

      try {
        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: getRedirectUri(req),
          }),
        });

        const data = await tokenRes.json() as Record<string, any>;

        if (!tokenRes.ok || data.error) {
          logger.error("[TikTok OAuth] Token exchange failed", data);
          res.status(400).send(`<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`);
          return;
        }

        const accessToken: string = data.access_token ?? "";
        const refreshToken: string = data.refresh_token ?? "";
        logger.info("[TikTok OAuth] Tokens obtained successfully");

        res.send(`<!DOCTYPE html>
  <html>
  <head>
    <title>TikTok Connected — Virelle Studios</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #080808; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
      .card { background: #111; border: 1px solid #c9a84c; border-radius: 16px; padding: 40px; max-width: 680px; width: 100%; }
      h1 { color: #c9a84c; font-size: 24px; margin-bottom: 8px; }
      .sub { color: #888; margin-bottom: 28px; font-size: 15px; }
      .label { color: #c9a84c; font-size: 13px; font-weight: 700; margin-bottom: 6px; margin-top: 20px; }
      .token-box { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 12px; color: #4ade80; word-break: break-all; margin-bottom: 8px; }
      .copy-btn { background: #1a1a1a; color: #c9a84c; border: 1px solid #c9a84c; padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; width: 100%; margin-bottom: 4px; }
      .copy-btn:hover { background: #c9a84c; color: #000; }
      .steps { background: #0d0d0d; border-radius: 10px; padding: 20px; border: 1px solid #1a1a1a; margin-top: 28px; }
      .step { color: #aaa; margin: 10px 0; font-size: 14px; line-height: 1.5; }
      .step strong { color: #c9a84c; }
      .step code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; color: #fff; font-size: 12px; }
      .back { display: block; margin-top: 24px; color: #c9a84c; text-decoration: none; font-size: 14px; }
      .expires { color: #f59e0b; font-size: 12px; margin-top: 4px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>✅ TikTok Authorised!</h1>
      <p class="sub">Add both tokens to Railway to enable TikTok posting.</p>

      <p class="label">TIKTOK_ACCESS_TOKEN <span style="color:#888;font-weight:400">(expires in 24h)</span></p>
      <div class="token-box" id="at">${accessToken}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('at').textContent).then(()=>this.textContent='✅ Copied!')">Copy Access Token</button>

      ${refreshToken ? `
      <p class="label">TIKTOK_REFRESH_TOKEN <span style="color:#888;font-weight:400">(use to get new access tokens)</span></p>
      <div class="token-box" id="rt">${refreshToken}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('rt').textContent).then(()=>this.textContent='✅ Copied!')">Copy Refresh Token</button>
      ` : ""}

      <div class="steps">
        <div class="step"><strong>Step 1 —</strong> Copy <code>TIKTOK_ACCESS_TOKEN</code> above</div>
        <div class="step"><strong>Step 2 —</strong> Go to Railway → Variables → add <code>TIKTOK_ACCESS_TOKEN</code></div>
        ${refreshToken ? `<div class="step"><strong>Step 3 —</strong> Also add <code>TIKTOK_REFRESH_TOKEN</code> (keeps you connected long-term)</div>` : ""}
        <div class="step"><strong>Step ${refreshToken ? 4 : 3} —</strong> Redeploy — TikTok posting is now live 🎬</div>
        <div class="step" style="color:#f59e0b;">⚠️ Access token expires in 24 hours. Reconnect to refresh it.</div>
      </div>
      <a class="back" href="/content-creator">← Back to Content Creator</a>
    </div>
  </body>
  </html>`);
      } catch (err) {
        logger.error("[TikTok OAuth] Callback error", { error: String(err) });
        res.status(500).send("TikTok OAuth callback failed. Please try again.");
      }
    });
  }
  