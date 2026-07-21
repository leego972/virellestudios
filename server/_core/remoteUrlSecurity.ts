import { lookup } from "node:dns/promises";
import * as https from "node:https";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";

export interface DownloadPublicFileOptions {
  maxBytes: number;
  allowedContentTypePrefixes?: string[];
  timeoutMs?: number;
  maxRedirects?: number;
}

type PublicTarget = {
  url: URL;
  address: string;
  family: 4 | 6;
};

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) !== 4 || isPrivateIpv4(mapped);
  }
  const firstHextet = Number.parseInt(normalized.split(":", 1)[0] || "0", 16);
  return normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    (Number.isFinite(firstHextet) && (firstHextet & 0xffc0) === 0xfe80) ||
    normalized.startsWith("ff") || normalized.startsWith("2001:db8:");
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export function hasExactHttpsHostname(rawUrl: string, allowedHostnames: readonly string[]): boolean {
  try {
    const url = new URL(rawUrl);
    const hostname = normalizedHostname(url);
    return url.protocol === "https:" && !url.username && !url.password &&
      allowedHostnames.some(host => hostname === host.toLowerCase().replace(/\.$/, ""));
  } catch {
    return false;
  }
}

async function resolvePublicTarget(rawUrl: string): Promise<PublicTarget> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Only credential-free HTTPS URLs are permitted.");
  }

  const hostname = normalizedHostname(url);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Local and internal hosts are not permitted.");
  }

  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateAddress(hostname)) throw new Error("Private or reserved network addresses are not permitted.");
    return { url, address: hostname, family: literalFamily as 4 | 6 };
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The URL resolves to a private, reserved or invalid network address.");
  }
  const selected = addresses[0];
  return { url, address: selected.address, family: selected.family as 4 | 6 };
}

export async function validatePublicHttpsUrl(rawUrl: string): Promise<URL> {
  return (await resolvePublicTarget(rawUrl)).url;
}

function requestPinned(target: PublicTarget, timeoutMs: number): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const hostname = normalizedHostname(target.url);
    const request = https.request({
      protocol: "https:",
      hostname,
      port: target.url.port ? Number(target.url.port) : 443,
      path: `${target.url.pathname}${target.url.search}`,
      method: "GET",
      headers: {
        Accept: "audio/*,video/*,image/*,application/octet-stream;q=0.8,*/*;q=0.1",
        "User-Agent": "Virelle-Remote-Media/1.0",
      },
      ...(isIP(hostname) ? {} : { servername: hostname }),
      lookup: ((_host: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
        callback(null, target.address, target.family);
      }) as any,
      rejectUnauthorized: true,
    }, resolve);
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Remote file request timed out.")));
    request.once("error", reject);
    request.end();
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function downloadPublicFile(
  rawUrl: string,
  options: DownloadPublicFileOptions,
): Promise<{ buffer: Buffer; contentType: string; finalUrl: string }> {
  const maxRedirects = Math.max(0, Math.min(5, options.maxRedirects ?? 3));
  const timeoutMs = Math.max(1_000, Math.min(120_000, options.timeoutMs ?? 30_000));
  let current = rawUrl;

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const target = await resolvePublicTarget(current);
    const response = await requestPinned(target, timeoutMs);
    const status = response.statusCode ?? 0;

    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = headerValue(response.headers.location);
      response.resume();
      if (!location || redirect === maxRedirects) throw new Error("Too many or invalid redirects.");
      current = new URL(location, target.url).toString();
      continue;
    }
    if (status < 200 || status >= 300) {
      response.resume();
      throw new Error(`Remote file request failed with HTTP ${status}.`);
    }

    const contentType = (headerValue(response.headers["content-type"]) || "application/octet-stream")
      .split(";")[0].trim().toLowerCase();
    const prefixes = options.allowedContentTypePrefixes ?? [];
    if (prefixes.length && !prefixes.some(prefix => contentType.startsWith(prefix))) {
      response.resume();
      throw new Error(`Remote file type ${contentType} is not permitted.`);
    }

    const declaredLength = Number(headerValue(response.headers["content-length"]) || 0);
    if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
      response.resume();
      throw new Error("Remote file exceeds the maximum permitted size.");
    }

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > options.maxBytes) {
        response.destroy();
        throw new Error("Remote file exceeds the maximum permitted size.");
      }
      chunks.push(buffer);
    }
    return { buffer: Buffer.concat(chunks), contentType, finalUrl: target.url.toString() };
  }
  throw new Error("Remote file download failed.");
}
