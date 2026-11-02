import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { api } from "../api/client";

// Sign in with email and password (no SMS needed).
export default function EmailLoginScreen({ navigation }) {
  const { login, loginWithSocial } = useAuth();
  const [socialOn, setSocialOn] = useState(false);
  useEffect(() => { api.firebaseStatus().then((d) => setSocialOn(Boolean(d.enabled))).catch(() => {}); }, []);

  async function handleSocial() {
    setSubmitting(true);
    try { await loginWithSocial(); } catch (err) { Alert.alert("Couldn't sign in", err.message); } finally { setSubmitting(false); }
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert("Couldn't sign in", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in with email</Text>
      <Text style={styles.sub}>Use the email and password you registered with.</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={[styles.button, submitting && { opacity: 0.6 }]} onPress={handleLogin} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Please wait…" : "Sign in"}</Text>
      </TouchableOpacity>
      {socialOn && (
        <>
          <TouchableOpacity style={styles.google} onPress={handleSocial} disabled={submitting}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.apple} onPress={handleSocial} disabled={submitting}>
            <Text style={styles.appleText}>Continue with Apple</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Opens your browser to sign in, then brings you back here.</Text>
        </>
      )}
      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: spacing.lg }}>
        <Text style={styles.link}>New here? Create an account</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
        <Text style={styles.link}>Back to phone sign-in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#FFFFFF", padding: spacing.xl, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#1B2B22", marginBottom: 6 },
  sub: { fontSize: 14, color: "#7A8A81", marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: "#DDE5E0", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: spacing.md },
  button: { backgroundColor: "#1F7A4D", borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  google: { borderWidth: 1, borderColor: "#DDE5E0", borderRadius: 12, padding: 14, alignItems: "center", marginTop: spacing.md },
  googleText: { color: "#1B2B22", fontSize: 15, fontWeight: "600" },
  apple: { backgroundColor: "#000000", borderRadius: 12, padding: 14, alignItems: "center", marginTop: spacing.sm },
  appleText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 12, color: "#7A8A81", textAlign: "center", marginTop: spacing.sm },
  link: { color: "#1F7A4D", textAlign: "center", fontSize: 14, textDecorationLine: "underline" },
});
