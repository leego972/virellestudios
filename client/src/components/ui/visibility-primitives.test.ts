import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { badgeVariants } from "./badge";
import { buttonVariants } from "./button";

const standaloneShrinkClass = /(^|\s)shrink-0(\s|$)/;

describe("site-wide visibility primitives", () => {
  it("allows standard buttons to wrap and grow vertically", () => {
    const classes = buttonVariants({ size: "default" });

    expect(classes).toContain("min-w-0");
    expect(classes).toContain("max-w-full");
    expect(classes).toContain("whitespace-pre-wrap");
    expect(classes).toContain("min-h-9");
    expect(classes).not.toMatch(standaloneShrinkClass);
  });

  it("keeps icon-only buttons fixed while text buttons remain flexible", () => {
    const classes = buttonVariants({ size: "icon" });

    expect(classes).toMatch(standaloneShrinkClass);
    expect(classes).toContain("whitespace-nowrap");
  });

  it("allows badges to wrap rather than hiding long status text", () => {
    const classes = badgeVariants();

    expect(classes).toContain("min-w-0");
    expect(classes).toContain("max-w-full");
    expect(classes).toContain("whitespace-normal");
    expect(classes).not.toContain("overflow-hidden");
  });

  it("keeps watermark layers behind content and suppresses duplicates", () => {
    const css = readFileSync(
      new URL("../../sitewide-visibility.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain("[data-virelle-watermark] ~ *");
    expect(css).toContain(
      "[data-virelle-watermark][data-virelle-watermark-duplicate=\"true\"]",
    );
    expect(css).toContain("z-index: 1");
  });
});
