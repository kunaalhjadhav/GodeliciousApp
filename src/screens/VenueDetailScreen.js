import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { api, API_URL } from "../api/client";
import { colors, spacing } from "../theme";

const UNIT = { EVENT: "per event", DAY: "per day", HOUR: "per hour", PLATE: "per plate" };
const KIND = { HALL: "Venue", FOOD: "Food", SERVICE: "Services" };
const TIMES = ["Full day", "Morning (8 AM - 2 PM)", "Evening (5 PM - 11 PM)"];
const TIME_RANGE = { "Morning (8 AM - 2 PM)": ["08:00", "14:00"], "Evening (5 PM - 11 PM)": ["17:00", "23:00"] };

const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function buildDates() {
  const out = [];
  const base = new Date();
  for (let i = 1; i <= 90; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({ key: toKey(d), label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) });
  }
  return out;
}
const DATES = buildDates();

function Pill({ label, active, disabled, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled}
      style={[styles.pill, active && styles.pillActive, disabled && { opacity: 0.35 }]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function VenueDetailScreen({ route, navigation }) {
  const { venueId } = route.params;
  const [venue, setVenue] = useState(null);
  const [unavailable, setUnavailable] = useState([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("Full day");
  const [guests, setGuests] = useState("");
  const [food, setFood] = useState("");
  const [services, setServices] = useState([]);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.getVenue(venueId).then((d) => { setVenue(d.venue); setUnavailable(d.unavailable); }).catch((e) => setError(e.message));
  }, [venueId]);

  if (!venue) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.saffron2} />}
      </View>
    );
  }

  const groups = {};
  venue.tariffs.forEach((t) => { (groups[t.kind] = groups[t.kind] || []).push(t); });
  const imgUri = venue.imageUrl ? (venue.imageUrl.startsWith("http") ? venue.imageUrl : `${API_URL}${venue.imageUrl}`) : null;

  async function submit() {
    setError("");
    if (!eventType || !date || !guests || !phone) {
      setError("Please choose the event type, date, guests and add your phone number.");
      return;
    }
    const range = TIME_RANGE[timeSlot];
    setSending(true);
    try {
      await api.requestVenue(venueId, {
        eventType, eventDate: date, startTime: range ? range[0] : "", endTime: range ? range[1] : "",
        guestCount: Number(guests), foodOption: food, services, contactPhone: phone, notes,
      });
      Alert.alert("Request sent", "The venue owner will accept or decline soon. You'll get a notification.", [
        { text: "View my requests", onPress: () => navigation.replace("MyVenueRequests") },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {imgUri ? <Image source={{ uri: imgUri }} style={styles.hero} resizeMode="cover" /> : null}
      <View style={styles.section}>
        <Text style={styles.title}>{venue.name}</Text>
        <Text style={styles.detail}>{venue.address}{venue.city ? `, ${venue.city}` : ""}</Text>
        <Text style={styles.detail}>Up to {venue.capacity} guests</Text>
        {!!venue.description && <Text style={styles.desc}>{venue.description}</Text>}
        {venue.foodOptions.length > 0 && <Text style={styles.detail}>Food: {venue.foodOptions.join(", ")}</Text>}
        {venue.services.length > 0 && <Text style={styles.detail}>Services: {venue.services.join(", ")}</Text>}
      </View>

      {Object.keys(groups).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Tariff</Text>
          {Object.entries(groups).map(([kind, list]) => (
            <View key={kind} style={styles.tariffBox}>
              <Text style={styles.tariffKind}>{KIND[kind]}</Text>
              {list.map((t) => (
                <View key={t.id} style={styles.tariffRow}>
                  <Text style={styles.tariffLabel}>{t.label}{t.eventType !== "Any" ? ` · ${t.eventType}` : ""}</Text>
                  <Text style={styles.tariffPrice}>₹{t.price.toLocaleString("en-IN")} {UNIT[t.unit]}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.heading}>Request this venue</Text>

        <Text style={styles.label}>Type of event</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {venue.eventTypes.map((t) => <Pill key={t} label={t} active={eventType === t} onPress={() => setEventType(t)} />)}
        </ScrollView>

        <Text style={styles.label}>Date (greyed out dates are taken)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATES.map((d) => (
            <Pill key={d.key} label={d.label} active={date === d.key} disabled={unavailable.includes(d.key)} onPress={() => setDate(d.key)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TIMES.map((t) => <Pill key={t} label={t} active={timeSlot === t} onPress={() => setTimeSlot(t)} />)}
        </ScrollView>

        <Text style={styles.label}>Number of guests</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={guests} onChangeText={setGuests} placeholder={`Up to ${venue.capacity}`} placeholderTextColor={colors.inkFaint} />

        {venue.foodOptions.length > 0 && (
          <>
            <Text style={styles.label}>Food preference</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {venue.foodOptions.map((t) => <Pill key={t} label={t} active={food === t} onPress={() => setFood(food === t ? "" : t)} />)}
            </ScrollView>
          </>
        )}

        {venue.services.length > 0 && (
          <>
            <Text style={styles.label}>Extra services</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {venue.services.map((s) => (
                <Pill
                  key={s} label={s} active={services.includes(s)}
                  onPress={() => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s])}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Your phone number</Text>
        <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="10-digit mobile" placeholderTextColor={colors.inkFaint} />
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput style={[styles.input, { height: 70 }]} multiline value={notes} onChangeText={setNotes} placeholder="Anything the owner should know" placeholderTextColor={colors.inkFaint} />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.btn, sending && { opacity: 0.6 }]} onPress={submit} disabled={sending}>
          <Text style={styles.btnText}>{sending ? "Sending…" : "Send request"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  hero: { width: "100%", height: 220 },
  section: { padding: spacing.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  detail: { fontSize: 13, color: colors.inkFaint, marginTop: 3 },
  desc: { fontSize: 14, color: colors.ink, marginTop: 8 },
  heading: { fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  tariffBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 8, marginBottom: spacing.sm },
  tariffKind: { fontSize: 11, fontWeight: "700", color: colors.inkFaint, textTransform: "uppercase", padding: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  tariffRow: { flexDirection: "row", justifyContent: "space-between", padding: 10 },
  tariffLabel: { color: colors.ink, flex: 1, paddingRight: 8 },
  tariffPrice: { color: colors.ink, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.inkFaint, textTransform: "uppercase", marginTop: spacing.md, marginBottom: 6 },
  pill: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 6, backgroundColor: colors.white },
  pillActive: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.12)" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextActive: { color: colors.saffron2, fontWeight: "700" },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontSize: 15 },
  error: { color: colors.chili, marginTop: spacing.sm },
  btn: { backgroundColor: colors.charcoal, borderRadius: 10, padding: 15, alignItems: "center", marginTop: spacing.md },
  btnText: { color: colors.paper, fontWeight: "700", fontSize: 16 },
});
