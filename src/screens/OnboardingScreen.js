import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

const STEPS = [
  { title: "Browse the menu", body: "Explore dishes by category, or check out combo meals.", emoji: "🍽️" },
  { title: "Add to your cart", body: "Tap Add on anything you like. Combos let you customize your choices first.", emoji: "🛒" },
  { title: "Checkout your way", body: "Apply a coupon if you have one, then pay online or choose Cash on Delivery.", emoji: "💳" },
  { title: "Track your order", body: "Watch your order move from confirmed to out for delivery, right from the Orders tab.", emoji: "📦" },
];

export default function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone();
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.nextBtn}>
            <Text style={styles.nextText}>{step < STEPS.length - 1 ? "Next" : "Get started"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,27,25,0.85)", justifyContent: "center", padding: spacing.lg, zIndex: 100 },
  card: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.xl, alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 6, textAlign: "center" },
  body: { fontSize: 14, color: colors.inkFaint, textAlign: "center", marginBottom: spacing.lg },
  dots: { flexDirection: "row", marginBottom: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line, marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.saffron2 },
  actions: { flexDirection: "row", width: "100%" },
  skipBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 12, alignItems: "center", marginRight: spacing.sm },
  skipText: { color: colors.inkFaint, fontSize: 14 },
  nextBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 4, padding: 12, alignItems: "center" },
  nextText: { color: colors.paper, fontSize: 14, fontWeight: "600" },
});
