import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as ExpoLinking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { getSwappysHtml } from "./src/SwappysWebApp";

WebBrowser.maybeCompleteAuthSession();

type VirelleConnection = {
  ok: boolean;
  health?: string;
  features?: boolean;
  authenticated?: boolean;
  error?: string;
};

const extra = Constants.expoConfig?.extra ?? {};
const VIRELLE_BASE_URL = String(extra.virelleBaseUrl || "https://virelle.life").replace(/\/$/, "");
const UPGRADE_URL = String(extra.virelleUpgradeUrl || `${VIRELLE_BASE_URL}/register?source=swappys-mobile&product=swappys&intent=creator-upgrade`);
const MOBILE_AUTH_URL = `${VIRELLE_BASE_URL}/mobile-auth/swappys`;
const MOBILE_AUTH_CALLBACK = "swappys://auth";
const TOKEN_KEY = "swappys-virelle-token";

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
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => {
        if (active) setAuthToken(token);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setTokenLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const html = useMemo(() => getSwappysHtml(authToken), [authToken]);

  const sendConnection = useCallback((payload: VirelleConnection) => {
    const fullPayload = { ...payload, baseUrl: VIRELLE_BASE_URL, authenticated: Boolean(authToken) };
    const script = `window.SwappysNative && window.SwappysNative.setVirelleConnection(${JSON.stringify(fullPayload)}); true;`;
    webRef.current?.injectJavaScript(script);
  }, [authToken]);

  const checkVirelleConnection = useCallback(async () => {
    try {
      const healthResponse = await fetch(`${VIRELLE_BASE_URL}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      let healthStatus = `HTTP ${healthResponse.status}`;
      try {
        const healthJson = await healthResponse.json();
        healthStatus = String(healthJson?.status || healthJson?.success || healthStatus);
      } catch {
        // Non-JSON deploy failure is represented by the HTTP status.
      }

      let featuresOk = false;
      try {
        const featuresResponse = await fetch(`${VIRELLE_BASE_URL}/api/mobile/features`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (featuresResponse.ok) {
          const featuresJson = await featuresResponse.json();
          const flags = featuresJson?.flags ?? featuresJson?.features ?? {};
          featuresOk = Boolean(
            featuresJson?.ok !== false
              && flags?.creatorUpgrade
              && flags?.swappysStudio
              && flags?.watermarkControls
              && flags?.byokVideoRequired,
          );
        }
      } catch {
        featuresOk = false;
      }

      sendConnection({
        ok: healthResponse.ok && featuresOk,
        health: featuresOk ? `${healthStatus} · Virelle mobile features online` : `${healthStatus} · mobile features missing`,
        features: featuresOk,
      });
    } catch (error: any) {
      sendConnection({ ok: false, error: error?.message || "Connection check failed" });
    }
  }, [sendConnection]);

  const connectVirelleAccount = useCallback(async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(MOBILE_AUTH_URL, MOBILE_AUTH_CALLBACK);
      if (result.type !== "success" || !result.url) return;
      const parsed = ExpoLinking.parse(result.url);
      const tokenValue = parsed.queryParams?.token;
      const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;
      if (typeof token !== "string" || token.length < 40) {
        throw new Error("Virelle returned an invalid mobile token.");
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      setAuthToken(token);
      Alert.alert("Virelle connected", "Your subscription and BYOK settings are now available to Swappys.");
    } catch (error: any) {
      Alert.alert("Could not connect Virelle", error?.message || "Secure sign-in did not complete.");
    }
  }, []);

  const disconnectVirelleAccount = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    Alert.alert("Virelle disconnected", "Swappys will use anonymous preview access until you reconnect.");
  }, []);

  const openUrl = useCallback(async (url: string) => {
    if (url.includes("/login") || url.includes("/mobile-auth/swappys")) {
      await connectVirelleAccount();
      return;
    }
    const resolved = url.includes("/register") ? UPGRADE_URL : url;
    if (!isAllowedVirelleUrl(resolved)) {
      Alert.alert("Blocked link", "Swappys prevented an untrusted external link from opening.");
      return;
    }
    try {
      const canOpen = await ExpoLinking.canOpenURL(resolved);
      if (!canOpen) throw new Error("Cannot open URL");
      await ExpoLinking.openURL(resolved);
    } catch (error: any) {
      Alert.alert("Could not open Virelle Studios", error?.message || resolved);
    }
  }, [connectVirelleAccount]);

  const saveResult = useCallback(async (url: string) => {
    if (!isSecureHttpsUrl(url)) {
      Alert.alert("Cannot save result", "Swappys blocked an insecure or malformed result URL.");
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        await ExpoLinking.openURL(url);
        Alert.alert("Photo library access needed", "Allow photo access in Settings so Swappys can save results directly to your library.");
        return;
      }
      const tempUri = `${FileSystem.cacheDirectory}swappys_result_${Date.now()}.jpg`;
      const download = await FileSystem.downloadAsync(url, tempUri);
      if (download.status !== 200) throw new Error(`Download failed (HTTP ${download.status})`);
      const asset = await MediaLibrary.createAssetAsync(download.uri);
      await MediaLibrary.createAlbumAsync("Swappys", asset, false);
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      Alert.alert("Saved to Photos", "Your Swappys result was saved to your photo library.");
    } catch (error: any) {
      try { await ExpoLinking.openURL(url); } catch {}
      Alert.alert("Could not save to Photos", error?.message || "Open the image to save it manually.");
    }
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "openUrl" && typeof payload.url === "string") void openUrl(payload.url);
      if (payload?.type === "connectAccount") void connectVirelleAccount();
      if (payload?.type === "disconnectAccount") void disconnectVirelleAccount();
      if (payload?.type === "saveResult" && typeof payload.url === "string") void saveResult(payload.url);
      if (payload?.type === "checkVirelleConnection" || payload?.type === "appReady") void checkVirelleConnection();
    } catch {
      // Malformed WebView messages are ignored.
    }
  }, [checkVirelleConnection, connectVirelleAccount, disconnectVirelleAccount, openUrl, saveResult]);

  if (!tokenLoaded) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WebView
          key={authToken ? "authenticated" : "anonymous"}
          ref={webRef}
          source={{ html, baseUrl: VIRELLE_BASE_URL }}
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
