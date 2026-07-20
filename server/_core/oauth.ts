import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import express, { type Express, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logger } from "./logger";
import { ENV } from "./env";
import crypto from "crypto";
import { createSessionToken } from "./context";
import { findAuthUserByEmail, markAuthLoginSuccessful } from "./authDb";

const STATE_COOKIE = "oauth_state";
const PROVIDER_COOKIE = "oauth_provider";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getCallbackUrl(req: Request): string {
  if (ENV.publicAppUrl) return `${ENV.publicAppUrl}/api/oauth/callback`;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}/api/oauth/callback`;
}

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

  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "",
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, "/?opener=1");
}

const passwordLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function passwordLoginKey(req: Request, email: string): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim()
    || req.socket.remoteAddress
    || "unknown";
  return `${ip}:${email}`;
}

function passwordLoginAllowed(key: string): boolean {
  const now = Date.now();
  const current = passwordLoginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    passwordLoginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 12;
}

function clearPasswordLoginAttempts(key: string) {
  passwordLoginAttempts.delete(key);
}

export function registerOAuthRoutes(app: Express) {
  /**
   * Stable email/password login endpoint.
   *
   * This deliberately bypasses Drizzle's generated users SELECT. Older Virelle
   * production databases may temporarily lack a newer optional users column;
   * Drizzle then fails the entire login query before bcrypt can run. authDb uses
   * raw SELECT * so authentication continues while migrations reconcile the
   * optional application schema.
   */
  app.post(
    "/api/auth/password",
    express.json({ limit: "16kb" }),
    async (req: Request, res: Response) => {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length > 128) {
        res.status(400).json({ error: "Enter a valid email and password." });
        return;
      }

      const attemptKey = passwordLoginKey(req, email);
      if (!passwordLoginAllowed(attemptKey)) {
        res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
        return;
      }

      try {
        const user = await findAuthUserByEmail(email);
        if (!user || !user.passwordHash) {
          await new Promise(resolve => setTimeout(resolve, 250));
          res.status(401).json({ error: "Invalid email or password." });
          return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await new Promise(resolve => setTimeout(resolve, 250));
          res.status(401).json({ error: "Invalid email or password." });
          return;
        }

        const token = await createSessionToken(Number(user.id), user.name || "");
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        clearPasswordLoginAttempts(attemptKey);
        await markAuthLoginSuccessful(Number(user.id)).catch(error => {
          logger.warn("[Auth] Could not update lastSignedIn", { error: String(error) });
        });

        res.status(200).json({
          success: true,
          user: {
            id: Number(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        logger.errorWithStack("[Auth] Password login failed", error);
        res.status(503).json({ error: "Sign-in service is temporarily unavailable." });
      }
    },
  );

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
