import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// "Continue with Google" and "Continue with Apple". Shown only when Google/Apple sign-in is
// switched on (Firebase set up on the server). Apple's button follows Apple's black style.
export default function SocialButtons({ dark = false }) {
  const { loginWithSocial } = useAuth();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.firebaseStatus().then((d) => setOn(Boolean(d.enabled))).catch(() => {});
  }, []);

  if (!on) return null;

  async function go(provider) {
    setBusy(true);
    try { await loginWithSocial(provider); }
    catch (err) { Alert.alert("Couldn't sign in", err.message); }
    finally { setBusy(false); }
  }

  const apple = (
    <TouchableOpacity key="apple" style={[styles.btn, styles.apple]} onPress={() => go("apple")} disabled={busy} accessibilityLabel="Continue with Apple">
      <Text style={styles.appleText}>{Platform.OS === "ios" ? "  " : ""}Continue with Apple</Text>
    </TouchableOpacity>
  );
  const google = (
    <TouchableOpacity key="google" style={[styles.btn, styles.google]} onPress={() => go("google")} disabled={busy} accessibilityLabel="Continue with Google">
      <Text style={styles.gLogo}>
        <Text style={{ color: "#4285F4" }}>G</Text>
      </Text>
      <Text style={styles.googleText}>Continue with Google</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, dark && styles.lineDark]} />
        <Text style={[styles.or, dark && styles.orDark]}>or</Text>
        <View style={[styles.line, dark && styles.lineDark]} />
      </View>
      {/* Apple first on iPhone, Google first on Android */}
      {Platform.OS === "ios" ? [apple, google] : [google, apple]}
      {busy && <Text style={[styles.hint, dark && styles.orDark]}>Finish signing in on the page that opened, then come back here.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  line: { flex: 1, height: 1, backgroundColor: "#DDE5E0" },
  lineDark: { backgroundColor: "rgba(255,255,255,0.35)" },
  or: { marginHorizontal: 10, color: "#7A8A81", fontSize: 13 },
  orDark: { color: "rgba(255,255,255,0.85)" },
  btn: { height: 48, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  google: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DADCE0" },
  gLogo: { fontSize: 18, fontWeight: "800", marginRight: 10 },
  googleText: { color: "#1F1F1F", fontSize: 15, fontWeight: "600" },
  apple: { backgroundColor: "#000000" },
  appleText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 12, color: "#7A8A81", textAlign: "center", marginTop: 2 },
});
