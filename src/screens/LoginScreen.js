import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function LoginScreen() {
  const { loginWithOtp } = useAuth();

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Image source={require("../assets/logo-full.png")} style={styles.logoFull} />

        <View style={styles.form}>
          <Text style={styles.helper}>New here? Just enter your details — your account is created automatically.</Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={[styles.input, otpSent && styles.inputDisabled]} value={name} onChangeText={setName}
            editable={!otpSent} placeholder="Jane Doe"
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

          <TouchableOpacity
            style={styles.button}
            onPress={otpSent ? verifyCode : requestCode}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Please wait…" : otpSent ? "Verify & continue" : "Send code"}
            </Text>
          </TouchableOpacity>

          {otpSent && (
            <TouchableOpacity onPress={() => { setOtpSent(false); setCode(""); setDevCode(""); }} style={{ marginTop: spacing.md }}>
              <Text style={styles.link}>Use a different number</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.charcoal, padding: spacing.lg },
  logoFull: { width: 220, height: 220, borderRadius: 24, alignSelf: "center", marginBottom: spacing.lg },
  form: {
    backgroundColor: colors.paper, borderRadius: 8, padding: spacing.lg,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 6,
  },
  helper: { fontSize: 12, color: colors.inkFaint, marginBottom: spacing.sm },
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
});
