// Virelle Studios desktop wrapper.
// Loads the production web app in a native window with persistent session,
// single-instance lock, deep-link support (virelle://), and a stable user-agent
// the server can recognise via the X-Virelle-Client header.

const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("path");

const TARGET_URL = process.env.VIRELLE_TARGET || "https://www.virelle.life";
const PROTOCOL = "virelle";

// ── Single-instance lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Deep-link protocol registration ────────────────────────────────────────
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
  for (const a of argv) {
    if (typeof a === "string" && a.startsWith(`${PROTOCOL}://`)) return a;
  }
  return null;
}

function handleDeepLink(url) {
  if (!mainWindow || !url) {
    pendingDeepLink = url;
    return;
  }
  // virelle://path/foo?x=1  →  https://www.virelle.life/path/foo?x=1
  try {
    const parsed = new URL(url);
    const target = `${TARGET_URL}/${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/+/g, "/").replace(":/", "://");
    mainWindow.loadURL(target);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } catch {
    // Bad URL — ignore.
  }
}

app.on("second-instance", (_event, argv) => {
  const link = extractDeepLink(argv);
  if (link) handleDeepLink(link);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// macOS deep-link delivery
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// ── Window creation ─────────────────────────────────────────────────────────
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
    },
  });

  // Identify desktop traffic to the server. Virelle's analytics/telemetry can key off this.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    details.requestHeaders["X-Virelle-Client"] = "desktop";
    details.requestHeaders["X-Virelle-Desktop-Version"] = app.getVersion();
    cb({ requestHeaders: details.requestHeaders });
  });

  mainWindow.loadURL(TARGET_URL);

  // Open all external links (target=_blank, anchors to other origins) in the user's
  // real browser instead of inside the Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      const host = u.hostname;
      const internal = host === "www.virelle.life" || host === "virelle.life" || host === "localhost";
      if (!internal) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    } catch {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Same rule for in-window navigations to off-site URLs.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const u = new URL(url);
      const internal = u.hostname === "www.virelle.life" || u.hostname === "virelle.life" || u.hostname === "localhost";
      if (!internal) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // ignore
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  if (pendingDeepLink) {
    handleDeepLink(pendingDeepLink);
    pendingDeepLink = null;
  }
}

// ── Minimal application menu ────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
    { role: "editMenu" },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [
        {
          label: "Open virelle.life",
          click: () => shell.openExternal("https://www.virelle.life"),
        },
        {
          label: "Support",
          click: () => shell.openExternal("https://www.virelle.life/support"),
        },
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
