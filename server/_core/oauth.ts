import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logger } from "./logger";

const OAUTH_RETURN_COOKIE = "virelle_oauth_return_to";
const OAUTH_RETURN_MAX_AGE_MS = 10 * 60 * 1000;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function safeInternalReturnPath(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.startsWith("/api/")) return null;
  return value.slice(0, 512);
}

function readCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...parts] = pair.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(parts.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function rememberReturnPath(req: Request, res: Response): void {
  const returnTo = safeInternalReturnPath(getQueryParam(req, "returnTo"));
  if (!returnTo) return;
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(OAUTH_RETURN_COOKIE, returnTo, {
    ...cookieOptions,
    httpOnly: true,
    maxAge: OAUTH_RETURN_MAX_AGE_MS,
  });
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    try {
      rememberReturnPath(req, res);
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const callbackUrl = `${protocol}://${host}/api/oauth/callback`;
      const redirectUrl = await sdk.getAuthorizationUrl("google", callbackUrl);
      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error("[OAuth] Google auth initiation failed", { error: String(error) });
      res.redirect(302, "/login?error=oauth_failed");
    }
  });

  app.get("/api/auth/github", async (req: Request, res: Response) => {
    try {
      rememberReturnPath(req, res);
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const callbackUrl = `${protocol}://${host}/api/oauth/callback`;
      const redirectUrl = await sdk.getAuthorizationUrl("github", callbackUrl);
      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error("[OAuth] GitHub auth initiation failed", { error: String(error) });
      res.redirect(302, "/login?error=oauth_failed");
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const returnTo = safeInternalReturnPath(readCookie(req, OAUTH_RETURN_COOKIE));
      res.clearCookie(OAUTH_RETURN_COOKIE, cookieOptions);
      res.redirect(302, returnTo || "/?opener=1");
    } catch (error) {
      logger.error("[OAuth] Callback failed", { error: String(error) });
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
