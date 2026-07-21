import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface DownloadPublicFileOptions {
  maxBytes: number;
  allowedContentTypePrefixes?: string[];
  timeoutMs?: number;
  maxRedirects?: number;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  return normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.");
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
    return url.protocol === "https:" && !url.username && !url.password &&
      allowedHostnames.some(host => url.hostname.toLowerCase() === host.toLowerCase());
  } catch {
    return false;
  }
}

export async function validatePublicHttpsUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Only credential-free HTTPS URLs are permitted.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Local and internal hosts are not permitted.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private network addresses are not permitted.");
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The URL resolves to a private or invalid network address.");
  }
  return url;
}

export async function downloadPublicFile(
  rawUrl: string,
  options: DownloadPublicFileOptions,
): Promise<{ buffer: Buffer; contentType: string; finalUrl: string }> {
  const maxRedirects = Math.max(0, Math.min(5, options.maxRedirects ?? 3));
  const timeoutMs = Math.max(1_000, Math.min(120_000, options.timeoutMs ?? 30_000));
  let current = rawUrl;

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const safeUrl = await validatePublicHttpsUrl(current);
    const response = await fetch(safeUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "audio/*,video/*,application/octet-stream;q=0.8" },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location || redirect === maxRedirects) throw new Error("Too many or invalid redirects.");
      current = new URL(location, safeUrl).toString();
      continue;
    }

    if (!response.ok) throw new Error(`Remote file request failed with HTTP ${response.status}.`);

    const contentType = (response.headers.get("content-type") || "application/octet-stream")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const prefixes = options.allowedContentTypePrefixes ?? [];
    if (prefixes.length && !prefixes.some(prefix => contentType.startsWith(prefix))) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Remote file type ${contentType} is not permitted.`);
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > options.maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Remote file exceeds the maximum permitted size.");
    }
    if (!response.body) throw new Error("Remote file returned no body.");

    const chunks: Buffer[] = [];
    let total = 0;
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Remote file exceeds the maximum permitted size.");
      }
      chunks.push(Buffer.from(value));
    }

    return { buffer: Buffer.concat(chunks), contentType, finalUrl: safeUrl.toString() };
  }

  throw new Error("Remote file download failed.");
}
