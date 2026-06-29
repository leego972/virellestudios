/**
 * socialPostingEngine.ts
 * Handles actual posting to LinkedIn, Reddit, and WhatsApp (via Twilio)
 * All credentials are loaded from environment variables.
 */

import { ENV } from "./env";
import { logger } from "./logger";
import { getCred } from "./channelConfigStore";

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TYPES
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface PostResult {
  platform: string;
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
  timestamp: string;
}

export interface LinkedInPostOptions {
  text: string;
  imageUrl?: string;
  title?: string;
}

export interface RedditPostOptions {
  subreddit: string;
  title: string;
  text?: string;
  url?: string;
  imageUrl?: string;
}

export interface WhatsAppMessageOptions {
  to: string; // E.164 format e.g. +447700900000
  text: string;
  mediaUrl?: string; // Image or video URL
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// LINKEDIN POSTING
// LinkedIn API v2 â uses OAuth2 access token
// Required env vars: LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN or LINKEDIN_ORG_URN
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function postToLinkedIn(options: LinkedInPostOptions): Promise<PostResult> {
  const accessToken = getCred("LINKEDIN_ACCESS_TOKEN", "linkedin_access_token");
  const personUrn = getCred("LINKEDIN_PERSON_URN", "linkedin_person_urn"); // urn:li:person:XXXXX
  const orgUrn = getCred("LINKEDIN_ORG_URN", "linkedin_org_urn"); // urn:li:organization:XXXXX

  if (!accessToken) {
    return {
      platform: "linkedin",
      success: false,
      error: "LINKEDIN_ACCESS_TOKEN not configured. Add it to Railway environment variables.",
      timestamp: new Date().toISOString(),
    };
  }

  const authorUrn = orgUrn || personUrn;
  if (!authorUrn) {
    return {
      platform: "linkedin",
      success: false,
      error: "LINKEDIN_ORG_URN or LINKEDIN_PERSON_URN not configured.",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Build the post body
    const postBody: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: options.text,
          },
          shareMediaCategory: options.imageUrl ? "IMAGE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    // If we have an image, upload it first
    if (options.imageUrl) {
      try {
        const imageAsset = await uploadLinkedInImage(accessToken, authorUrn, options.imageUrl);
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
          {
            status: "READY",
            description: { text: options.title || "Virelle Studios" },
            media: imageAsset,
            title: { text: options.title || "Virelle Studios â AI Film Production" },
          },
        ];
      } catch (imgErr: any) {
        logger.warn("[LinkedIn] Image upload failed, posting text only:", imgErr.message);
        postBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "NONE";
      }
    }

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LinkedIn API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const postId = data.id || data.value;
    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined;

    logger.info(`[LinkedIn] Posted successfully: ${postId}`);
    return {
      platform: "linkedin",
      success: true,
      postId,
      postUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    logger.error("[LinkedIn] Post failed:", err.message);
    return {
      platform: "linkedin",
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function uploadLinkedInImage(accessToken: string, authorUrn: string, imageUrl: string): Promise<string> {
  // Step 1: Register upload
  const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`LinkedIn register upload failed: ${registerResponse.status}`);
  }

  const registerData = await registerResponse.json() as any;
  const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const asset = registerData.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error("LinkedIn upload URL not received");
  }

  // Step 2: Download the image
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.status}`);
  const imgBuffer = await imgResponse.arrayBuffer();

  // Step 3: Upload the image binary
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/jpeg",
    },
    body: imgBuffer,
  });

  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    throw new Error(`LinkedIn image upload failed: ${uploadResponse.status}`);
  }

  return asset;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// REDDIT POSTING
// Reddit API â uses OAuth2 with username/password flow
// Required env vars: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let redditAccessToken: string | null = null;
let redditTokenExpiry: number = 0;

async function getRedditAccessToken(): Promise<string> {
  if (redditAccessToken && Date.now() < redditTokenExpiry) {
    return redditAccessToken;
  }

  const clientId = getCred("REDDIT_CLIENT_ID", "reddit_client_id");
  const clientSecret = getCred("REDDIT_CLIENT_SECRET", "reddit_client_secret");
  const username = getCred("REDDIT_USERNAME", "reddit_username");
  const password = getCred("REDDIT_PASSWORD", "reddit_password");

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Reddit credentials not configured. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD in Railway environment variables.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "VirelleStudios/1.0 (by /u/VirelleBotAdmin)",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }).toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Reddit auth failed: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  redditAccessToken = data.access_token;
  redditTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return redditAccessToken!;
}

export async function postToReddit(options: RedditPostOptions): Promise<PostResult> {
  try {
    const token = await getRedditAccessToken();

    const formData = new URLSearchParams();
    formData.append("sr", options.subreddit);
    formData.append("kind", options.url ? "link" : "self");
    formData.append("title", options.title);
    formData.append("resubmit", "true");
    formData.append("nsfw", "false");
    formData.append("spoiler", "false");

    if (options.url) {
      formData.append("url", options.url);
    } else if (options.text) {
      formData.append("text", options.text);
    }

    const response = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "VirelleStudios/1.0 (by /u/VirelleBotAdmin)",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Reddit API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const postData = data?.jquery?.find((item: any[]) => Array.isArray(item) && item[3] === "call" && item[2] === "redirect");
    const postUrl = data?.data?.url || `https://reddit.com/r/${options.subreddit}`;
    const postId = data?.data?.id;

