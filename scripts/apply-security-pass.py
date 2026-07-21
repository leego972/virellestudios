from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    Path(path).write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count == 0 and new in content:
        return
    if count != 1:
        raise RuntimeError(f"{path}: expected one old block, found {count}")
    write(path, content.replace(old, new, 1))


# Exact-host provider classification. Substring checks can be fooled by hosts
# such as api.openai.com.attacker.example.
llm_path = "server/_core/llm.ts"
llm = read(llm_path)
if 'from "./remoteUrlSecurity"' not in llm:
    llm = llm.replace(
        'import { logger } from "./logger";',
        'import { logger } from "./logger";\nimport { hasExactHttpsHostname } from "./remoteUrlSecurity";',
        1,
    )
llm = llm.replace('provider.url.includes("openai.com")', 'hasExactHttpsHostname(provider.url, ["api.openai.com"])')
write(llm_path, llm)


voice_path = "server/_core/voiceTranscription.ts"
voice = read(voice_path)
if 'from "./remoteUrlSecurity"' not in voice:
    voice = voice.replace(
        'import { logger } from "./logger";',
        'import { logger } from "./logger";\nimport { downloadPublicFile, hasExactHttpsHostname } from "./remoteUrlSecurity";',
        1,
    )
old_download = '''      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
      
      // Check file size (16MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }'''
new_download = '''      const downloaded = await downloadPublicFile(options.audioUrl, {
        maxBytes: 16 * 1024 * 1024,
        timeoutMs: 30_000,
        maxRedirects: 3,
        allowedContentTypePrefixes: ["audio/", "video/", "application/octet-stream"],
      });
      audioBuffer = downloaded.buffer;
      mimeType = downloaded.contentType;'''
if old_download in voice:
    voice = voice.replace(old_download, new_download, 1)
elif new_download not in voice:
    raise RuntimeError("voiceTranscription download block was not found")
voice = voice.replace('transcriptionUrl.includes("openai.com")', 'hasExactHttpsHostname(transcriptionUrl, ["api.openai.com"])')
write(voice_path, voice)


# OAuth trust boundary: canonical callback origin, shared rate limiting, bounded
# provider calls, and verified GitHub email before linking an existing account.
oauth_path = "server/_core/oauth.ts"
oauth = read(oauth_path)
if 'from "./rateLimit"' not in oauth:
    oauth = oauth.replace(
        'import { createSessionToken } from "./context";',
        'import { createSessionToken } from "./context";\nimport { rateLimitPublicByIP } from "./rateLimit";',
        1,
    )

callback_old = '''function getCallbackUrl(req: Request): string {
  if (ENV.publicAppUrl) return `${ENV.publicAppUrl}/api/oauth/callback`;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}/api/oauth/callback`;
}'''
callback_new = '''function getCallbackUrl(req: Request): string {
  if (ENV.publicAppUrl) {
    const base = new URL(ENV.publicAppUrl);
    if (ENV.isProduction && base.protocol !== "https:") {
      throw new Error("PUBLIC_APP_URL must use HTTPS in production");
    }
    if (base.username || base.password) throw new Error("PUBLIC_APP_URL must not contain credentials");
    base.pathname = "/api/oauth/callback";
    base.search = "";
    base.hash = "";
    return base.toString();
  }
  if (ENV.isProduction) throw new Error("PUBLIC_APP_URL must be configured for OAuth in production");
  const host = req.headers.host;
  if (!host) throw new Error("OAuth callback host is unavailable");
  return new URL("/api/oauth/callback", `${req.protocol}://${host}`).toString();
}'''
if callback_old in oauth:
    oauth = oauth.replace(callback_old, callback_new, 1)
elif callback_new not in oauth:
    raise RuntimeError("OAuth callback builder was not found")

old_attempt_helpers = re.compile(
    r'const passwordLoginAttempts = new Map<[\s\S]*?function clearPasswordLoginAttempts\(key: string\) \{[\s\S]*?\n\}',
)
new_attempt_helpers = '''function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function allowPublicRequest(
  req: Request,
  res: Response,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  try {
    await rateLimitPublicByIP(requestIp(req), action, maxRequests, windowMs);
    return true;
  } catch {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return false;
  }
}'''
if "const passwordLoginAttempts" in oauth:
    oauth, count = old_attempt_helpers.subn(new_attempt_helpers, oauth, count=1)
    if count != 1:
        raise RuntimeError("OAuth legacy attempt helpers were not replaced")

old_attempt = '''      const attemptKey = passwordLoginKey(req, email);
      if (!passwordLoginAllowed(attemptKey)) {
        res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
        return;
      }'''
new_attempt = '''      if (!(await allowPublicRequest(req, res, "password-login", 30, 15 * 60_000))) return;
      const emailKey = crypto.createHash("sha256").update(email).digest("hex").slice(0, 20);
      if (!(await allowPublicRequest(req, res, `password-login:${emailKey}`, 12, 15 * 60_000))) return;'''
if old_attempt in oauth:
    oauth = oauth.replace(old_attempt, new_attempt, 1)
oauth = oauth.replace("        clearPasswordLoginAttempts(attemptKey);\n", "")

if '"oauth-google-start"' not in oauth:
    oauth = oauth.replace(
        'app.get("/api/auth/google", (req: Request, res: Response) => {',
        'app.get("/api/auth/google", async (req: Request, res: Response) => {\n    if (!(await allowPublicRequest(req, res, "oauth-google-start", 20, 15 * 60_000))) return;',
        1,
    )
if '"oauth-github-start"' not in oauth:
    oauth = oauth.replace(
        'app.get("/api/auth/github", (req: Request, res: Response) => {',
        'app.get("/api/auth/github", async (req: Request, res: Response) => {\n    if (!(await allowPublicRequest(req, res, "oauth-github-start", 20, 15 * 60_000))) return;',
        1,
    )
