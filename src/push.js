import { Alert, PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_PREF_KEY = "godelicious_push_enabled";

// Firebase Cloud Messaging for the app. Everything here is wrapped so that if
// @react-native-firebase isn't installed / google-services.json is missing,
// the app simply runs without push instead of crashing.
let messagingModule = null;
try {
  // eslint-disable-next-line global-require
  messagingModule = require("@react-native-firebase/messaging").default;
} catch (e) {
  messagingModule = null;
}

let started = false;

export async function isPushEnabled() {
  try { return (await AsyncStorage.getItem(PUSH_PREF_KEY)) !== "false"; } catch (e) { return true; }
}

// Profile toggle. Turning off removes this phone's token from the server so no more pushes arrive.
export async function setPushEnabled(enabled, registerDevice, unregisterDevice) {
  try { await AsyncStorage.setItem(PUSH_PREF_KEY, enabled ? "true" : "false"); } catch (e) { /* ignore */ }
  if (!messagingModule) return;
  try {
    if (enabled) {
      started = false;
      await registerForPush(registerDevice);
    } else {
      const token = await messagingModule().getToken();
      if (token) await unregisterDevice(token);
      started = false;
    }
  } catch (err) {
    console.warn("Push toggle failed:", err.message);
  }
}

export function pushAvailable() {
  return Boolean(messagingModule);
}

export async function registerForPush(registerDevice) {
  if (!messagingModule || started) return;
  if (!(await isPushEnabled())) return;
  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const res = await PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS");
      if (res !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    const messaging = messagingModule();
    if (Platform.OS === "ios") {
      const status = await messaging.requestPermission();
      if (status !== 1 && status !== 2) return; // not authorized / provisional
    }
    const token = await messaging.getToken();
    if (token) await registerDevice(token, Platform.OS);
    started = true;

    messaging.onTokenRefresh((t) => registerDevice(t, Platform.OS).catch(() => {}));
    // App open: Android doesn't show a banner for foreground pushes, so show an alert.
    messaging.onMessage(async (msg) => {
      const n = msg.notification || {};
      if (n.title || n.body) Alert.alert(n.title || "Godelicious", n.body || "");
    });
  } catch (err) {
    console.warn("Push setup skipped:", err.message);
  }
}
