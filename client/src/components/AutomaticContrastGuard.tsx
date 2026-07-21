import { useEffect } from "react";

const CONTENT_ROOTS = [
  "main",
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="select-content"]',
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
].join(",");

type Rgba = { red: number; green: number; blue: number; alpha: number };

function parseColour(value: string): Rgba | null {
  const match = value.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i,
  );
  if (!match) return null;
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha: match[4] === undefined ? 1 : Number(match[4]),
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
  if (element.matches("button, [role='button'], a, label")) return true;
  return Boolean(element.textContent?.trim());
}

function updateElement(element: HTMLElement) {
  if (!containsVisibleText(element)) {
    element.removeAttribute("data-auto-dark-text");
    return;
  }

  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    element.removeAttribute("data-auto-dark-text");
    return;
  }

  const foreground = parseColour(style.color);
  if (!foreground) return;
  const background = effectiveBackground(element);
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const ratio = contrastRatio(foregroundLuminance, backgroundLuminance);

  const isLightSurface = backgroundLuminance >= 0.72;
  const isLightText = foregroundLuminance >= 0.52;
  const isUnreadable = ratio < 4.5;

  if (isLightSurface && isLightText && isUnreadable) {
    element.setAttribute("data-auto-dark-text", "true");
  } else {
    element.removeAttribute("data-auto-dark-text");
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
      attributeFilter: ["class", "style", "data-state", "hidden"],
    });

    const themeObserver = new MutationObserver(scheduleScan);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", scheduleScan);
    window.addEventListener("orientationchange", scheduleScan);

    return () => {
      cancelAnimationFrame(frame);
      contentObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", scheduleScan);
      window.removeEventListener("orientationchange", scheduleScan);
    };
  }, []);

  return null;
}
