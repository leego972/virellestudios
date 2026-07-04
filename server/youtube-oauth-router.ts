import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { logger } from "./_core/logger";
import { requireAdminExpress } from "./_core/context";
import { ENV } from "./_core/env";
import { registerGrowthAutopilotRoutes, startVirelleGrowthAutopilot } from "./virelle-growth-autopilot";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
].join(" ");

function getRedirectUri(req: Request): string {
  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
  return `${protocol}://${host}/api/youtube/callback`;
}

export function registerYouTubeOAuthRoutes(app: Express) {
  /** GET /api/youtube/connect — admin only, redirects to Google OAuth */
  app.get("/api/youtube/connect", requireAdminExpress, (req: Request, res: Response) => {
    const clientId = ENV.youtubeClientId;
    if (!clientId) {
      res.status(400).send("YOUTUBE_CLIENT_ID not configured in Railway.");
      return;
    }

    // CSRF protection: generate state, store in short-lived httpOnly cookie.
    const oauthState = crypto.randomUUID();
    res.cookie("__virelle_oauth_state_youtube", oauthState, {
      httpOnly: true,
      sameSite: "lax",
      secure: ((req.headers["x-forwarded-proto"] as string) || req.protocol) === "https",
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(req),
      scope: YOUTUBE_SCOPES,
      response_type: "code",
      state: oauthState,
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(302, `https://accounts.google.com/o/oauth2/auth?${params}`);
  });

  /** GET /api/youtube/callback — exchanges code for refresh token, shows it on screen */
  app.get("/api/youtube/callback", requireAdminExpress, async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send("No authorisation code received from Google.");
      return;
    }

    // Verify OAuth state cookie to prevent CSRF.
    const cookies = parseCookies(req.headers.cookie || "");
    const expectedState = cookies["__virelle_oauth_state_youtube"];
    const receivedState = req.query.state as string;
    res.clearCookie("__virelle_oauth_state_youtube");
    if (!expectedState || !receivedState || expectedState !== receivedState) {
      logger.warn("[YouTube OAuth] State mismatch — possible CSRF", {
        expected: expectedState?.slice(0, 8),
        received: receivedState?.slice(0, 8),
      });
      res.status(403).send("Invalid OAuth state. Please try connecting again.");
      return;
    }

    const clientId = ENV.youtubeClientId;
    const clientSecret = ENV.youtubeClientSecret;

    if (!clientId || !clientSecret) {
      res.status(400).send("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not configured.");
      return;
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: getRedirectUri(req),
          grant_type: "authorization_code",
        }),
      });

      const tokens = (await tokenRes.json()) as Record<string, string>;

      if (!tokenRes.ok || !tokens.refresh_token) {
        logger.error("[YouTube OAuth] Token exchange failed", tokens);
        res.status(400).send(`<pre>Token exchange failed:\n${JSON.stringify(tokens, null, 2)}</pre>`);
        return;
      }

      const refreshToken = tokens.refresh_token;
      logger.info("[YouTube OAuth] Refresh token obtained successfully");

      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>YouTube Connected — Virelle Studios</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #080808; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #111; border: 1px solid #c9a84c; border-radius: 16px; padding: 40px; max-width: 620px; width: 100%; }
    h1 { color: #c9a84c; font-size: 24px; margin-bottom: 8px; }
    .sub { color: #888; margin-bottom: 28px; font-size: 15px; }
    .token-box { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 13px; color: #4ade80; word-break: break-all; margin-bottom: 16px; }
    .copy-btn { background: #c9a84c; color: #000; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer; display: block; width: 100%; margin-bottom: 28px; }
    .copy-btn:hover { background: #e6c06e; }
    .steps { background: #0d0d0d; border-radius: 10px; padding: 20px; border: 1px solid #1a1a1a; }
    .step { color: #aaa; margin: 10px 0; font-size: 14px; line-height: 1.5; }
    .step strong { color: #c9a84c; }
    .back { display: block; margin-top: 24px; color: #c9a84c; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✅ YouTube Authorised!</h1>
    <p class="sub">Copy this token and add it to Railway to enable Director's Assistant Growth Autopilot YouTube posting.</p>
    <div class="token-box" id="rt">${refreshToken}</div>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('rt').textContent).then(()=>this.textContent='✅ Copied to clipboard!')">Copy Refresh Token</button>
    <div class="steps">
      <div class="step"><strong>Step 1 —</strong> Copy the token above</div>
      <div class="step"><strong>Step 2 —</strong> Go to Railway → your project → Variables</div>
      <div class="step"><strong>Step 3 —</strong> Add variable: <strong>YOUTUBE_REFRESH_TOKEN</strong> = (paste)</div>
      <div class="step"><strong>Step 4 —</strong> Redeploy. The Director's Assistant will handle weekly content, SEO, and YouTube submission.</div>
    </div>
    <a class="back" href="/content-creator">← Back to Content Creator</a>
  </div>
</body>
</html>`);
    } catch (err) {
      logger.error("[YouTube OAuth] Callback error", { error: String(err) });
      res.status(500).send("YouTube OAuth callback failed. Please try again.");
    }
  });

  // Internal Director's Assistant Growth Autopilot controls.
  // This stays inside Virelle, uses admin-only routes, and excludes Snapchat/TikTok at launch.
  registerGrowthAutopilotRoutes(app);
  startVirelleGrowthAutopilot();
}
