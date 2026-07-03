import React, { useCallback, useRef } from "react";
import { Alert, Linking, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
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

export default function App() {
  const webRef = useRef<WebView>(null);

  const sendConnection = useCallback((payload: VirelleConnection) => {
    const script = `window.SwappysNative && window.SwappysNative.setVirelleConnection(${JSON.stringify(payload)}); true;`;
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
        // health endpoint may return non-JSON during failed deploys
      }

      let featuresOk = false;
      try {
        const featuresResponse = await fetch(`${VIRELLE_BASE_URL}/api/mobile/features`, { method: "GET", headers: { Accept: "application/json" } });
        if (featuresResponse.ok) {
          const featuresJson = await featuresResponse.json();
          featuresOk = Boolean(
            featuresJson?.ok &&
              featuresJson?.features?.creatorUpgrade &&
              featuresJson?.features?.swappysStudio &&
              featuresJson?.features?.watermarkControls &&
              featuresJson?.features?.byokVideoRequired,
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
    try {
      const canOpen = await Linking.canOpenURL(resolved);
      if (!canOpen) throw new Error("Cannot open URL");
      await Linking.openURL(resolved);
    } catch (error: any) {
      Alert.alert("Could not open Virelle Studios", error?.message || resolved);
    }
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload?.type === "openUrl" && typeof payload.url === "string") void openUrl(payload.url);
        if (payload?.type === "checkVirelleConnection" || payload?.type === "appReady") void checkVirelleConnection();
      } catch {
        // ignore malformed WebView messages
      }
    },
    [checkVirelleConnection, openUrl],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WebView
          ref={webRef}
          source={{ html: SWAPPYS_HTML, baseUrl: VIRELLE_BASE_URL }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onMessage={onMessage}
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
