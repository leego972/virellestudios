import type { Express, Request, Response } from "express";
  import { logger } from "./_core/logger";
  import { requireAdminExpress } from "./_core/context";
  import { ENV } from "./_core/env";

  const META_API_VERSION = "v19.0";
  const INSTAGRAM_SCOPES = "instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts";

  function getRedirectUri(req: Request): string {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    return `${protocol}://${host}/api/instagram/callback`;
  }

  export function registerInstagramOAuthRoutes(app: Express) {
    /** GET /api/instagram/connect — admin only, redirects to Meta/Instagram OAuth */
    app.get("/api/instagram/connect", requireAdminExpress, (req: Request, res: Response) => {
      const clientId = ENV.instagramClientId.trim();
      if (!clientId) {
        res.status(400).send(`
          <html><body style="font-family:sans-serif;background:#080808;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
          <div style="max-width:500px;background:#111;border:1px solid #c9a84c;border-radius:16px;padding:40px;">
            <h2 style="color:#c9a84c;margin-bottom:16px;">⚠️ Instagram Not Configured</h2>
            <p style="color:#aaa;margin-bottom:20px;">Add your Meta app credentials to Railway first.</p>
            <ol style="color:#aaa;line-height:2;padding-left:20px;">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" style="color:#c9a84c;">Meta for Developers</a></li>
              <li>Create an app → add <strong style="color:#fff;">Instagram Graph API</strong> product</li>
              <li>Set redirect URI to: <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;color:#4ade80;">${getRedirectUri(req)}</code></li>
              <li>Copy <strong style="color:#fff;">App ID</strong> → Railway → <code style="color:#c9a84c;">INSTAGRAM_CLIENT_ID</code></li>
              <li>Copy <strong style="color:#fff;">App Secret</strong> → Railway → <code style="color:#c9a84c;">INSTAGRAM_CLIENT_SECRET</code></li>
              <li>Redeploy, then click Connect again</li>
            </ol>
            <a href="/content-creator" style="display:block;margin-top:24px;color:#c9a84c;font-size:14px;">← Back to Content Creator</a>
          </div></body></html>
        `);
        return;
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(req),
        scope: INSTAGRAM_SCOPES,
        response_type: "code",
        state: crypto.randomUUID(),
      });
      res.redirect(302, `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`);
    });

    /** GET /api/instagram/callback — exchanges code for a long-lived token */
    app.get("/api/instagram/callback", requireAdminExpress, async (req: Request, res: Response) => {
      const code = req.query.code as string;
      const error = req.query.error as string;

      if (error) {
        logger.error("[Instagram OAuth] Auth error", { error, desc: req.query.error_description });
        res.status(400).send(`<pre style="color:red">Instagram auth error: ${error} — ${req.query.error_description}</pre>`);
        return;
      }
      if (!code) {
        res.status(400).send("No authorisation code received from Meta/Instagram.");
        return;
      }

      const clientId = ENV.instagramClientId.trim();
      const clientSecret = ENV.instagramClientSecret.trim();
      if (!clientId || !clientSecret) {
        res.status(400).send("INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET not configured.");
        return;
      }

      try {
        // Step 1 — short-lived token
        const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
        tokenUrl.searchParams.set("client_id", clientId);
        tokenUrl.searchParams.set("client_secret", clientSecret);
        tokenUrl.searchParams.set("redirect_uri", getRedirectUri(req));
        tokenUrl.searchParams.set("code", code);

        const tokenRes = await fetch(tokenUrl.toString());
        const data = await tokenRes.json() as Record<string, any>;

        if (!tokenRes.ok || data.error) {
          logger.error("[Instagram OAuth] Token exchange failed", data);
          res.status(400).send(`<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`);
          return;
        }

        const shortToken: string = data.access_token ?? "";

        // Step 2 — exchange for long-lived token (~60 days)
        const llUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
        llUrl.searchParams.set("grant_type", "fb_exchange_token");
        llUrl.searchParams.set("client_id", clientId);
        llUrl.searchParams.set("client_secret", clientSecret);
        llUrl.searchParams.set("fb_exchange_token", shortToken);

        const llRes = await fetch(llUrl.toString());
        const llData = await llRes.json() as Record<string, any>;
        const longToken: string = llData.access_token ?? shortToken;

        logger.info("[Instagram OAuth] Long-lived token obtained");

        res.send(`<!DOCTYPE html>
  <html>
  <head>
    <title>Instagram Connected — Virelle Studios</title>
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
    </style>
  </head>
  <body>
    <div class="card">
      <h1>✅ Instagram Authorised!</h1>
      <p class="sub">This is your long-lived token (~60 days). Add it to Railway to enable Instagram posting.</p>
      <p class="label">INSTAGRAM_ACCESS_TOKEN <span style="color:#888;font-weight:400">(~60 days)</span></p>
      <div class="token-box" id="at">${longToken}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('at').textContent).then(()=>this.textContent='✅ Copied!')">Copy Access Token</button>
      <div class="steps">
        <div class="step"><strong>Step 1 —</strong> Copy <code>INSTAGRAM_ACCESS_TOKEN</code> above</div>
        <div class="step"><strong>Step 2 —</strong> Railway → Variables → add <code>INSTAGRAM_ACCESS_TOKEN</code></div>
        <div class="step"><strong>Step 3 —</strong> Also add your Instagram Business Account ID as <code>INSTAGRAM_USER_ID</code></div>
        <div class="step"><strong>Step 4 —</strong> Redeploy — Instagram posting is now live 🎬</div>
        <div class="step" style="color:#f59e0b;">⚠️ Token expires after ~60 days. Reconnect to refresh.</div>
      </div>
      <a class="back" href="/content-creator">← Back to Content Creator</a>
    </div>
  </body>
  </html>`);
      } catch (err) {
        logger.error("[Instagram OAuth] Callback error", err);
        res.status(500).send("Instagram OAuth callback failed. Please try again.");
      }
    });
  }
  