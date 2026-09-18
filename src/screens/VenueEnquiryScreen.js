import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function VenueEnquiryScreen({ navigation }) {
  const [venueName, setVenueName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState(""); // simple text date for MVP, e.g. 2026-12-25
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!venueName || !location || !eventDate || !guestCount || !phone) {
      Alert.alert("Missing info", "Venue name, location, event date, guest count and phone are required.");
      return;
    }
    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      Alert.alert("Invalid date", "Please enter the event date as YYYY-MM-DD, e.g. 2026-12-25.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createEnquiry({
        venueName,
        location,
        eventDate: parsedDate.toISOString(),
        guestCount: Number(guestCount),
        budget: budget ? Number(budget) : undefined,
        contactPhone: phone,
        notes,
      });
      Alert.alert(
        "Enquiry submitted",
        "Our team will review your venue enquiry and get back to you shortly.",
        [{ text: "View my enquiries", onPress: () => navigation.replace("MyEnquiries") }]
      );
    } catch (err) {
      Alert.alert("Couldn't submit enquiry", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Enquire for a venue</Text>
      <Text style={styles.subtitle}>
        Planning an event? Tell us about the venue and we'll review it for catering.
      </Text>

      <Text style={styles.label}>Venue name</Text>
      <TextInput style={styles.input} value={venueName} onChangeText={setVenueName} placeholder="e.g. Grand Palace Banquet" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Area, city" />

      <Text style={styles.label}>Event date</Text>
      <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Guest count</Text>
      <TextInput style={styles.input} value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" placeholder="e.g. 150" />

      <Text style={styles.label}>Budget (optional)</Text>
      <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="number-pad" placeholder="₹" />

      <Text style={styles.label}>Contact phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={[styles.input, { height: 70 }]} value={notes} onChangeText={setNotes} multiline placeholder="Anything else we should know" />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit enquiry"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("MyEnquiries")} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={styles.link}>View my past enquiries</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkFaint, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, backgroundColor: colors.white, fontSize: 15, color: colors.ink },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
  link: { color: colors.saffron2, fontSize: 13 },
});
