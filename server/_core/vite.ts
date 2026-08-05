import express, { type Express } from "express";
import { logger } from "./logger";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { injectMetaTags } from "../seo-engine";

// Vite is intentionally loaded only in development. This keeps dev-only
// plugins out of the production bundle.
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "../../vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        })
        .end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    logger.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Hashed Vite assets may be cached permanently. HTML and non-hashed files
  // must always be revalidated so a browser never keeps an old asset manifest.
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        const normalized = filePath.replace(/\\/g, "/");
        if (normalized.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }
        if (normalized.endsWith(".html")) {
          res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          );
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          return;
        }
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      },
    }),
  );

  // Never return index.html for a missing JS/CSS asset. Returning HTML for a
  // stale module URL causes every lazy navigation to fail with a module error.
  app.use("/assets/{*path}", (_req, res) => {
    res
      .status(404)
      .set({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      })
      .end(JSON.stringify({ error: "Asset not found; reload the current app version." }));
  });

  // SPA fallback. Always serve a fresh index so it points at the latest hashed
  // chunks after every Render deployment.
  app.use("/{*path}", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    const headers = {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    try {
      const html = fs.readFileSync(indexPath, "utf-8");
      const requestPath = req.originalUrl.split("?")[0].split("#")[0] || "/";
      const injected = injectMetaTags(html, requestPath);
      res.status(200).set(headers).end(injected);
    } catch {
      res.status(200).set(headers).sendFile(indexPath);
    }
  });
}
