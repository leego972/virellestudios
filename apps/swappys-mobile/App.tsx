import React, { useCallback, useRef } from "react";
import { Alert, Linking, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { SWAPPYS_HTML } from "./src/SwappysWebApp";

type VirelleConnection = {
  ok: boolean;
  health?: string;
  features?: boolean;
  error?: string;
};

const extra = Constants.expoConfig?.extra ?? {};
const VIRELLE_BASE_URL = String(extra.virelleBaseUrl || "https://virelle.life").replace(/\/$/, "");
const UPGRADE_URL = String(extra.virelleUpgradeUrl || `${VIRELLE_BASE_URL}/register?source=swappys-mobile&campaign=result-upgrade&product=swappys&intent=creator-upgrade`);
const LOGIN_URL = String(extra.virelleLoginUrl || `${VIRELLE_BASE_URL}/login?source=swappys-mobile&campaign=result-signin`);
const MAX_RESULT_BYTES = 25 * 1024 * 1024;

function parsedHttpsUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isAllowedVirelleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const base = new URL(VIRELLE_BASE_URL);
    return url.protocol === "https:" && !url.username && !url.password && (url.hostname === base.hostname || url.hostname.endsWith(`.${base.hostname}`));
  } catch {
    return false;
  }
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export default function App() {
  const webRef = useRef<WebView>(null);

  const sendConnection = useCallback((payload: VirelleConnection) => {
    const fullPayload = { ...payload, baseUrl: VIRELLE_BASE_URL };
    const script = `window.SwappysNative && window.SwappysNative.setVirelleConnection(${JSON.stringify(fullPayload)}); true;`;
    webRef.current?.injectJavaScript(script);
  }, []);

  const checkVirelleConnection = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const healthResponse = await fetch(`${VIRELLE_BASE_URL}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json", "X-Swappys-Client": "mobile-1.1" },
        signal: controller.signal,
      });
      let healthStatus = `HTTP ${healthResponse.status}`;
      try {
        const healthJson = await healthResponse.json();
        healthStatus = String(healthJson?.status || healthJson?.success || healthStatus);
      } catch {
        // Non-JSON deployment failure is represented by the HTTP status.
      }

      let featuresOk = false;
      try {
        const featuresResponse = await fetch(`${VIRELLE_BASE_URL}/api/mobile/features`, {
          method: "GET",
          headers: { Accept: "application/json", "X-Swappys-Client": "mobile-1.1" },
          signal: controller.signal,
        });
        if (featuresResponse.ok) {
          const featuresJson = await featuresResponse.json();
          const flags = featuresJson?.flags ?? {};
          featuresOk = Boolean(
            featuresJson?.ok !== false &&
              flags?.creatorUpgrade &&
              flags?.swappysStudio &&
              flags?.watermarkControls &&
              flags?.byokVideoRequired,
          );
        }
      } catch {
        featuresOk = false;
      }

      sendConnection({
        ok: healthResponse.ok && featuresOk,
        health: featuresOk ? `${healthStatus} · Virelle transformation service online` : `${healthStatus} · required Swappys features unavailable`,
        features: featuresOk,
      });
    } catch (error: any) {
      sendConnection({ ok: false, error: error?.name === "AbortError" ? "Connection check timed out" : error?.message || "Connection check failed" });
    } finally {
      clearTimeout(timer);
    }
  }, [sendConnection]);

  const openUrl = useCallback(async (url: string) => {
    const resolved = url.includes("/register") ? UPGRADE_URL : url.includes("/login") ? LOGIN_URL : url;
    if (!isAllowedVirelleUrl(resolved)) {
      Alert.alert("Blocked link", "Swappys prevented an untrusted external link from opening.");
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(resolved);
      if (!canOpen) throw new Error("Cannot open URL");
      await Linking.openURL(resolved);
    } catch (error: any) {
      Alert.alert("Could not open Virelle Studios", error?.message || resolved);
    }
  }, []);

  const saveResult = useCallback(async (url: string) => {
    const parsed = parsedHttpsUrl(url);
    if (!parsed) {
      Alert.alert("Cannot save result", "Swappys blocked an insecure or malformed result URL.");
      return;
    }

    let contentType = "image/jpeg";
    try {
      const preflight = await fetch(parsed.toString(), { method: "HEAD", headers: { Accept: "image/*" } });
      if (!preflight.ok) throw new Error(`Result server returned HTTP ${preflight.status}`);
      contentType = (preflight.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const contentLength = Number(preflight.headers.get("content-length") || "0");
      if (!contentType.startsWith("image/")) throw new Error("The result URL did not return an image.");
      if (contentLength > MAX_RESULT_BYTES) throw new Error("The result is too large to save safely.");
    } catch (error: any) {
      Alert.alert("Could not verify result", error?.message || "The result host could not be verified.");
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Photo library access needed", "Allow photo access in Settings so Swappys can save previews directly.");
        return;
      }
      const extension = extensionForContentType(contentType);
      const tempUri = `${FileSystem.cacheDirectory}swappys_result_${Date.now()}.${extension}`;
      const download = await FileSystem.downloadAsync(parsed.toString(), tempUri, { headers: { Accept: "image/*" } });
      if (download.status < 200 || download.status >= 300) throw new Error(`Download failed (HTTP ${download.status})`);
      const info = await FileSystem.getInfoAsync(download.uri, { size: true });
      if (!info.exists || (typeof info.size === "number" && info.size > MAX_RESULT_BYTES)) {
        throw new Error("Downloaded result exceeded the safe size limit.");
      }
      const asset = await MediaLibrary.createAssetAsync(download.uri);
      await MediaLibrary.createAlbumAsync("Swappys", asset, false).catch(() => null);
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      Alert.alert("Saved to Photos", "Your visibly marked Swappys preview was saved to your photo library.");
    } catch (error: any) {
      Alert.alert("Could not save to Photos", error?.message || "Open the image and save it manually.");
    }
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    if (event.nativeEvent.data.length > 16_384) return;
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "openUrl" && typeof payload.url === "string") void openUrl(payload.url);
      if (payload?.type === "saveResult" && typeof payload.url === "string") void saveResult(payload.url);
      if (payload?.type === "checkVirelleConnection" || payload?.type === "appReady") void checkVirelleConnection();
    } catch {
      // Malformed WebView messages are ignored.
    }
  }, [checkVirelleConnection, openUrl, saveResult]);

  const allowNavigation = useCallback((request: WebViewNavigation) => {
    if (request.url === "about:blank" || request.url.startsWith("data:text/html")) return true;
    return isAllowedVirelleUrl(request.url);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WebView
          ref={webRef}
          source={{ html: SWAPPYS_HTML, baseUrl: VIRELLE_BASE_URL }}
          originWhitelist={["about:blank", "https://virelle.life", "https://www.virelle.life"]}
          onShouldStartLoadWithRequest={allowNavigation}
          javaScriptEnabled
          domStorageEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          onMessage={onMessage}
          onError={(event) => Alert.alert("Swappys failed to load", event.nativeEvent.description || "Unknown WebView error")}
          onHttpError={(event) => Alert.alert("Swappys network error", `HTTP ${event.nativeEvent.statusCode}`)}
          style={styles.webview}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#070B16" },
  container: { flex: 1, backgroundColor: "#070B16" },
  webview: { flex: 1, backgroundColor: "#070B16" },
});
