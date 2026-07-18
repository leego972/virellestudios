from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        print(f"{path}: already patched")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old[:100]!r}, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"{path}: patched")


# Mount the narrowly scoped token-issuing router.
patch(
    "server/routers.ts",
    'import { vfxSfxRouter } from "./vfx-sfx-router";',
    'import { vfxSfxRouter } from "./vfx-sfx-router";\nimport { mobileAuthRouter } from "./mobile-auth-router";',
)
patch(
    "server/routers.ts",
    'export const appRouter = router({\n  system: systemRouter,',
    'export const appRouter = router({\n  system: systemRouter,\n  mobileAuth: mobileAuthRouter,',
)

# Let only the Swappys endpoint resolve the scoped bearer token.
patch(
    "server/vfx-sfx-router.ts",
    'import { storagePut } from "./storage";',
    'import { storagePut } from "./storage";\nimport { authenticateSwappysMobileRequest } from "./_core/context";',
)
patch(
    "server/vfx-sfx-router.ts",
    '      const user = (ctx as any).user || null;',
    '      const user = (ctx as any).user || await authenticateSwappysMobileRequest(ctx.req);',
)

# Mount the public browser-to-app bridge page.
patch(
    "client/src/App.tsx",
    '  const SwappysHub = lazy(() => import("./pages/SwappysHub"));',
    '  const SwappysHub = lazy(() => import("./pages/SwappysHub"));\n  const MobileAuthBridge = lazy(() => import("./pages/MobileAuthBridge"));',
)
patch(
    "client/src/App.tsx",
    '      <Route path="/reset-password">{() => <LazyPage><ResetPassword /></LazyPage>}</Route>',
    '      <Route path="/reset-password">{() => <LazyPage><ResetPassword /></LazyPage>}</Route>\n      <Route path="/mobile-auth/swappys">{() => <LazyPage><MobileAuthBridge /></LazyPage>}</Route>',
)

# Preserve a validated internal return target through email and OAuth login.
patch(
    "client/src/pages/Login.tsx",
    '''  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");''',
    '''  const [, navigate] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  const requestedReturnTo = queryParams.get("returnTo");
  const returnTo = requestedReturnTo
    && requestedReturnTo.startsWith("/")
    && !requestedReturnTo.startsWith("//")
    && !requestedReturnTo.startsWith("/api/")
    && !requestedReturnTo.includes("\\\\")
      ? requestedReturnTo
      : null;
  const [email, setEmail] = useState("");''',
)
patch(
    "client/src/pages/Login.tsx",
    '''      // Clean the URL
      window.history.replaceState({}, "", "/login");''',
    '''      params.delete("error");
      const remainingQuery = params.toString();
      window.history.replaceState({}, "", `/login${remainingQuery ? `?${remainingQuery}` : ""}`);''',
)
patch(
    "client/src/pages/Login.tsx",
    '      navigate("/?opener=1");',
    '      navigate(returnTo || "/?opener=1");',
)
patch(
    "client/src/pages/Login.tsx",
    '                    href="/api/auth/google"',
    '                    href={returnTo ? `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/google"}',
)
patch(
    "client/src/pages/Login.tsx",
    '                    href="/api/auth/github"',
    '                    href={returnTo ? `/api/auth/github?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/github"}',
)
