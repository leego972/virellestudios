import { useEffect } from "react";

const TEXT_ELEMENTS = [
  "button",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="combobox"]',
  "a[href]",
  "label",
  "legend",
  "summary",
  "p",
  "span",
  "small",
  "strong",
  "em",
  "li",
  "dt",
  "dd",
  "td",
  "th",
  "caption",
  "figcaption",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  'input:not([type="hidden"])',
  "textarea",
  "select",
  "option",
  '[contenteditable="true"]',
].join(",");

const ALWAYS_CHECK = [
  "button",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="combobox"]',
  "a[href]",
  "label",
  "input",
  "textarea",
  "select",
  "option",
].join(",");

const IGNORE_SELECTOR = [
  '[data-contrast-ignore="true"]',
  '[aria-hidden="true"]',
  ".sr-only",
].join(",");

type Rgba = { red: number; green: number; blue: number; alpha: number };
type Surface = { colour: Rgba; uncertainImage: boolean };

const DARK_TEXT: Rgba = { red: 17, green: 17, blue: 17, alpha: 1 };
const LIGHT_TEXT: Rgba = { red: 255, green: 244, blue: 194, alpha: 1 };

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, value));
}

function linearToSrgb(value: number) {
  const converted =
    value <= 0.0031308
      ? 12.92 * value
      : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return clampChannel(converted * 255);
}

function parseOklch(value: string): Rgba | null {
  const match = value.match(
    /oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)/i,
  );
  if (!match) return null;

  const lightness = Number(match[1]) / (match[2] ? 100 : 1);
  const chroma = Number(match[3]);
  const hue = (Number(match[4]) * Math.PI) / 180;
  const alpha = match[5]
    ? Number(match[5]) / (match[6] ? 100 : 1)
    : 1;

  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime * lPrime * lPrime;
  const m = mPrime * mPrime * mPrime;
  const s = sPrime * sPrime * sPrime;

  return {
    red: linearToSrgb(
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    ),
    green: linearToSrgb(
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    ),
    blue: linearToSrgb(
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ),
    alpha,
  };
}

