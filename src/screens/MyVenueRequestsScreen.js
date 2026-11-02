import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

const STATUS_COLORS = { PENDING: colors.saffron2, ACCEPTED: colors.basil, REJECTED: colors.chili, CANCELLED: colors.inkFaint };

export default function MyVenueRequestsScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(null);
  const { user } = useAuth();

  const load = useCallback(
    () => api.myVenueRequests().then((d) => setRows(d.bookings)).catch((e) => console.warn(e.message)),
    []
  );
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }

  async function payAdvance(b) {
    setPaying(b.id);
    try {
      const rp = await api.venueAdvanceCreate(b.id);
      const r = await RazorpayCheckout.open({
        key: rp.keyId, amount: rp.amount, currency: rp.currency, order_id: rp.razorpayOrderId,
        name: "Godelicious", description: `Advance for ${rp.venueName}`,
        prefill: { name: user?.name, email: user?.email, contact: b.contactPhone },
        theme: { color: "#1F7A4D" },
      });
      await api.venueAdvanceVerify(b.id, { razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature });
      Alert.alert("Booking confirmed", "Your advance is paid. The venue is held for your date.");
      load();
    } catch (err) {
      Alert.alert("Payment not completed", err?.description || err?.message || "Please try again.");
    } finally {
      setPaying(null);
    }
  }

  function cancel(b) {
    Alert.alert("Cancel request?", `${b.venue.name} · ${b.eventType}`, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: () => api.cancelVenueRequest(b.id).then(load).catch((e) => Alert.alert("Could not cancel", e.message)) },
    ]);
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={rows}
      keyExtractor={(b) => b.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No venue requests yet.</Text>}
      renderItem={({ item: b }) => (
        <View style={styles.card}>
          <Text style={[styles.status, { color: STATUS_COLORS[b.status] }]}>{b.status}</Text>
          <Text style={styles.name}>{b.venue.name}</Text>
          <Text style={styles.detail}>
            {b.eventType} · {new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} · {b.guestCount} guests
          </Text>
          {b.status === "ACCEPTED" && b.quotedAmount != null && (
            <Text style={styles.quote}>Owner's quote: ₹{Math.round(b.quotedAmount).toLocaleString("en-IN")}{b.venue.contactPhone ? ` · call ${b.venue.contactPhone}` : ""}</Text>
          )}
          {b.status === "ACCEPTED" && b.advancePaid && (
            <Text style={styles.paid}>Advance paid: ₹{Math.round(b.advanceAmount || 0).toLocaleString("en-IN")} · Booking confirmed</Text>
          )}
          {b.status === "ACCEPTED" && !b.advancePaid && !(b.quotedAmount > 0) && (
            <Text style={styles.note}>The owner accepted but hasn't shared a price yet. Please call the venue{b.venue.contactPhone ? ` on ${b.venue.contactPhone}` : ""}.</Text>
          )}
          {b.advanceDue != null && (
            <TouchableOpacity style={[styles.payBtn, paying === b.id && { opacity: 0.6 }]} disabled={paying === b.id} onPress={() => payAdvance(b)}>
              <Text style={styles.payText}>{paying === b.id ? "Please wait…" : `Pay advance ₹${b.advanceDue.toLocaleString("en-IN")} to confirm`}</Text>
            </TouchableOpacity>
          )}
          {!!b.ownerNote && <Text style={styles.note}>Owner: {b.ownerNote}</Text>}
          {b.status === "REJECTED" && (
            <TouchableOpacity onPress={() => navigation.navigate("Venues")}>
              <Text style={{ color: colors.saffron2, fontWeight: "700", marginTop: 8 }}>Find another venue</Text>
            </TouchableOpacity>
          )}
          {(b.status === "PENDING" || (b.status === "ACCEPTED" && !b.advancePaid)) && (
            <TouchableOpacity onPress={() => cancel(b)}><Text style={styles.cancel}>Cancel request</Text></TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  status: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  detail: { fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  quote: { fontSize: 14, color: colors.basil, fontWeight: "700", marginTop: 6 },
  paid: { fontSize: 14, color: colors.basil, fontWeight: "700", marginTop: 6 },
  payBtn: { backgroundColor: colors.basil, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  payText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  note: { fontSize: 12, color: colors.ink, marginTop: 4, fontStyle: "italic" },
  cancel: { color: colors.chili, marginTop: 8, fontWeight: "600" },
});
