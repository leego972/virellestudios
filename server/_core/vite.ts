import express, { type Express } from "express";
  import fs from "fs";
  import { type Server } from "http";
  import { nanoid } from "nanoid";
  import path from "path";
  import { injectMetaTags } from "../seo-engine";

  // vite and viteConfig are intentionally NOT imported at the module level.
  // In production, setupVite() is never called, so the Vite dev-server (and
  // Replit-specific Vite plugins such as vite-plugin-manus-runtime) never
  // initialise — avoiding hangs or crashes in non-Replit environments.

  export async function setupVite(app: Express, server: Server) {
    // Lazy imports — only executed in development when this function is called.
    // IMPORTANT: vite.config.ts is NOT dynamically imported here — passing it as a
    // path string means esbuild cannot statically trace it, so its dev-only imports
    // (vite-plugin-manus-runtime, @builder.io/vite-plugin-jsx-loc) are never bundled
    // into dist/index.js and cannot cause ERR_MODULE_NOT_FOUND on Railway.
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
    // Express 5: bare "*" is no longer a valid path — use "/{*path}" instead
    app.use("/{*path}", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          import.meta.dirname,
          "../..",
          "client",
          "index.html"
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  export function serveStatic(app: Express) {
    const distPath =
      process.env.NODE_ENV === "development"
        ? path.resolve(import.meta.dirname, "../..", "dist", "public")
        : path.resolve(import.meta.dirname, "public");
    if (!fs.existsSync(distPath)) {
      console.error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`
      );
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file does not exist.
    // Inject per-page SEO meta tags (canonical, title, description, OG) based on request path.
    // Express 5: bare "*" is no longer a valid path — use "/{*path}" instead.
    app.use("/{*path}", (req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      try {
        const html = fs.readFileSync(indexPath, "utf-8");
        // Use originalUrl (not req.path) to get the full path including any subpath
        const requestPath = req.originalUrl.split("?")[0].split("#")[0] || "/";
        const injected = injectMetaTags(html, requestPath);
        res.status(200).set({ "Content-Type": "text/html" }).end(injected);
      } catch {
        res.sendFile(indexPath);
      }
    });
  }
  