    logger.info(`[Reddit] Posted to r/${options.subreddit}: ${postUrl}`);
    return {
      platform: `reddit_${options.subreddit}`,
      success: true,
      postId,
      postUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    logger.error(`[Reddit] Post to r/${options.subreddit} failed:`, err.message);
    return {
      platform: `reddit_${options.subreddit}`,
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// WHATSAPP POSTING VIA TWILIO
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// TWILIO_WHATSAPP_FROM should be in format: whatsapp:+14155238886
// TWILIO_WHATSAPP_BROADCAST_LIST: comma-separated list of numbers to broadcast to
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<PostResult> {
  const accountSid = getCred("TWILIO_ACCOUNT_SID", "twilio_account_sid");
  const authToken = getCred("TWILIO_AUTH_TOKEN", "twilio_auth_token");
  const from = getCred("TWILIO_WHATSAPP_FROM", "twilio_whatsapp_from") || "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    return {
      platform: "whatsapp",
      success: false,
      error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not configured. Add them to Railway environment variables.",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const { Twilio } = await import("twilio");
    const client = new Twilio(accountSid, authToken);

    const messageOptions: any = {
      from,
      to: options.to.startsWith("whatsapp:") ? options.to : `whatsapp:${options.to}`,
      body: options.text,
    };

    if (options.mediaUrl) {
      messageOptions.mediaUrl = [options.mediaUrl];
    }

    const message = await client.messages.create(messageOptions);

    logger.info(`[WhatsApp] Message sent to ${options.to}: ${message.sid}`);
    return {
      platform: "whatsapp",
      success: true,
      postId: message.sid,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    logger.error("[WhatsApp] Send failed:", err.message);
    return {
      platform: "whatsapp",
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Broadcast a WhatsApp message to all numbers in TWILIO_WHATSAPP_BROADCAST_LIST
 */
export async function broadcastWhatsApp(text: string, mediaUrl?: string): Promise<PostResult[]> {
  const broadcastList = getCred("TWILIO_WHATSAPP_BROADCAST_LIST", "twilio_whatsapp_broadcast_list");
  if (!broadcastList) {
    return [{
      platform: "whatsapp_broadcast",
      success: false,
      error: "TWILIO_WHATSAPP_BROADCAST_LIST not configured. Add comma-separated phone numbers to Railway environment variables.",
      timestamp: new Date().toISOString(),
    }];
  }

  const numbers = broadcastList.split(",").map(n => n.trim()).filter(Boolean);
  const results: PostResult[] = [];

  for (const number of numbers) {
    const result = await sendWhatsAppMessage({ to: number, text, mediaUrl });
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// VIRELLE FILM SUBREDDITS â best communities to post to
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const VIRELLE_REDDIT_TARGETS = [
    // ── Core filmmaking ──────────────────────────────────────────────────────
    { subreddit: "filmmaking",       description: "Filmmakers community",                       category: "core" },
    { subreddit: "Filmmakers",       description: "Broad filmmakers hub",                        category: "core" },
    { subreddit: "indiefilm",        description: "Independent filmmakers",                      category: "core" },
    { subreddit: "shortfilm",        description: "Short film makers",                           category: "core" },
    { subreddit: "cinematography",   description: "Cinematography students & pros",              category: "core" },
    { subreddit: "Screenwriting",    description: "Screenwriters community",                     category: "core" },
    { subreddit: "VideoEditing",     description: "Video editors",                               category: "core" },
    { subreddit: "videoproduction",  description: "Video production students & pros",            category: "core" },
    { subreddit: "vfx",              description: "VFX artists and students",                    category: "core" },
    { subreddit: "MotionDesign",     description: "Motion designers",                            category: "core" },
    { subreddit: "animation",        description: "Animation community",                         category: "core" },
    // ── Film school & education ───────────────────────────────────────────────
    { subreddit: "filmschool",       description: "Film school students",                        category: "education" },
    { subreddit: "studentfilms",     description: "Student film makers",                         category: "education" },
    { subreddit: "MediaProduction",  description: "Media production students",                   category: "education" },
    { subreddit: "AfterEffects",     description: "AE users transitioning to AI tools",          category: "education" },
    { subreddit: "premiere",         description: "Premiere Pro students & editors",             category: "education" },
    { subreddit: "DaVinciResolve",   description: "DaVinci Resolve users",                       category: "education" },
    { subreddit: "college",          description: "College students exploring creative tools",   category: "education" },
    { subreddit: "learnart",         description: "Students learning visual arts",               category: "education" },
    // ── AI & tech crossover ───────────────────────────────────────────────────
    { subreddit: "artificial",       description: "AI general community",                        category: "ai" },
    { subreddit: "AIArt",            description: "AI art community",                            category: "ai" },
    { subreddit: "AIVideo",          description: "AI video generation community",               category: "ai" },
    { subreddit: "StableDiffusion",  description: "SD users exploring AI video",                 category: "ai" },
    { subreddit: "MediaSynthesis",   description: "AI media generation",                         category: "ai" },
    { subreddit: "MachineLearning",  description: "ML research community",                       category: "ai" },
    { subreddit: "ChatGPT",          description: "AI tools enthusiasts",                        category: "ai" },
    // ── Creators & builders ───────────────────────────────────────────────────
    { subreddit: "NewTubers",        description: "New YouTubers wanting cinematic quality",     category: "creators" },
    { subreddit: "youtube",          description: "YouTubers upgrading production quality",      category: "creators" },
    { subreddit: "contentcreation",  description: "Content creators",                            category: "creators" },
    { subreddit: "Entrepreneur",     description: "Entrepreneurs building video brands",         category: "creators" },
    { subreddit: "SideProject",      description: "Side projects showcase",                      category: "creators" },
    { subreddit: "gamedev",          description: "Game devs needing cinematic cutscenes",       category: "creators" },
  ];


/**
 * Post to multiple Virelle-relevant subreddits
 * Rotates through subreddits to avoid spam detection
 */
export async function postToFilmSubreddits(
  title: string,
  text: string,
  url?: string,
  maxSubreddits: number = 2
): Promise<PostResult[]> {
  // Pick random subreddits from the list to avoid spam
  const shuffled = [...VIRELLE_REDDIT_TARGETS].sort(() => Math.random() - 0.5);
  const targets = shuffled.slice(0, maxSubreddits);
  const results: PostResult[] = [];

  for (const target of targets) {
    const result = await postToReddit({
      subreddit: target.subreddit,
      title,
      text,
      url,
    });
    results.push(result);
    // Wait 5 seconds between Reddit posts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return results;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// CREDENTIAL STATUS CHECK
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export function getSocialCredentialStatus(): Record<string, { configured: boolean; missing: string[] }> {
  return {
    linkedin: {
      configured: !!(getCred("LINKEDIN_ACCESS_TOKEN", "linkedin_access_token") && (getCred("LINKEDIN_PERSON_URN", "linkedin_person_urn") || getCred("LINKEDIN_ORG_URN", "linkedin_org_urn"))),
      missing: [
        ...(!getCred("LINKEDIN_ACCESS_TOKEN", "linkedin_access_token") ? ["LINKEDIN_ACCESS_TOKEN"] : []),
        ...(!getCred("LINKEDIN_PERSON_URN", "linkedin_person_urn") && !getCred("LINKEDIN_ORG_URN", "linkedin_org_urn") ? ["LINKEDIN_PERSON_URN or LINKEDIN_ORG_URN"] : []),
      ],
    },
    reddit: {
      configured: !!(getCred("REDDIT_CLIENT_ID", "reddit_client_id") && getCred("REDDIT_CLIENT_SECRET", "reddit_client_secret") && getCred("REDDIT_USERNAME", "reddit_username") && getCred("REDDIT_PASSWORD", "reddit_password")),
      missing: [
        ...(!getCred("REDDIT_CLIENT_ID", "reddit_client_id") ? ["REDDIT_CLIENT_ID"] : []),
        ...(!getCred("REDDIT_CLIENT_SECRET", "reddit_client_secret") ? ["REDDIT_CLIENT_SECRET"] : []),
        ...(!getCred("REDDIT_USERNAME", "reddit_username") ? ["REDDIT_USERNAME"] : []),
        ...(!getCred("REDDIT_PASSWORD", "reddit_password") ? ["REDDIT_PASSWORD"] : []),
      ],
    },
    whatsapp: {
      configured: !!(getCred("TWILIO_ACCOUNT_SID", "twilio_account_sid") && getCred("TWILIO_AUTH_TOKEN", "twilio_auth_token")),
      missing: [
        ...(!getCred("TWILIO_ACCOUNT_SID", "twilio_account_sid") ? ["TWILIO_ACCOUNT_SID"] : []),
        ...(!getCred("TWILIO_AUTH_TOKEN", "twilio_auth_token") ? ["TWILIO_AUTH_TOKEN"] : []),
        ...(!getCred("TWILIO_WHATSAPP_FROM", "twilio_whatsapp_from") ? ["TWILIO_WHATSAPP_FROM (optional, defaults to sandbox)"] : []),
        ...(!getCred("TWILIO_WHATSAPP_BROADCAST_LIST", "twilio_whatsapp_broadcast_list") ? ["TWILIO_WHATSAPP_BROADCAST_LIST"] : []),
      ],
    },
  };
}
