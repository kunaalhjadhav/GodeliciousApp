import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert("Missing info", "Name, email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password, phone);
    } catch (err) {
      Alert.alert("Couldn't create account", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input} value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />

      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Creating…" : "Create account"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.paper, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: spacing.lg, textAlign: "center" },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, backgroundColor: colors.white, fontSize: 15, color: colors.ink },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
  link: { color: colors.saffron2, textAlign: "center", fontSize: 14 },
});
