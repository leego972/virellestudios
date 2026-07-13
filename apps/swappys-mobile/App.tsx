import React, { useCallback, useRef } from "react";
import { Alert, Linking, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as MediaLibrary from "expo-media-library";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { SWAPPYS_HTML } from "./src/SwappysWebApp";

type VirelleConnection = {
  ok: boolean;
  health?: string;
  features?: boolean;
  error?: string;
};

const extra = Constants.expoConfig?.extra ?? {};
const VIRELLE_BASE_URL = String(extra.virelleBaseUrl || "https://virelle.life").replace(/\/$/, "");
const UPGRADE_URL = String(extra.virelleUpgradeUrl || `${VIRELLE_BASE_URL}/register?source=swappys-mobile&product=swappys&intent=creator-upgrade`);
const LOGIN_URL = String(extra.virelleLoginUrl || `${VIRELLE_BASE_URL}/login?source=swappys-mobile`);

function isSecureHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedVirelleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const base = new URL(VIRELLE_BASE_URL);
    return url.protocol === "https:" && (url.hostname === base.hostname || url.hostname.endsWith(`.${base.hostname}`));
  } catch {
    return false;
  }
}

export default function App() {
  const webRef = useRef<WebView>(null);

  const sendConnection = useCallback((payload: VirelleConnection) => {
    const fullPayload = { ...payload, baseUrl: VIRELLE_BASE_URL };
    const script = `window.SwappysNative && window.SwappysNative.setVirelleConnection(${JSON.stringify(fullPayload)}); true;`;
    webRef.current?.injectJavaScript(script);
  }, []);

  const checkVirelleConnection = useCallback(async () => {
    try {
      const healthResponse = await fetch(`${VIRELLE_BASE_URL}/api/health`, { method: "GET", headers: { Accept: "application/json" } });
      let healthStatus = `HTTP ${healthResponse.status}`;
      try {
        const healthJson = await healthResponse.json();
        healthStatus = String(healthJson?.status || healthJson?.success || healthStatus);
      } catch {
        // Non-JSON deploy failure is represented by the HTTP status.
      }

      let featuresOk = false;
      try {
        const featuresResponse = await fetch(`${VIRELLE_BASE_URL}/api/mobile/features`, { method: "GET", headers: { Accept: "application/json" } });
        if (featuresResponse.ok) {
          const featuresJson = await featuresResponse.json();
          const flags = featuresJson?.flags ?? featuresJson?.features ?? {};
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
        health: featuresOk ? `${healthStatus} · Virelle mobile/BYOK features online` : `${healthStatus} · mobile/BYOK features missing`,
        features: featuresOk,
      });
    } catch (error: any) {
      sendConnection({ ok: false, error: error?.message || "Connection check failed" });
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
    if (!isSecureHttpsUrl(url)) {
      Alert.alert("Cannot save result", "Swappys blocked an insecure or malformed result URL.");
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        // Permission denied — fall back to opening in browser so user can long-press save
        await Linking.openURL(url);
        Alert.alert("Photo library access needed", "Allow photo access in Settings so Swappys can save results directly to your library.");
        return;
      }
      const asset = await MediaLibrary.createAssetAsync(url);
      await MediaLibrary.createAlbumAsync("Swappys", asset, false);
      Alert.alert("Saved to Photos", "Your Swappys result was saved to your photo library.");
    } catch (error: any) {
      // Fall back gracefully to browser open if MediaLibrary fails
      try { await Linking.openURL(url); } catch {}
      Alert.alert("Could not save to Photos", error?.message || "Open the image to save it manually.");
    }
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload?.type === "openUrl" && typeof payload.url === "string") void openUrl(payload.url);
        if (payload?.type === "saveResult" && typeof payload.url === "string") void saveResult(payload.url);
        if (payload?.type === "checkVirelleConnection" || payload?.type === "appReady") void checkVirelleConnection();
      } catch {
        // Malformed WebView messages are ignored.
      }
    },
    [checkVirelleConnection, openUrl, saveResult],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WebView
          ref={webRef}
          source={{ html: SWAPPYS_HTML, baseUrl: VIRELLE_BASE_URL }}
          originWhitelist={["https://*", "about:blank"]}
          javaScriptEnabled
          domStorageEnabled={false}
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