if '"oauth-callback"' not in oauth:
    oauth = oauth.replace(
        'app.get("/api/oauth/callback", async (req: Request, res: Response) => {',
        'app.get("/api/oauth/callback", async (req: Request, res: Response) => {\n    if (!(await allowPublicRequest(req, res, "oauth-callback", 30, 15 * 60_000))) return;',
        1,
    )
oauth = oauth.replace(
    "if (!code || !state) {",
    "if (!code || code.length > 2048 || !state || !/^[a-f0-9]{48}$/i.test(state)) {",
    1,
)

# Add bounded provider-call timeouts using exact existing option blocks.
oauth = oauth.replace(
    '''          body: new URLSearchParams({
            client_id: ENV.googleOAuthClientId,
            client_secret: ENV.googleOAuthClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });''',
    '''          body: new URLSearchParams({
            client_id: ENV.googleOAuthClientId,
            client_secret: ENV.googleOAuthClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
          signal: AbortSignal.timeout(10_000),
        });''',
    1,
)
oauth = oauth.replace(
    '''        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });''',
    '''        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
          signal: AbortSignal.timeout(10_000),
        });''',
    1,
)
oauth = oauth.replace(
    '''        body: new URLSearchParams({
          client_id: ENV.githubOAuthClientId,
          client_secret: ENV.githubOAuthClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });''',
    '''        body: new URLSearchParams({
          client_id: ENV.githubOAuthClientId,
          client_secret: ENV.githubOAuthClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        signal: AbortSignal.timeout(10_000),
      });''',
    1,
)

# First GitHub API call: /user.
user_fetch_old = '''        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "virelle-studios",
        },
      });'''
user_fetch_new = '''        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "virelle-studios",
        },
        signal: AbortSignal.timeout(10_000),
      });'''
if user_fetch_old in oauth:
    oauth = oauth.replace(user_fetch_old, user_fetch_new, 1)

email_pattern = re.compile(
    r'      let email: string \| null = profile\.email \?\? null;[\s\S]*?      if \(!profile\.id \|\| !email\) \{',
)
email_replacement = '''      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "virelle-studios",
        },
        signal: AbortSignal.timeout(10_000),
      });
      let email: string | null = null;
      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const selected = emails.find(candidate => candidate.primary && candidate.verified)
          || emails.find(candidate => candidate.verified);
        email = selected?.email ?? null;
      }

      if (!profile.id || !email) {'''
if "let email: string | null = profile.email" in oauth:
    oauth, count = email_pattern.subn(email_replacement, oauth, count=1)
    if count != 1:
        raise RuntimeError("OAuth GitHub email verification block was not replaced")

write(oauth_path, oauth)


# SQL values remain parameters instead of being interpolated into raw SQL.
worker_path = "server/_core/videoJobWorker.ts"
worker = read(worker_path)
worker = worker.replace(
    'dbConn.execute(sql.raw(`SELECT id, thumbnailUrl FROM projects WHERE id = ${meta.projectId} LIMIT 1`))',
    'dbConn.execute(sql`SELECT id, thumbnailUrl FROM projects WHERE id = ${meta.projectId} LIMIT 1`)',
)
worker = worker.replace(
    'dbConn.execute(sql.raw(`UPDATE projects SET thumbnailUrl = \'${thumbnailUrl.replace(/\'/g, "\\\\\'")}\' WHERE id = ${meta.projectId}`))',
    'dbConn.execute(sql`UPDATE projects SET thumbnailUrl = ${thumbnailUrl} WHERE id = ${meta.projectId}`)',
)
write(worker_path, worker)


# Verified quality defects from CodeQL/manual review.
chart_path = "client/src/components/ui/chart.tsx"
write(chart_path, read(chart_path).replace("stroke-amber-500/20rder/50", "stroke-border/50"))

series_path = "client/src/pages/SeriesBible.tsx"
series = read(series_path).replace('arc: ss.arc ?? ss.arc ?? "",', 'arc: ss.arc ?? "",')
series = series.replace('if (activeSeries && !editingSeries) {', 'if (activeSeries) {')
write(series_path, series)

advertising_path = "server/advertising-orchestrator.ts"
advertising = read(advertising_path)
advertising = advertising.replace(
    '''    // Get affiliate stats
    // affiliatePartners table not in schema â return early
    const partners: unknown[] = [];
    if (false) await (db as any).query.affiliatePartners?.findMany({
      where: (affiliatePartners: any) => eq(affiliatePartners.status, "active"),
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentClicks: unknown[] = [];
    if (false) await (db as any).query.affiliateClicks?.findMany({
      where: (affiliateClicks: any) => gte(affiliateClicks.createdAt, thirtyDaysAgo),
    });''',
    '''    // Affiliate tables are not present in the active schema. Report a neutral
    // status instead of retaining unreachable query code that can silently rot.
    const partners: unknown[] = [];
    const recentClicks: unknown[] = [];''',
)
write(advertising_path, advertising)

# Keep the service-worker version aligned with client/index.html's cache migration.
sw_path = "client/public/sw.js"
write(sw_path, read(sw_path).replace('const CACHE_VERSION = "v1.3.1";', 'const CACHE_VERSION = "v1.3.0";'))

# The public Express limiter should trust Express's configured proxy chain,
# rather than parsing an attacker-controlled forwarded header itself.
index_path = "server/_core/index.ts"
index = read(index_path)
index = index.replace(
    '''    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";''',
    '''    const ip = req.ip || req.socket.remoteAddress || "unknown";''',
    1,
)
write(index_path, index)
