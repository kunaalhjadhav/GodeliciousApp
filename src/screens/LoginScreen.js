import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function LoginScreen({ navigation, route }) {
  const { loginWithOtp } = useAuth();

  const [step, setStep] = useState("phone"); // phone | otp
  const [phone, setPhone] = useState(route?.params?.phone || "");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Existing number → send OTP here. New number → hand off to the Register
  // screen with the phone prefilled.
  async function continueWithPhone() {
    if (!phone) {
      Alert.alert("Missing info", "Please enter your mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      const { exists } = await api.checkPhone(phone);
      if (!exists) {
        navigation.navigate("Register", { phone });
        return;
      }
      const data = await api.requestOtp(phone);
      setStep("otp");
      setDevCode(data.devCode || "");
    } catch (err) {
      Alert.alert("Couldn't continue", err.message);
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
      await loginWithOtp(phone, code);
    } catch (err) {
      Alert.alert("Couldn't verify code", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetToPhone() {
    setStep("phone");
    setCode("");
    setDevCode("");
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Image source={require("../assets/logo-full.png")} style={styles.logoFull} />

        <View style={styles.form}>
          {step === "phone" && (
            <>
              <Text style={styles.helper}>Enter your mobile number to log in.</Text>
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={styles.input} value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" placeholder="9876543210" autoComplete="tel"
              />
              <TouchableOpacity style={styles.button} onPress={continueWithPhone} disabled={submitting}>
                <Text style={styles.buttonText}>{submitting ? "Please wait…" : "Login"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Register", { phone })} style={{ marginTop: spacing.md }}>
                <Text style={styles.link}>New here? Create an account</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={styles.helper}>Enter the 6-digit code sent to {phone}.</Text>
              <Text style={styles.label}>Enter the 6-digit code</Text>
              <TextInput
                style={styles.input} value={code} onChangeText={setCode}
                keyboardType="number-pad" maxLength={6} placeholder="123456"
                autoComplete="sms-otp" textContentType="oneTimeCode"
              />
              {!!devCode && (
                <Text style={styles.devCode}>Dev mode — your code is {devCode}</Text>
              )}
              <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={submitting}>
                <Text style={styles.buttonText}>{submitting ? "Please wait…" : "Verify & continue"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetToPhone} style={{ marginTop: spacing.md }}>
                <Text style={styles.link}>Use a different number</Text>
              </TouchableOpacity>
            </>
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
  devCode: { fontSize: 12, color: colors.saffron2, marginTop: spacing.sm, fontFamily: "monospace" },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
  link: { color: colors.saffron2, textAlign: "center", fontSize: 14 },
});
