import { useEffect } from "react";

const CONTENT_ROOTS = [
  "main",
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="select-content"]',
  '[data-slot="command"]',
].join(",");

const TEXT_ELEMENTS = [
  "button",
  '[role="button"]',
  "a",
  "label",
  "p",
  "span",
  "small",
  "strong",
  "em",
  "li",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "input",
  "textarea",
  "select",
  "option",
].join(",");

type Rgba = { red: number; green: number; blue: number; alpha: number };

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

function effectiveBackground(element: HTMLElement): Rgba {
  let current: HTMLElement | null = element;
  while (current) {
    const colour = parseColour(getComputedStyle(current).backgroundColor);
    if (colour && colour.alpha >= 0.85) return colour;
    current = current.parentElement;
  }
  return { red: 255, green: 255, blue: 255, alpha: 1 };
}

function containsVisibleText(element: HTMLElement) {
  if (
    element.matches(
      "button, [role='button'], a, label, input, textarea, select, option",
    )
  ) {
    return true;
  }
  return Boolean(element.textContent?.trim());
}

function clearCorrection(element: HTMLElement) {
  element.removeAttribute("data-auto-dark-text");
  element.removeAttribute("data-auto-light-text");
}

function updateElement(element: HTMLElement) {
  if (!containsVisibleText(element)) {
    clearCorrection(element);
    return;
  }

  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    clearCorrection(element);
    return;
  }

  const foreground = parseColour(style.color);
  if (!foreground) {
    clearCorrection(element);
    return;
  }

  const background = effectiveBackground(element);
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const ratio = contrastRatio(foregroundLuminance, backgroundLuminance);
  const isUnreadable = ratio < 4.5;

  const needsDarkText =
    backgroundLuminance >= 0.62 &&
    foregroundLuminance >= 0.42 &&
    isUnreadable;
  const needsLightText =
    backgroundLuminance <= 0.34 &&
    foregroundLuminance <= 0.3 &&
    isUnreadable;

  if (needsDarkText) {
    element.setAttribute("data-auto-dark-text", "true");
    element.removeAttribute("data-auto-light-text");
  } else if (needsLightText) {
    element.setAttribute("data-auto-light-text", "true");
    element.removeAttribute("data-auto-dark-text");
  } else {
    clearCorrection(element);
  }
}

function scanContent() {
  document.querySelectorAll<HTMLElement>(CONTENT_ROOTS).forEach(root => {
    if (root.matches(TEXT_ELEMENTS)) updateElement(root);
    root.querySelectorAll<HTMLElement>(TEXT_ELEMENTS).forEach(updateElement);
  });
}

export default function AutomaticContrastGuard() {
  useEffect(() => {
    let frame = 0;
    const scheduleScan = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scanContent);
    };

    scheduleScan();

    const contentObserver = new MutationObserver(scheduleScan);
    contentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-state", "hidden", "disabled"],
    });

    const themeObserver = new MutationObserver(scheduleScan);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", scheduleScan);
    window.addEventListener("orientationchange", scheduleScan);
    window.addEventListener("pageshow", scheduleScan);

    return () => {
      cancelAnimationFrame(frame);
      contentObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", scheduleScan);
      window.removeEventListener("orientationchange", scheduleScan);
      window.removeEventListener("pageshow", scheduleScan);
    };
  }, []);

  return null;
}
