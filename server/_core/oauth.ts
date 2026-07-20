import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logger } from "./logger";
import { ENV } from "./env";
import crypto from "crypto";

const STATE_COOKIE = "oauth_state";
const PROVIDER_COOKIE = "oauth_provider";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes -- just long enough to complete the login

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getCallbackUrl(req: Request): string {
  // Prefer the configured public URL (correct behind Render's proxy/gateway);
  // fall back to request headers if it isn't set.
  if (ENV.publicAppUrl) return `${ENV.publicAppUrl}/api/oauth/callback`;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}/api/oauth/callback`;
}

/** Minimal manual cookie parse -- no cookie-parser middleware is installed on this app. */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function setShortLivedCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: STATE_MAX_AGE_MS,
    path: "/",
  });
}

function clearShortLivedCookie(res: Response, name: string) {
  res.clearCookie(name, { path: "/" });
}

async function completeLogin(
  req: Request,
  res: Response,
  user: { openId: string; name: string | null; email: string | null; loginMethod: string }
) {
  await db.upsertUser({
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    lastSignedIn: new Date(),
  });

  // Session issuance is local (self-signed JWT, ENV.cookieSecret) -- this part
  // never depended on the broker and works exactly as it did before.
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "",
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, "/?opener=1");
}

export function registerOAuthRoutes(app: Express) {
  // --- Google -----------------------------------------------------------------
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleOAuthClientId) {
      logger.error("[OAuth] GOOGLE_OAUTH_CLIENT_ID is not set");
      res.redirect(302, "/login?error=oauth_not_configured");
      return;
    }
    const state = crypto.randomBytes(24).toString("hex");
    setShortLivedCookie(res, STATE_COOKIE, state);
    setShortLivedCookie(res, PROVIDER_COOKIE, "google");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.googleOAuthClientId);
    url.searchParams.set("redirect_uri", getCallbackUrl(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    res.redirect(302, url.toString());
  });

  // --- GitHub -------------------------------------------------------------------
  app.get("/api/auth/github", (req: Request, res: Response) => {
    if (!ENV.githubOAuthClientId) {
      logger.error("[OAuth] GITHUB_OAUTH_CLIENT_ID is not set");
      res.redirect(302, "/login?error=oauth_not_configured");
      return;
    }
    const state = crypto.randomBytes(24).toString("hex");
    setShortLivedCookie(res, STATE_COOKIE, state);
    setShortLivedCookie(res, PROVIDER_COOKIE, "github");

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", ENV.githubOAuthClientId);
    url.searchParams.set("redirect_uri", getCallbackUrl(req));
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  // --- Shared callback ------------------------------------------------------------
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const expectedState = readCookie(req, STATE_COOKIE);
    const provider = readCookie(req, PROVIDER_COOKIE);

    clearShortLivedCookie(res, STATE_COOKIE);
    clearShortLivedCookie(res, PROVIDER_COOKIE);

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    if (!expectedState || state !== expectedState) {
      logger.error("[OAuth] State mismatch -- possible CSRF attempt or expired login attempt");
      res.redirect(302, "/login?error=oauth_state_mismatch");
      return;
    }
    if (provider !== "google" && provider !== "github") {
      res.redirect(302, "/login?error=oauth_failed");
      return;
    }

    try {
      const redirectUri = getCallbackUrl(req);

      if (provider === "google") {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: ENV.googleOAuthClientId,
            client_secret: ENV.googleOAuthClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });
        if (!tokenRes.ok) {
          logger.error("[OAuth] Google token exchange failed", { status: tokenRes.status, body: await tokenRes.text() });
          res.redirect(302, "/login?error=oauth_failed");
          return;
        }
        const tokenData = (await tokenRes.json()) as { access_token: string };

        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!userRes.ok) {
          logger.error("[OAuth] Google userinfo fetch failed", { status: userRes.status });
          res.redirect(302, "/login?error=oauth_failed");
          return;
        }
        const profile = (await userRes.json()) as {
          sub: string;
          email?: string;
          email_verified?: boolean;
          name?: string;
        };

        await completeLogin(req, res, {
          openId: `google_${profile.sub}`,
          name: profile.name || null,
          email: profile.email_verified ? profile.email ?? null : null,
          loginMethod: "google",
        });
        return;
      }

      // provider === "github"
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          client_id: ENV.githubOAuthClientId,
          client_secret: ENV.githubOAuthClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        logger.error("[OAuth] GitHub token exchange failed", { status: tokenRes.status, body: await tokenRes.text() });
        res.redirect(302, "/login?error=oauth_failed");
        return;
      }
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        logger.error("[OAuth] GitHub token exchange returned no access_token", { error: tokenData.error });
        res.redirect(302, "/login?error=oauth_failed");
        return;
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "virelle-studios" },
      });
      if (!userRes.ok) {
        logger.error("[OAuth] GitHub user fetch failed", { status: userRes.status });
        res.redirect(302, "/login?error=oauth_failed");
        return;
      }
      const profile = (await userRes.json()) as { id: number; login: string; name?: string; email?: string | null };

      // GitHub only returns a public email if the user has one set; otherwise
      // it's null and we need the emails endpoint to find their verified
      // primary address (requires the user:email scope, already requested).
      let email: string | null = profile.email ?? null;
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "virelle-studios" },
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
          email = primary?.email ?? null;
        }
      }

      await completeLogin(req, res, {
        openId: `github_${profile.id}`,
        name: profile.name || profile.login || null,
        email,
        loginMethod: "github",
      });
    } catch (error) {
      logger.error("[OAuth] Callback failed", { error: String(error) });
      res.redirect(302, "/login?error=oauth_failed");
    }
  });
}
