import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, Linking, StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { colors, spacing, greens } from "../theme";
import GradientView from "../components/GradientView";

export default function LoginScreen() {
  const { loginWithOtp } = useAuth();
  const navigation = useNavigation();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function requestCode() {
    if (!name || !phone) {
      Alert.alert("Missing info", "Please enter your name and phone number.");
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

  const canClose = navigation && navigation.canGoBack && navigation.canGoBack();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064E2B" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <GradientView colors={greens.headerGradient} style={styles.header}>
          {canClose && (
            <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          )}
          <Image source={require("../assets/logo-full.png")} style={styles.logo} />
        </GradientView>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Godelicious</Text>
          <Text style={styles.subtitle}>
            {otpSent ? "Enter the 6-digit code we sent you" : "Please enter your details to login"}
          </Text>

          <TextInput
            style={[styles.input, otpSent && styles.inputDisabled]} value={name} onChangeText={setName}
            editable={!otpSent} placeholder="Your name" placeholderTextColor="#9AA8A0"
          />

          <View style={styles.phoneRow}>
            <View style={styles.cc}><Text style={styles.ccText}>+91</Text></View>
            <TextInput
              style={[styles.input, { flex: 1, marginTop: 0 }, otpSent && styles.inputDisabled]}
              value={phone} onChangeText={setPhone} editable={!otpSent}
              keyboardType="phone-pad" placeholder="Enter mobile number" placeholderTextColor="#9AA8A0"
              autoComplete="tel"
            />
          </View>

          {otpSent && (
            <>
              <TextInput
                style={[styles.input, styles.codeInput]} value={code} onChangeText={setCode}
                keyboardType="number-pad" maxLength={6} placeholder="• • • • • •" placeholderTextColor="#9AA8A0"
                autoComplete="sms-otp" textContentType="oneTimeCode"
              />
              {!!devCode && <Text style={styles.devCode}>Dev mode — your code is {devCode}</Text>}
            </>
          )}

          <TouchableOpacity onPress={otpSent ? verifyCode : requestCode} disabled={submitting} activeOpacity={0.85} style={{ marginTop: spacing.lg }}>
            <GradientView colors={greens.buttonGradient} horizontal style={[styles.button, submitting && { opacity: 0.6 }]}>
              <Text style={styles.buttonText}>
                {submitting ? "Please wait…" : otpSent ? "Verify & continue" : "Get OTP"}
              </Text>
            </GradientView>
          </TouchableOpacity>

          {otpSent && (
            <TouchableOpacity onPress={() => { setOtpSent(false); setCode(""); setDevCode(""); }} style={{ marginTop: spacing.md }}>
              <Text style={styles.link}>Use a different number</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.helper}>New here? Just enter your details — your account is created automatically.</Text>

          <Text style={styles.terms}>
            By proceeding, you agree to our{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL("https://godelicious.in/terms")}>T&Cs</Text>
            {" "}and{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL("https://godelicious.in/privacy")}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { height: 250, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  logo: { width: 130, height: 130, borderRadius: 28 },
  close: {
    position: "absolute", top: 44, right: 18, width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: "#fff", alignItems: "center", justifyContent: "center", zIndex: 2,
  },
  closeX: { color: "#fff", fontSize: 16, fontWeight: "700" },
  card: {
    flex: 1, marginTop: -36, backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1B2B22", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#5C6B63", textAlign: "center", marginTop: 6, marginBottom: spacing.lg },
  phoneRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  cc: {
    height: 52, minWidth: 62, borderRadius: 14, borderWidth: 1, borderColor: "#B9C7BF",
    alignItems: "center", justifyContent: "center", marginRight: 10, backgroundColor: greens.mint,
  },
  ccText: { fontSize: 16, color: "#1B2B22", fontWeight: "600" },
  input: {
    height: 52, borderWidth: 1, borderColor: "#B9C7BF", borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: "#fff", fontSize: 16, color: colors.ink, marginTop: 0,
  },
  inputDisabled: { backgroundColor: "#EEF3F0" },
  codeInput: { marginTop: 12, textAlign: "center", letterSpacing: 6, fontSize: 20 },
  devCode: { fontSize: 12, color: greens.deep, marginTop: spacing.sm, fontFamily: "monospace", textAlign: "center" },
  button: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  link: { color: greens.deep, textAlign: "center", fontSize: 14, textDecorationLine: "underline" },
  helper: { fontSize: 12, color: "#7A8A81", textAlign: "center", marginTop: spacing.lg },
  terms: { fontSize: 12, color: "#7A8A81", textAlign: "center", marginTop: spacing.xl },
  termsLink: { color: "#1B2B22", textDecorationLine: "underline" },
});
