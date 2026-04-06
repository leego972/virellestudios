/**
 * youtube-service.ts
 *
 * Uploads a video (by URL) to the official Virelle Studios YouTube channel.
 *
 * Required Railway environment variables:
 *   YOUTUBE_CLIENT_ID          — Google OAuth2 client ID
 *   YOUTUBE_CLIENT_SECRET      — Google OAuth2 client secret
 *   YOUTUBE_REFRESH_TOKEN      — Long-lived refresh token for the Virelle Studios account
 *
 * To obtain the refresh token:
 *   1. Create a Google Cloud project, enable YouTube Data API v3
 *   2. Create OAuth2 credentials (Web application), add https://developers.google.com/oauthplayground as redirect URI
 *   3. At https://developers.google.com/oauthplayground, authorise scope:
 *      https://www.googleapis.com/auth/youtube.upload
 *   4. Exchange auth code for tokens — copy the refresh_token here
 */

import { google } from "googleapis";
import { Readable } from "stream";

export interface YouTubeUploadOptions {
  videoUrl: string;           // Publicly accessible video URL (S3/R2/CDN)
  title: string;              // Video title on YouTube
  description: string;        // Video description
  tags?: string[];            // Optional tags
  privacyStatus?: "public" | "unlisted" | "private"; // default: "public"
  categoryId?: string;        // YouTube category ID — 24 = Entertainment
}

export interface YouTubeUploadResult {
  youtubeVideoId: string;
  youtubeUrl: string;
}

function getOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "YouTube credentials not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN in environment variables."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Downloads the video from `videoUrl` and streams it directly to YouTube.
 * Returns the YouTube video ID and public URL.
 */
export async function uploadVideoToYouTube(
  opts: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  const auth = getOAuth2Client();
  const youtube = google.youtube({ version: "v3", auth });

  // Stream the video from the CDN URL directly to YouTube (no temp file needed)
  const response = await fetch(opts.videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch video for upload: ${response.status} ${response.statusText}`);
  }

  // Convert Web ReadableStream to Node.js Readable
  const nodeStream = Readable.fromWeb(response.body as any);

  const uploadResponse = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: opts.title,
        description: opts.description,
        tags: opts.tags ?? ["Virelle Studios", "AI Film", "AI Cinema", "Short Film"],
        categoryId: opts.categoryId ?? "24", // Entertainment
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: opts.privacyStatus ?? "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: "video/mp4",
      body: nodeStream,
    },
  });

  const videoId = uploadResponse.data.id;
  if (!videoId) {
    throw new Error("YouTube upload succeeded but no video ID was returned.");
  }

  return {
    youtubeVideoId: videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Returns true if YouTube credentials are configured in the environment.
 */
export function isYouTubeConfigured(): boolean {
  return !!(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  );
}
