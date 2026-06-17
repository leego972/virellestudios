import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
  import { logger } from "./_core/logger";
  import { requireAdminExpress } from "./_core/context";
  import { ENV } from "./_core/env";

  const SNAPCHAT_SCOPES = "snapchat-marketing-api";

  function getRedirectUri(req: Request): string {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    return `${protocol}://${host}/api/snapchat/callback`;
  }

  export function registerSnapchatOAuthRoutes(app: Express) {
    /** GET /api/snapchat/connect — admin only, redirects to Snapchat OAuth */
    app.get("/api/snapchat/connect", requireAdminExpress, (req: Request, res: Response) => {
      const clientId = ENV.snapchatClientId.trim();
      if (!clientId) {
        res.status(400).send(`
          <html><body style="font-family:sans-serif;background:#080808;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
          <div style="max-width:500px;background:#111;border:1px solid #c9a84c;border-radius:16px;padding:40px;">
            <h2 style="color:#c9a84c;margin-bottom:16px;">⚠️ Snapchat Not Configured</h2>
            <p style="color:#aaa;margin-bottom:20px;">Add your Snapchat app credentials to Railway first.</p>
            <ol style="color:#aaa;line-height:2;padding-left:20px;">
              <li>Go to <a href="https://business.snapchat.com" target="_blank" style="color:#c9a84c;">Snapchat Business Manager</a></li>
              <li>Create an OAuth app under <strong style="color:#fff;">Marketing API</strong></li>
              <li>Set redirect URI to: <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;color:#4ade80;">${getRedirectUri(req)}</code></li>
              <li>Copy <strong style="color:#fff;">Client ID</strong> → Railway → <code style="color:#c9a84c;">SNAPCHAT_CLIENT_ID</code></li>
              <li>Copy <strong style="color:#fff;">Client Secret</strong> → Railway → <code style="color:#c9a84c;">SNAPCHAT_CLIENT_SECRET</code></li>
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
        scope: SNAPCHAT_SCOPES,
        response_type: "code",
  
        // Generate CSRF state and persist it in a short-lived httpOnly cookie
  
        const oauthState = crypto.randomUUID();
  
        res.cookie("__virelle_oauth_state_snapchat", oauthState, {
  
          httpOnly: true,
  
          sameSite: "lax",
  
          secure: ((req.headers["x-forwarded-proto"] as string) || req.protocol) === "https",
  
          maxAge: 600,
  
        });
  
        // (state param included below)
      });
      res.redirect(302, `https://accounts.snapchat.com/login/oauth2/authorize?${params}`);
    });

    /** GET /api/snapchat/callback — exchanges code for tokens */
    app.get("/api/snapchat/callback", requireAdminExpress, async (req: Request, res: Response) => {
      const code = req.query.code as string;
      const error = req.query.error as string;

      if (error) {
        logger.error("[Snapchat OAuth] Auth error", { error });
        res.status(400).send(`<pre style="color:red">Snapchat auth error: ${error}</pre>`);
        return;
      }
      if (!code) {
        res.status(400).send("No authorisation code received from Snapchat.");
        return;
      }
        // Verify OAuth state cookie to prevent CSRF
        const _cookies = parseCookies(req.headers.cookie || "");
        const _expectedState = _cookies["__virelle_oauth_state_snapchat"];
        const _receivedState = req.query.state as string;
        res.clearCookie("__virelle_oauth_state_snapchat");
        if (!_expectedState || !_receivedState || _expectedState !== _receivedState) {
          logger.warn("[Snapchat OAuth] State mismatch — possible CSRF", { expected: _expectedState?.slice(0,8), received: _receivedState?.slice(0,8) });
          return res.status(403).send("Invalid OAuth state. Please try connecting again.");
        }

      const clientId = ENV.snapchatClientId.trim();
      const clientSecret = ENV.snapchatClientSecret.trim();
      if (!clientId || !clientSecret) {
        res.status(400).send("SNAPCHAT_CLIENT_ID / SNAPCHAT_CLIENT_SECRET not configured.");
        return;
      }

      try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenRes = await fetch("https://accounts.snapchat.com/login/oauth2/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: getRedirectUri(req),
          }),
        });

        const data = await tokenRes.json() as Record<string, any>;

        if (!tokenRes.ok || data.error) {
          logger.error("[Snapchat OAuth] Token exchange failed", data);
          res.status(400).send(`<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`);
          return;
        }

        const accessToken: string = data.access_token ?? "";
        const refreshToken: string = data.refresh_token ?? "";
        logger.info("[Snapchat OAuth] Tokens obtained successfully");

        res.send(`<!DOCTYPE html>
  <html>
  <head>
    <title>Snapchat Connected — Virelle Studios</title>
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
      <h1>✅ Snapchat Authorised!</h1>
      <p class="sub">Add these tokens to Railway to enable Snapchat integration.</p>
      <p class="label">SNAPCHAT_ACCESS_TOKEN</p>
      <div class="token-box" id="at">${accessToken}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('at').textContent).then(()=>this.textContent='✅ Copied!')">Copy Access Token</button>
      ${refreshToken ? `
      <p class="label">SNAPCHAT_REFRESH_TOKEN</p>
      <div class="token-box" id="rt">${refreshToken}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('rt').textContent).then(()=>this.textContent='✅ Copied!')">Copy Refresh Token</button>
      ` : ""}
      <div class="steps">
        <div class="step"><strong>Step 1 —</strong> Copy <code>SNAPCHAT_ACCESS_TOKEN</code> above</div>
        <div class="step"><strong>Step 2 —</strong> Railway → Variables → add <code>SNAPCHAT_ACCESS_TOKEN</code></div>
        ${refreshToken ? '<div class="step"><strong>Step 3 —</strong> Also add <code>SNAPCHAT_REFRESH_TOKEN</code></div>' : ""}
        <div class="step"><strong>Step ${refreshToken ? 4 : 3} —</strong> Redeploy — Snapchat is now live 🎬</div>
      </div>
      <a class="back" href="/content-creator">← Back to Content Creator</a>
    </div>
  </body>
  </html>`);
      } catch (err) {
        logger.error("[Snapchat OAuth] Callback error", { error: String(err) });
        res.status(500).send("Snapchat OAuth callback failed. Please try again.");
      }
    });
  }
  