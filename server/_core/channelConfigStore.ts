/**
   * channelConfigStore.ts — Runtime credential store for social posting channels.
   * Values set via the admin UI take effect immediately and survive until
   * the process restarts. For permanent storage, also set them as env vars.
   */

  const channelConfigs: Record<string, string> = {};

  export function setCred(key: string, value: string | undefined): void {
    if (!value?.trim()) { delete channelConfigs[key]; }
    else { channelConfigs[key] = value.trim(); }
  }

  export function getCred(envKey: string, storeKey: string): string | undefined {
    return channelConfigs[storeKey] || process.env[envKey] || undefined;
  }

  export function getConfiguredStatus() {
    return {
      linkedin:  !!(getCred("LINKEDIN_ACCESS_TOKEN", "linkedin_access_token") && (getCred("LINKEDIN_PERSON_URN", "linkedin_person_urn") || getCred("LINKEDIN_ORG_URN", "linkedin_org_urn"))),
      reddit:    !!(getCred("REDDIT_CLIENT_ID", "reddit_client_id") && getCred("REDDIT_CLIENT_SECRET", "reddit_client_secret") && getCred("REDDIT_USERNAME", "reddit_username") && getCred("REDDIT_PASSWORD", "reddit_password")),
      devto:     !!(getCred("DEV_TO_API_KEY", "devto_api_key")),
      discord:   !!(getCred("DISCORD_WEBHOOK_URL", "discord_webhook_url")),
      instagram: !!(getCred("INSTAGRAM_ACCESS_TOKEN", "instagram_access_token")),
      twilio:    !!(getCred("TWILIO_ACCOUNT_SID", "twilio_account_sid") && getCred("TWILIO_AUTH_TOKEN", "twilio_auth_token")),
    };
  }

  export function getMaskedConfig() {
    const mask = (storeKey: string) => channelConfigs[storeKey] ? "••••••••" : "";
    return {
      linkedin_access_token: mask("linkedin_access_token"),
      linkedin_person_urn:   channelConfigs["linkedin_person_urn"] ?? "",
      linkedin_org_urn:      channelConfigs["linkedin_org_urn"]    ?? "",
      reddit_client_id:      mask("reddit_client_id"),
      reddit_client_secret:  mask("reddit_client_secret"),
      reddit_username:       channelConfigs["reddit_username"]     ?? "",
      reddit_password:       mask("reddit_password"),
      devto_api_key:         mask("devto_api_key"),
      discord_webhook_url:   mask("discord_webhook_url"),
      instagram_access_token: mask("instagram_access_token"),
      twilio_account_sid:    mask("twilio_account_sid"),
      twilio_auth_token:     mask("twilio_auth_token"),
      twilio_whatsapp_from:  channelConfigs["twilio_whatsapp_from"] ?? "",
      configured: getConfiguredStatus(),
    };
  }

  export function setChannelConfigs(input: Record<string, string | undefined>): void {
    const allowed = [
      "linkedin_access_token","linkedin_person_urn","linkedin_org_urn",
      "reddit_client_id","reddit_client_secret","reddit_username","reddit_password",
      "devto_api_key","discord_webhook_url","instagram_access_token",
      "twilio_account_sid","twilio_auth_token","twilio_whatsapp_from",
    ];
    for (const key of allowed) {
      if (key in input) setCred(key, input[key]);
    }
  }
  