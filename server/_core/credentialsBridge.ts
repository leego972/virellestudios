/**
 * Credentials Bridge — Virelle Studios
 *
 * Loads social platform credentials saved via Settings > Platforms (stored in DB)
 * into process.env so all posting engines use them automatically.
 *
 * Priority: Railway env vars always win; DB values fill any gaps.
 * Call once at the start of each advertising/publishing cycle.
 */
import * as db from "../db";
import { logger } from "./logger";

const log = logger.child({ module: "credentialsBridge" });

// Maps platform id + credential field name → ENV var name
const CRED_ENV_MAP: Record<string, Record<string, string>> = {
  discord:   { botToken: "DISCORD_BOT_TOKEN",       channelId: "DISCORD_CHANNEL_ID",          guildId: "DISCORD_GUILD_ID" },
  telegram:  { botToken: "TELEGRAM_BOT_TOKEN",       channelId: "TELEGRAM_CHANNEL_ID" },
  reddit:    { apiKey: "REDDIT_CLIENT_ID",           apiSecret: "REDDIT_CLIENT_SECRET",        accessToken: "REDDIT_ACCESS_TOKEN",   username: "REDDIT_USERNAME" },
  linkedin:  { accessToken: "LINKEDIN_ACCESS_TOKEN", organizationId: "LINKEDIN_ORGANIZATION_ID" },
  twitter:   { apiKey: "X_API_KEY",                  apiSecret: "X_API_SECRET",                accessToken: "X_ACCESS_TOKEN",        refreshToken: "X_ACCESS_TOKEN_SECRET" },
  devto:     { apiKey: "DEVTO_API_KEY" },
  medium:    { accessToken: "MEDIUM_ACCESS_TOKEN" },
  hashnode:  { apiKey: "HASHNODE_TOKEN",              publicationId: "HASHNODE_PUBLICATION_ID" },
  mastodon:  { accessToken: "MASTODON_ACCESS_TOKEN", channelId: "MASTODON_INSTANCE_URL" },
  pinterest: { accessToken: "PINTEREST_ACCESS_TOKEN", boardId: "PINTEREST_BOARD_ID" },
  threads:   { accessToken: "THREADS_ACCESS_TOKEN",  userId: "THREADS_USER_ID" },
  youtube:   { accessToken: "YOUTUBE_API_KEY",        refreshToken: "YOUTUBE_REFRESH_TOKEN",    channelId: "YOUTUBE_CHANNEL_ID" },
  instagram: { accessToken: "INSTAGRAM_ACCESS_TOKEN", pageId: "INSTAGRAM_USER_ID",             pageAccessToken: "INSTAGRAM_PAGE_ACCESS_TOKEN" },
  tiktok:    { accessToken: "TIKTOK_CREATOR_TOKEN",   openId: "TIKTOK_OPEN_ID",                refreshToken: "TIKTOK_REFRESH_TOKEN" },
};

let bridgeLoaded = false;

/**
 * Load admin social credentials from DB into process.env.
 * Safe to call multiple times — only runs once per process lifetime unless force=true.
 */
export async function loadCredentialsBridge(force = false): Promise<void> {
  if (bridgeLoaded && !force) return;
  try {
    const allCreds = await db.getAllActiveSocialCredentials();
    let loaded = 0;
    for (const cred of allCreds) {
      const map = CRED_ENV_MAP[cred.platform];
      if (!map || !cred.credentials) continue;
      let credObj: Record<string, string> = {};
      try { credObj = JSON.parse(cred.credentials as string); } catch { continue; }
      for (const [field, envKey] of Object.entries(map)) {
        if (credObj[field] && !process.env[envKey]) {
          process.env[envKey] = credObj[field];
          loaded++;
        }
      }
    }
    bridgeLoaded = true;
    log.info(`Credentials bridge loaded from DB — loaded: ${loaded}, platforms: ${allCreds.length}`);
  } catch (err) {
    log.warn(`Credentials bridge skipped (${String(err)}) — continuing with Railway env vars only`);
  }
}
