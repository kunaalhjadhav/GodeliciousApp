import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function RegisterScreen({ navigation, route }) {
  const { loginWithOtp } = useAuth();
  const [phone, setPhone] = useState(route?.params?.phone || "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function sendCode() {
    if (!name.trim() || !phone) {
      Alert.alert("Missing info", "Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const { exists } = await api.checkPhone(phone);
      if (exists) {
        Alert.alert("Already registered", "This number already has an account. Please sign in instead.");
        return;
      }
      // The account is created by the backend when the OTP is verified,
      // using the name sent along with the code.
      const data = await api.requestOtp(phone);
      setOtpSent(true);
      setDevCode(data.devCode || "");
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
      await loginWithOtp(phone, code, name.trim());
    } catch (err) {
      Alert.alert("Couldn't create account", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.helper}>Enter your name and mobile number. We'll send a verification code to finish signup.</Text>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={[styles.input, otpSent && styles.inputDisabled]} value={name} onChangeText={setName}
          editable={!otpSent} placeholder="Jane Doe" autoComplete="name"
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={[styles.input, otpSent && styles.inputDisabled]} value={phone} onChangeText={setPhone}
          editable={!otpSent} keyboardType="phone-pad" placeholder="9876543210" autoComplete="tel"
        />

        {otpSent && (
          <>
            <Text style={styles.label}>Enter the 6-digit code</Text>
            <TextInput
              style={styles.input} value={code} onChangeText={setCode}
              keyboardType="number-pad" maxLength={6} placeholder="123456"
              autoComplete="sms-otp" textContentType="oneTimeCode"
            />
            {!!devCode && (
              <Text style={styles.devCode}>Dev mode — your code is {devCode}</Text>
            )}
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={otpSent ? verifyCode : sendCode} disabled={submitting}>
          <Text style={styles.buttonText}>
            {submitting ? "Please wait…" : otpSent ? "Verify & continue" : "Register"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm, textAlign: "center" },
  helper: { fontSize: 12, color: colors.inkFaint, marginBottom: spacing.md, textAlign: "center" },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, backgroundColor: colors.white, fontSize: 15, color: colors.ink },
  inputDisabled: { backgroundColor: colors.line },
  devCode: { fontSize: 12, color: colors.saffron2, marginTop: spacing.sm, fontFamily: "monospace" },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
  link: { color: colors.saffron2, textAlign: "center", fontSize: 14 },
});
