/**
 * socialPostingEngine.ts
 * Handles actual posting to LinkedIn, Reddit, and WhatsApp (via Twilio)
 * All credentials are loaded from environment variables.
 */

import { ENV } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// LINKEDIN POSTING
// LinkedIn API v2 — uses OAuth2 access token
// Required env vars: LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN or LINKEDIN_ORG_URN
// ─────────────────────────────────────────────────────────────────────────────

export async function postToLinkedIn(options: LinkedInPostOptions): Promise<PostResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN; // urn:li:person:XXXXX
  const orgUrn = process.env.LINKEDIN_ORG_URN; // urn:li:organization:XXXXX

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
            title: { text: options.title || "Virelle Studios — AI Film Production" },
          },
        ];
      } catch (imgErr: any) {
        console.warn("[LinkedIn] Image upload failed, posting text only:", imgErr.message);
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

    console.log(`[LinkedIn] Posted successfully: ${postId}`);
    return {
      platform: "linkedin",
      success: true,
      postId,
      postUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[LinkedIn] Post failed:", err.message);
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

// ─────────────────────────────────────────────────────────────────────────────
// REDDIT POSTING
// Reddit API — uses OAuth2 with username/password flow
// Required env vars: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

let redditAccessToken: string | null = null;
let redditTokenExpiry: number = 0;

async function getRedditAccessToken(): Promise<string> {
  if (redditAccessToken && Date.now() < redditTokenExpiry) {
    return redditAccessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

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

    console.log(`[Reddit] Posted to r/${options.subreddit}: ${postUrl}`);
    return {
      platform: `reddit_${options.subreddit}`,
      success: true,
      postId,
      postUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`[Reddit] Post to r/${options.subreddit} failed:`, err.message);
    return {
      platform: `reddit_${options.subreddit}`,
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP POSTING VIA TWILIO
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// TWILIO_WHATSAPP_FROM should be in format: whatsapp:+14155238886
// TWILIO_WHATSAPP_BROADCAST_LIST: comma-separated list of numbers to broadcast to
// ─────────────────────────────────────────────────────────────────────────────

export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<PostResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

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

    console.log(`[WhatsApp] Message sent to ${options.to}: ${message.sid}`);
    return {
      platform: "whatsapp",
      success: true,
      postId: message.sid,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[WhatsApp] Send failed:", err.message);
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
  const broadcastList = process.env.TWILIO_WHATSAPP_BROADCAST_LIST;
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

// ─────────────────────────────────────────────────────────────────────────────
// VIRELLE FILM SUBREDDITS — best communities to post to
// ─────────────────────────────────────────────────────────────────────────────

export const VIRELLE_REDDIT_TARGETS = [
  { subreddit: "artificial", description: "AI general community" },
  { subreddit: "MachineLearning", description: "ML research community" },
  { subreddit: "filmmaking", description: "Filmmakers community" },
  { subreddit: "Screenwriting", description: "Screenwriters community" },
  { subreddit: "indiefilm", description: "Independent filmmakers" },
  { subreddit: "VideoEditing", description: "Video editors" },
  { subreddit: "AIArt", description: "AI art community" },
  { subreddit: "ChatGPT", description: "AI tools community" },
  { subreddit: "Entrepreneur", description: "Entrepreneurs" },
  { subreddit: "SideProject", description: "Side projects showcase" },
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

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL STATUS CHECK
// ─────────────────────────────────────────────────────────────────────────────

export function getSocialCredentialStatus(): Record<string, { configured: boolean; missing: string[] }> {
  return {
    linkedin: {
      configured: !!(process.env.LINKEDIN_ACCESS_TOKEN && (process.env.LINKEDIN_PERSON_URN || process.env.LINKEDIN_ORG_URN)),
      missing: [
        ...(!process.env.LINKEDIN_ACCESS_TOKEN ? ["LINKEDIN_ACCESS_TOKEN"] : []),
        ...(!process.env.LINKEDIN_PERSON_URN && !process.env.LINKEDIN_ORG_URN ? ["LINKEDIN_PERSON_URN or LINKEDIN_ORG_URN"] : []),
      ],
    },
    reddit: {
      configured: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD),
      missing: [
        ...(!process.env.REDDIT_CLIENT_ID ? ["REDDIT_CLIENT_ID"] : []),
        ...(!process.env.REDDIT_CLIENT_SECRET ? ["REDDIT_CLIENT_SECRET"] : []),
        ...(!process.env.REDDIT_USERNAME ? ["REDDIT_USERNAME"] : []),
        ...(!process.env.REDDIT_PASSWORD ? ["REDDIT_PASSWORD"] : []),
      ],
    },
    whatsapp: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      missing: [
        ...(!process.env.TWILIO_ACCOUNT_SID ? ["TWILIO_ACCOUNT_SID"] : []),
        ...(!process.env.TWILIO_AUTH_TOKEN ? ["TWILIO_AUTH_TOKEN"] : []),
        ...(!process.env.TWILIO_WHATSAPP_FROM ? ["TWILIO_WHATSAPP_FROM (optional, defaults to sandbox)"] : []),
        ...(!process.env.TWILIO_WHATSAPP_BROADCAST_LIST ? ["TWILIO_WHATSAPP_BROADCAST_LIST"] : []),
      ],
    },
  };
}
