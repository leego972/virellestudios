// Preload script — runs in the isolated context before the page loads.
// Exposes a tiny, audited bridge to let the web app detect that it is
// running inside the Virelle desktop wrapper.

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("virelleDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
