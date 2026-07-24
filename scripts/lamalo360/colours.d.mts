export function colourKey(value: unknown): string;
export function requiresGeneratedTexture(value: unknown): boolean;
export function colourHex(value: unknown): string;
export function patternPrompt(
  colourName: string,
  master: { baseName: string; materials?: string[] },
): string;
