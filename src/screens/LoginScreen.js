import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { colors, spacing } from "../theme";
import { APP_NAME, APP_TAGLINE } from "../brand";

export default function LoginScreen({ navigation }) {
  const { login, loginWithOtp } = useAuth();
  const [mode, setMode] = useState("password"); // "password" | "otp"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert("Couldn't sign in", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestCode() {
    if (!phone) {
      Alert.alert("Missing info", "Please enter your phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.requestOtp(phone);
      setOtpSent(true);
      if (data.devCode) setDevCode(data.devCode);
    } catch (err) {
      Alert.alert("Couldn't send code", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!code) {
      Alert.alert("Missing info", "Please enter the code.");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithOtp(phone, code, name);
    } catch (err) {
      Alert.alert("Couldn't verify code", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>{APP_TAGLINE}</Text>

        <View style={styles.form}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              onPress={() => setMode("password")}
              style={[styles.modeBtn, mode === "password" && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === "password" && styles.modeBtnTextActive]}>Email & password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode("otp")}
              style={[styles.modeBtn, mode === "otp" && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === "otp" && styles.modeBtnTextActive]}>Phone OTP</Text>
            </TouchableOpacity>
          </View>

          {mode === "password" ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input} value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input} value={password} onChangeText={setPassword}
                secureTextEntry placeholder="••••••••"
              />
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
                <Text style={styles.buttonText}>{submitting ? "Signing in…" : "Sign in"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: spacing.md }}>
                <Text style={styles.link}>New here? Create an account</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>seed login: customer@godelicious.com / Customer@123</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={[styles.input, otpSent && styles.inputDisabled]} value={phone} onChangeText={setPhone}
                editable={!otpSent} keyboardType="phone-pad" placeholder="9876543210"
              />

              {otpSent && (
                <>
                  <Text style={styles.label}>Enter the 6-digit code</Text>
                  <TextInput
                    style={styles.input} value={code} onChangeText={setCode}
                    keyboardType="number-pad" maxLength={6} placeholder="123456"
                  />
                  <Text style={styles.label}>Your name (first time only)</Text>
                  <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" />
                  {!!devCode && (
                    <Text style={styles.devCode}>Dev mode — your code is {devCode}</Text>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={otpSent ? verifyCode : requestCode}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Please wait…" : otpSent ? "Verify & sign in" : "Send code"}
                </Text>
              </TouchableOpacity>

              {otpSent && (
                <TouchableOpacity onPress={() => { setOtpSent(false); setCode(""); setDevCode(""); }} style={{ marginTop: spacing.md }}>
                  <Text style={styles.link}>Use a different phone number</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.charcoal, padding: spacing.lg },
  logo: { width: 64, height: 64, borderRadius: 14, alignSelf: "center", marginBottom: spacing.sm },
  brand: { fontSize: 32, fontWeight: "700", color: colors.paper, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: spacing.xl },
  form: {
    backgroundColor: colors.paper, borderRadius: 8, padding: spacing.lg,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 6,
  },
  modeToggle: { flexDirection: "row", marginBottom: spacing.md },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.line, alignItems: "center", marginHorizontal: 2 },
  modeBtnActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  modeBtnText: { fontSize: 12, color: colors.ink },
  modeBtnTextActive: { color: colors.paper },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10,
    backgroundColor: colors.white, fontSize: 15, color: colors.ink,
  },
  inputDisabled: { backgroundColor: colors.line },
  devCode: { fontSize: 12, color: colors.saffron2, marginTop: spacing.sm, fontFamily: "monospace" },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
  link: { color: colors.saffron2, textAlign: "center", fontSize: 14 },
  hint: { fontSize: 11, color: colors.inkFaint, textAlign: "center", marginTop: spacing.md },
});
