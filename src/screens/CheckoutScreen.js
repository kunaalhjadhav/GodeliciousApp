import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import RazorpayCheckout from "react-native-razorpay";
import { api, API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import { APP_NAME } from "../brand";
import { GOOGLE_MAPS_API_KEY } from "../config";
import LocationPickerMap from "../components/LocationPickerMap";

const MIN_LEAD_HOURS = 15;

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// Half-hour delivery slots, 8:00 AM – 9:00 PM
function buildTimeSlots() {
  const slots = [];
  for (let mins = 8 * 60; mins <= 21 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}:${m === 0 ? "00" : m} ${period}`);
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

// Next 14 days as selectable buttons — no native calendar module involved.
function buildDateSlots() {
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    let label;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tomorrow";
    else label = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    days.push({ date: d, label });
  }
  return days;
}
const DATE_SLOTS = buildDateSlots();

function combineDateTime(dateObj, timeStr) {
  if (!dateObj || !timeStr) return null;
  const date = new Date(dateObj);
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return date;
  let [, h, m, period] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  date.setHours(h, m, 0, 0);
  return date;
}

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(null);
  const [eventTime, setEventTime] = useState(null);
  const [guestCount, setGuestCount] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Address autocomplete (Google Places)
  const [suggestions, setSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const autocompleteTimer = useRef(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [settings, setSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const discount = couponStatus?.discountAmount || 0;
  const finalTotal = Math.max(0, totalAmount - discount);
  // Informational only, not an added charge — see note in BookingScreen.js
  const GST_RATE = 0.05;
  const gstAmount = finalTotal - finalTotal / (1 + GST_RATE);
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;
  const dateTimeInvalid = !eventDate || !eventTime || combineDateTime(eventDate, eventTime) < new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);

  async function reverseGeocode(lat, lng) {
    if (!GOOGLE_MAPS_API_KEY) return null;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.status === "OK" && data.results?.[0]) return data.results[0].formatted_address;
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
    return null;
  }

  // Google Places Autocomplete — lets the customer type a few keywords
  // ("MG road", "forum mall") and pick from real matching addresses,
  // instead of only relying on GPS or dropping a pin on a map.
  function handleAddressChange(text) {
    setAddress(text);
    setSuggestions([]);
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (!GOOGLE_MAPS_API_KEY || text.trim().length < 3) return;

    autocompleteTimer.current = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.status === "OK") setSuggestions(data.predictions || []);
      } catch (err) {
        console.error("Address search failed:", err);
      } finally {
        setSearchingAddress(false);
      }
    }, 400);
  }

  async function selectSuggestion(prediction) {
    setAddress(prediction.description);
    setSuggestions([]);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) setCoords({ latitude: loc.lat, longitude: loc.lng });
    } catch (err) {
      console.error("Place details failed:", err);
    }
  }

  function useMyLocation() {
    setLocating(true);
    setSuggestions([]);
    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        const addr = await reverseGeocode(latitude, longitude);
        if (addr) setAddress(addr);
        setLocating(false);
      },
      () => {
        Alert.alert("Couldn't get location", "Check that location permission is granted, or enter your address manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const data = await api.validateCoupon(couponCode.trim(), totalAmount);
      setCouponStatus({ discountAmount: data.discountAmount });
    } catch (err) {
      setCouponStatus({ error: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function placeOrder() {
    if (!address || !phone) {
      Alert.alert("Missing info", "Delivery address and phone number are required.");
      return;
    }
    if (!eventDate || !eventTime) {
      Alert.alert("Missing info", "Please select a delivery date and time.");
      return;
    }
    const chosen = combineDateTime(eventDate, eventTime);
    const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
    if (chosen < minAllowed) {
      Alert.alert("Too soon", `Orders must be placed at least ${MIN_LEAD_HOURS} hours before the selected delivery time.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          selectedOptions: line.selectedOptions,
        })),
        deliveryAddress: address,
        contactPhone: phone,
        notes,
        eventDate: eventDate.toISOString(),
        eventTime,
        guestCount: guestCount || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
      };
      const { order } = await api.createOrder(payload);

      if (paymentMethod === "COD") {
        clearCart();
        Alert.alert("Order placed!", "Pay in cash when your order arrives.", [
          { text: "Track order", onPress: () => navigation.replace("OrderDetail", { orderId: order.id }) },
        ]);
        return;
      }

      const rp = await api.createRazorpayOrder(order.id);
      const rpResult = await RazorpayCheckout.open({
        key: rp.keyId,
        amount: rp.amount,
        currency: rp.currency,
        order_id: rp.razorpayOrderId,
        name: APP_NAME,
        description: `Order #${order.id.slice(0, 8)}`,
        prefill: { name: user.name, email: user.email, contact: phone },
        theme: { color: "#1C1B19" },
      });

      await api.verifyRazorpayPayment({
        orderId: order.id,
        razorpayPaymentId: rpResult.razorpay_payment_id,
        razorpaySignature: rpResult.razorpay_signature,
      });
      clearCart();
      Alert.alert("Order placed!", `Payment confirmed. Total: ₹${order.totalAmount.toFixed(0)}`, [
        { text: "Track order", onPress: () => navigation.replace("OrderDetail", { orderId: order.id }) },
      ]);
    } catch (err) {
      const message = err?.description || err?.message || "Something went wrong.";
      Alert.alert("Couldn't complete order", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Checkout</Text>

      {/* Address card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Delivery address</Text>
        <TextInput
          style={[styles.input, { height: 64 }]} value={address} onChangeText={handleAddressChange}
          multiline placeholder="Search by area, landmark, or type full address"
        />
        {searchingAddress && <ActivityIndicator size="small" color={colors.saffron2} style={{ marginTop: 8 }} />}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.slice(0, 5).map((s) => (
              <TouchableOpacity key={s.place_id} style={styles.suggestionRow} onPress={() => selectSuggestion(s)}>
                <Text style={styles.suggestionText} numberOfLines={2}>📍 {s.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.locationActions}>
          <TouchableOpacity onPress={useMyLocation} disabled={locating} style={styles.locationChip}>
            <Text style={styles.locationChipText}>
              {locating ? "Getting location…" : coords ? "✓ Location captured" : "📍 Use current location"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMap((s) => !s)} style={styles.locationChip}>
            <Text style={styles.locationChipText}>🗺️ {showMap ? "Hide map" : "Pick on map"}</Text>
          </TouchableOpacity>
        </View>
        {showMap && (
          <View style={{ marginTop: spacing.sm }}>
            <LocationPickerMap
              initialLat={coords?.latitude} initialLng={coords?.longitude}
              onLocationSelected={async (lat, lng) => {
                setCoords({ latitude: lat, longitude: lng });
                const addr = await reverseGeocode(lat, lng);
                if (addr) setAddress(addr);
              }}
            />
          </View>
        )}
        <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>Contact phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />
      </View>

      {/* Date & time card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Delivery date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATE_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot.date.toISOString()}
              onPress={() => setEventDate(slot.date)}
              style={[styles.pill, eventDate?.toDateString() === slot.date.toDateString() && styles.pillActive]}
            >
              <Text style={[styles.pillText, eventDate?.toDateString() === slot.date.toDateString() && styles.pillTextActive]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {eventDate && (
          <>
            <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>Delivery time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setEventTime(slot)}
                  style={[styles.pill, eventTime === slot && styles.pillActive]}
                >
                  <Text style={[styles.pillText, eventTime === slot && styles.pillTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {eventTime && (() => {
              const chosen = combineDateTime(eventDate, eventTime);
              const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
              if (chosen < minAllowed) {
                return (
                  <Text style={[styles.timeConfirm, { color: colors.chili, backgroundColor: "rgba(193,68,59,0.1)" }]}>
                    Orders must be placed at least {MIN_LEAD_HOURS}h before delivery — pick a later slot
                  </Text>
                );
              }
              return <Text style={styles.timeConfirm}>Delivered at {eventTime}</Text>;
            })()}
          </>
        )}

        <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>Guest count (optional)</Text>
        <TextInput style={styles.input} value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" placeholder="e.g. 20" />
      </View>

      {/* Notes & coupon card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Notes (optional)</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Any special instructions" />

        <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>Coupon code</Text>
        <View style={styles.couponRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
            value={couponCode}
            onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponStatus(null); }}
            placeholder="e.g. WELCOME10"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon} disabled={checkingCoupon || !couponCode.trim()}>
            <Text style={styles.applyBtnText}>{checkingCoupon ? "…" : "Apply"}</Text>
          </TouchableOpacity>
        </View>
        {couponStatus?.error && <Text style={styles.couponError}>{couponStatus.error}</Text>}
        {couponStatus?.discountAmount > 0 && (
          <Text style={styles.couponSuccess}>✓ ₹{couponStatus.discountAmount.toFixed(0)} discount applied</Text>
        )}
      </View>

      {/* Payment card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Payment method</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            onPress={() => setPaymentMethod("ONLINE")}
            style={[styles.paymentBtn, paymentMethod === "ONLINE" && styles.paymentBtnActive]}
          >
            <Text style={[styles.paymentBtnText, paymentMethod === "ONLINE" && styles.paymentBtnTextActive]}>Pay online</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPaymentMethod("COD")}
            disabled={settings && !settings.codEnabled}
            style={[styles.paymentBtn, paymentMethod === "COD" && styles.paymentBtnActive, settings && !settings.codEnabled && { opacity: 0.4 }]}
          >
            <Text style={[styles.paymentBtnText, paymentMethod === "COD" && styles.paymentBtnTextActive]}>Cash on delivery</Text>
          </TouchableOpacity>
        </View>
        {settings && !settings.codEnabled && (
          <Text style={styles.hint}>Cash on delivery isn't available right now.</Text>
        )}
      </View>

      {/* Bill summary card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Bill details</Text>
        {items.map((line) => (
          <View key={line.key} style={styles.summaryRow}>
            <View style={styles.summaryItemRow}>
              {line.menuItem.imageUrl ? (
                <Image source={{ uri: resolveImageUrl(line.menuItem.imageUrl) }} style={styles.summaryThumb} />
              ) : (
                <View style={[styles.summaryThumb, { backgroundColor: colors.line }]} />
              )}
              <Text style={styles.summaryItem}>
                {line.menuItem.soldByWeight ? `${line.quantity}g` : `${line.quantity}×`} {line.menuItem.name}
              </Text>
            </View>
            <Text style={styles.summaryPrice}>₹{(line.unitPrice * line.quantity).toFixed(0)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { color: colors.basil }]}>Discount</Text>
            <Text style={[styles.summaryPrice, { color: colors.basil }]}>−₹{discount.toFixed(0)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>GST (5%, included)</Text>
          <Text style={styles.summaryPrice}>₹{gstAmount.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, { color: colors.basil }]}>Delivery</Text>
          <Text style={[styles.summaryPrice, { color: colors.basil }]}>Free</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toFixed(0)}</Text>
        </View>
      </View>

      {belowMinimum && (
        <Text style={styles.minOrderWarning}>
          Minimum order amount is ₹{settings.minOrderAmount}. Add ₹{(settings.minOrderAmount - finalTotal).toFixed(0)} more to checkout.
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={placeOrder} disabled={submitting || belowMinimum || dateTimeInvalid}>
        <Text style={styles.buttonText}>
          {submitting ? "Processing…" : paymentMethod === "COD" ? "Place order (Cash on delivery)" : "Pay & place order"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.line,
  },
  cardLabel: { fontSize: 11, color: colors.inkFaint, marginBottom: 6, textTransform: "uppercase", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, backgroundColor: colors.white, fontSize: 15, justifyContent: "center", color: colors.ink },
  suggestionsBox: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, marginTop: 6, overflow: "hidden" },
  suggestionRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  suggestionText: { fontSize: 13, color: colors.ink },
  locationActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  locationChip: { backgroundColor: "rgba(232,163,61,0.1)", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  locationChipText: { color: colors.saffron2, fontSize: 12, fontWeight: "500" },
  pill: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    marginRight: 8, backgroundColor: colors.white,
  },
  pillActive: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.12)" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextActive: { color: colors.saffron2, fontWeight: "700" },
  timeConfirm: { fontSize: 12, color: colors.saffron2, backgroundColor: "rgba(232,163,61,0.1)", padding: 8, borderRadius: 8, marginTop: 10, textAlign: "center" },
  couponRow: { flexDirection: "row", alignItems: "center" },
  applyBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  applyBtnText: { fontSize: 13, color: colors.ink },
  couponError: { color: colors.chili, fontSize: 12, marginTop: 6 },
  couponSuccess: { color: colors.basil, fontSize: 12, marginTop: 6 },
  paymentRow: { flexDirection: "row", gap: spacing.sm },
  paymentBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  paymentBtnActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  paymentBtnText: { fontSize: 13, color: colors.ink },
  paymentBtnTextActive: { color: colors.paper },
  hint: { fontSize: 11, color: colors.inkFaint, marginTop: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryItemRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  summaryThumb: { width: 32, height: 32, borderRadius: 6, marginRight: 8 },
  summaryItem: { fontSize: 14, color: colors.ink, flexShrink: 1 },
  summaryPrice: { fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  totalValue: { fontSize: 16, fontWeight: "700", color: colors.ink },
  minOrderWarning: { color: colors.chili, fontSize: 12, marginBottom: spacing.sm },
  button: { backgroundColor: colors.charcoal, borderRadius: 10, padding: 16, alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.xl },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
});
