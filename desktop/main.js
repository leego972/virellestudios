// Virelle Studios desktop wrapper.
// Loads the production web app in a sandboxed native window with persistent
// session, single-instance locking and restricted virelle:// deep links.

const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("path");

const DEFAULT_TARGET = "https://www.virelle.life";
const TARGET_URL = process.env.VIRELLE_TARGET || DEFAULT_TARGET;
const PROTOCOL = "virelle";
const IS_DEV = !app.isPackaged;

function parseTargetOrigin() {
  const parsed = new URL(TARGET_URL);
  if (!IS_DEV && parsed.protocol !== "https:") {
    throw new Error("Packaged Virelle desktop builds require an HTTPS target.");
  }
  return parsed.origin;
}

const TARGET_ORIGIN = parseTargetOrigin();

function isAllowedInternalUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    if (parsed.origin === TARGET_ORIGIN && (parsed.protocol === "https:" || IS_DEV)) return true;
    if (IS_DEV && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    return false;
  } catch {
    return false;
  }
}

function safeExternalUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return null;
    return ["https:", "mailto:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let mainWindow = null;
let pendingDeepLink = null;

function extractDeepLink(argv) {
  return argv.find((argument) => typeof argument === "string" && argument.startsWith(`${PROTOCOL}://`)) || null;
}

function resolveDeepLink(value) {
  try {
    if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) return null;
    const parsed = new URL(value);
    if (parsed.protocol !== `${PROTOCOL}:` || parsed.username || parsed.password) return null;

    // virelle://projects/42 -> https://www.virelle.life/projects/42
    // The custom-scheme host is treated as the first path segment, never as a hostname.
    const segments = [parsed.hostname, ...parsed.pathname.split("/")]
      .filter(Boolean)
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)));
    const target = new URL(`/${segments.join("/")}`, `${TARGET_ORIGIN}/`);
    target.search = parsed.search;
    target.hash = parsed.hash;
    return isAllowedInternalUrl(target.toString()) ? target.toString() : null;
  } catch {
    return null;
  }
}

function handleDeepLink(value) {
  const target = resolveDeepLink(value);
  if (!target) return;
  if (!mainWindow) {
    pendingDeepLink = value;
    return;
  }
  mainWindow.loadURL(target);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

app.on("second-instance", (_event, argv) => {
  const link = extractDeepLink(argv);
  if (link) handleDeepLink(link);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function openExternalSafely(value) {
  const external = safeExternalUrl(value);
  if (external) void shell.openExternal(external);
}

function guardNavigation(event, value) {
  if (isAllowedInternalUrl(value)) return;
  event.preventDefault();
  openExternalSafely(value);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "Virelle Studios",
    backgroundColor: "#000000",
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (isAllowedInternalUrl(details.url)) {
      details.requestHeaders["X-Virelle-Client"] = "desktop";
      details.requestHeaders["X-Virelle-Desktop-Version"] = app.getVersion();
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInternalUrl(url)) return { action: "allow" };
    openExternalSafely(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", guardNavigation);
  mainWindow.webContents.on("will-redirect", guardNavigation);
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());

  if (!IS_DEV) {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const devToolsShortcut = input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i");
      if (devToolsShortcut) event.preventDefault();
    });
  }

  mainWindow.loadURL(TARGET_ORIGIN);
  mainWindow.on("closed", () => { mainWindow = null; });

  if (pendingDeepLink) {
    handleDeepLink(pendingDeepLink);
    pendingDeepLink = null;
  }
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const viewMenu = [
    { role: "reload" },
    { role: "forceReload" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ];
  if (IS_DEV) viewMenu.push({ role: "toggleDevTools" });

  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { label: "View", submenu: viewMenu },
    { role: "editMenu" },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [
        { label: "Open virelle.life", click: () => openExternalSafely(DEFAULT_TARGET) },
        { label: "Support", click: () => openExternalSafely(`${DEFAULT_TARGET}/support`) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  pendingDeepLink = pendingDeepLink || extractDeepLink(process.argv);
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