function parseColour(value: string): Rgba | null {
  if (!value || value === "transparent") {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }

  const rgb = value.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i,
  );
  if (rgb) {
    return {
      red: Number(rgb[1]),
      green: Number(rgb[2]),
      blue: Number(rgb[3]),
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  const shortHex = value.match(/^#([0-9a-f]{3})([0-9a-f])?$/i);
  if (shortHex) {
    return {
      red: Number.parseInt(`${shortHex[1][0]}${shortHex[1][0]}`, 16),
      green: Number.parseInt(`${shortHex[1][1]}${shortHex[1][1]}`, 16),
      blue: Number.parseInt(`${shortHex[1][2]}${shortHex[1][2]}`, 16),
      alpha: shortHex[2]
        ? Number.parseInt(`${shortHex[2]}${shortHex[2]}`, 16) / 255
        : 1,
    };
  }

  const hex = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    return {
      red: Number.parseInt(hex[1].slice(0, 2), 16),
      green: Number.parseInt(hex[1].slice(2, 4), 16),
      blue: Number.parseInt(hex[1].slice(4, 6), 16),
      alpha: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
    };
  }

  return parseOklch(value);
}

function composite(source: Rgba, destination: Rgba): Rgba {
  const alpha = source.alpha + destination.alpha * (1 - source.alpha);
  if (alpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };

  return {
    red:
      (source.red * source.alpha +
        destination.red * destination.alpha * (1 - source.alpha)) /
      alpha,
    green:
      (source.green * source.alpha +
        destination.green * destination.alpha * (1 - source.alpha)) /
      alpha,
    blue:
      (source.blue * source.alpha +
        destination.blue * destination.alpha * (1 - source.alpha)) /
      alpha,
    alpha,
  };
}

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(colour: Rgba) {
  return (
    0.2126 * channelLuminance(colour.red) +
    0.7152 * channelLuminance(colour.green) +
    0.0722 * channelLuminance(colour.blue)
  );
}

function contrastRatio(first: number, second: number) {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function fallbackCanvas(): Rgba {
  return document.documentElement.classList.contains("dark")
    ? { red: 245, green: 239, blue: 226, alpha: 1 }
    : { red: 9, green: 9, blue: 11, alpha: 1 };
}

function effectiveBackground(element: HTMLElement): Surface {
  const chain: HTMLElement[] = [];
  let current: HTMLElement | null = element;

  while (current) {
    chain.push(current);
    if (current === document.documentElement) break;
    current = current.parentElement;
  }

  let colour = fallbackCanvas();
  let uncertainImage = false;

  for (const node of chain.reverse()) {
    const style = getComputedStyle(node);
    const background = parseColour(style.backgroundColor);
    const hasImage =
      Boolean(style.backgroundImage) && style.backgroundImage !== "none";

    if (hasImage && (!background || background.alpha < 0.92)) {
      uncertainImage = true;
    }

    if (background && background.alpha > 0) {
      colour = composite(background, colour);
      if (background.alpha >= 0.92) uncertainImage = false;
    }
  }

  return { colour, uncertainImage };
}

function effectiveOpacity(element: HTMLElement) {
  let opacity = 1;
  let current: HTMLElement | null = element;

  while (current) {
    const value = Number(getComputedStyle(current).opacity);
    if (Number.isFinite(value)) opacity *= value;
    if (current === document.documentElement) break;
    current = current.parentElement;
  }

  return Math.max(0, Math.min(1, opacity));
}

function requiredContrast(style: CSSStyleDeclaration) {
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const parsedWeight = Number.parseInt(style.fontWeight, 10);
  const isBold = Number.isFinite(parsedWeight)
    ? parsedWeight >= 700
    : style.fontWeight === "bold";
  const isLarge = fontSize >= 24 || (fontSize >= 18.66 && isBold);
  return isLarge ? 3 : 4.5;
}

function containsVisibleText(element: HTMLElement) {
  if (element.matches(ALWAYS_CHECK)) return true;
  return Boolean(
    element.textContent?.trim() ||
      element.getAttribute("aria-label")?.trim() ||
      element.getAttribute("title")?.trim(),
  );
}

function clearCorrection(element: HTMLElement) {
  if (element.hasAttribute("data-auto-dark-text")) {
    element.removeAttribute("data-auto-dark-text");
  }
  if (element.hasAttribute("data-auto-light-text")) {
    element.removeAttribute("data-auto-light-text");
  }
}

function updateElement(element: HTMLElement) {
  if (element.closest(IGNORE_SELECTOR)) {
    clearCorrection(element);
    return;
  }

  if (!containsVisibleText(element)) {
    clearCorrection(element);
    return;
  }

  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0 ||
    element.getClientRects().length === 0
  ) {
    clearCorrection(element);
    return;
  }

  if (style.mixBlendMode !== "normal") {
    clearCorrection(element);
    return;
  }

  const foreground = parseColour(style.color);
  if (!foreground) {
    clearCorrection(element);
    return;
  }

  const background = effectiveBackground(element);

  // Text intentionally placed directly over photography or gradients cannot be
  // measured reliably from CSS alone. Leave it untouched unless an opaque child
  // surface (for example a button or card) gives us a dependable background.
  if (background.uncertainImage) {
    clearCorrection(element);
    return;
  }

  const opacity = effectiveOpacity(element);
  const backgroundLuminance = luminance(background.colour);
  const visibleForeground = composite(
    { ...foreground, alpha: foreground.alpha * opacity },
    background.colour,
  );
  const currentRatio = contrastRatio(
    luminance(visibleForeground),
    backgroundLuminance,
  );
  const minimumRatio = requiredContrast(style);

  if (currentRatio >= minimumRatio) {
    clearCorrection(element);
    return;
  }

  const visibleDark = composite(
    { ...DARK_TEXT, alpha: opacity },
    background.colour,
  );
  const visibleLight = composite(
    { ...LIGHT_TEXT, alpha: opacity },
    background.colour,
  );
  const darkRatio = contrastRatio(luminance(visibleDark), backgroundLuminance);
  const lightRatio = contrastRatio(
    luminance(visibleLight),
    backgroundLuminance,
  );

  if (darkRatio >= lightRatio) {
    element.setAttribute("data-auto-dark-text", "true");
    element.removeAttribute("data-auto-light-text");
  } else {
    element.setAttribute("data-auto-light-text", "true");
    element.removeAttribute("data-auto-dark-text");
  }
}

function scanTree(root: HTMLElement) {
  if (!root.isConnected) return;
  if (root.matches(TEXT_ELEMENTS)) updateElement(root);
  root.querySelectorAll<HTMLElement>(TEXT_ELEMENTS).forEach(updateElement);
}

export default function AutomaticContrastGuard() {
  useEffect(() => {
    let frame = 0;
    let fullScanQueued = true;
    const pendingRoots = new Set<HTMLElement>();

    const flush = () => {
      frame = 0;

      if (fullScanQueued) {
        fullScanQueued = false;
        pendingRoots.clear();
        scanTree(document.body);
        return;
      }

      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      roots.forEach(scanTree);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(flush);
    };

    const queueFullScan = () => {
      fullScanQueued = true;
      schedule();
    };

    const queueNode = (node: Node | null) => {
      if (!node) return;
      const element =
        node instanceof HTMLElement
          ? node
          : node.parentElement instanceof HTMLElement
            ? node.parentElement
            : null;
      if (!element) return;
      pendingRoots.add(element);
      schedule();
    };

    queueFullScan();

    const contentObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        queueNode(mutation.target);
        mutation.addedNodes.forEach(queueNode);
      }
    });

    contentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "data-state",
        "hidden",
        "disabled",
        "open",
        "aria-expanded",
        "aria-selected",
        "aria-checked",
      ],
    });

    const themeObserver = new MutationObserver(queueFullScan);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const queueEventTarget = (event: Event) => queueNode(event.target as Node);
    const queueVisiblePage = () => {
      if (document.visibilityState === "visible") queueFullScan();
    };

    window.addEventListener("resize", queueFullScan);
    window.addEventListener("orientationchange", queueFullScan);
    window.addEventListener("pageshow", queueFullScan);
    window.addEventListener("popstate", queueFullScan);
    window.addEventListener("hashchange", queueFullScan);
    document.addEventListener("visibilitychange", queueVisiblePage);
    document.addEventListener("focusin", queueEventTarget, true);
    document.addEventListener("pointerover", queueEventTarget, true);
    document.addEventListener("transitionend", queueEventTarget, true);
    document.addEventListener("animationend", queueEventTarget, true);
    document.addEventListener("input", queueEventTarget, true);
    document.addEventListener("change", queueEventTarget, true);

    document.fonts?.ready.then(queueFullScan).catch(() => undefined);

    return () => {
      cancelAnimationFrame(frame);
      contentObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", queueFullScan);
      window.removeEventListener("orientationchange", queueFullScan);
      window.removeEventListener("pageshow", queueFullScan);
      window.removeEventListener("popstate", queueFullScan);
      window.removeEventListener("hashchange", queueFullScan);
      document.removeEventListener("visibilitychange", queueVisiblePage);
      document.removeEventListener("focusin", queueEventTarget, true);
      document.removeEventListener("pointerover", queueEventTarget, true);
      document.removeEventListener("transitionend", queueEventTarget, true);
      document.removeEventListener("animationend", queueEventTarget, true);
      document.removeEventListener("input", queueEventTarget, true);
      document.removeEventListener("change", queueEventTarget, true);
    };
  }, []);

  return null;
}
