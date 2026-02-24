export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth env vars are not configured (e.g. Railway deployment without Manus OAuth),
  // return a safe fallback instead of crashing with Invalid URL
  if (!oauthPortalUrl || !appId) {
    console.warn("[Auth] VITE_OAUTH_PORTAL_URL or VITE_APP_ID not configured. OAuth login unavailable.");
    return "/login-unavailable";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(
    JSON.stringify({
      origin: window.location.origin,
      returnPath: returnPath || "/",
    })
  );

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
