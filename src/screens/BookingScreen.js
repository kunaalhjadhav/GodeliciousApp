import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, Switch,
} from "react-native";
import Geolocation from "@react-native-community/geolocation";
import RazorpayCheckout from "react-native-razorpay";
import { api, API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { GOOGLE_MAPS_API_KEY } from "../config";
import LocationPickerMap from "../components/LocationPickerMap";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// Half-hour delivery/event slots, 10:00 AM – 9:00 PM — matches how catering
// bookings are actually scheduled (fixed windows), rather than a free-form
// time picker that doesn't map to real kitchen capacity.
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

// Next 14 days as selectable buttons — replaces the native calendar picker
// entirely, since it was reliably crashing on this device. No native module
// involved at all here, just plain Date arithmetic and buttons.
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
const MIN_LEAD_HOURS = 15;

// Combines the Date object (date-only) from the picker with a "H:MM AM/PM"
// slot string into one real Date, for the 15-hour lead-time check.
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

export default function BookingScreen({ route, navigation }) {
  const { orderTypeId } = route.params;
  const { user } = useAuth();

  const [orderType, setOrderType] = useState(null);
  const [settings, setSettings] = useState(null);
  const [allAddons, setAllAddons] = useState([]);

  const [eventDate, setEventDate] = useState(null);
  const [eventTime, setEventTime] = useState(null);
  const [guestCount, setGuestCount] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [needsStaff, setNeedsStaff] = useState(false);
  const [staffCount, setStaffCount] = useState("1");
  const [selectedAddons, setSelectedAddons] = useState({});

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listOrderTypes().then((d) => {
      setOrderType(d.orderTypes.find((ot) => ot.id === orderTypeId) || null);
    }).catch(() => {});
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
    api.listAddons().then((d) => setAllAddons(d.addons)).catch(() => {});
  }, [orderTypeId]);

  function toggleAddon(addonId) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addonId]) delete next[addonId];
      else next[addonId] = 1;
      return next;
    });
  }

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

  function useMyLocation() {
    setLocating(true);
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

  const staffCost = needsStaff ? (Number(staffCount) || 0) * (settings?.staffPricePerPerson || 0) : 0;
  const addonsCost = Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
    const addon = allAddons.find((a) => a.id === addonId);
    return sum + (addon ? addon.price * qty : 0);
  }, 0);
  const subtotal = staffCost + addonsCost;
  const discount = couponStatus?.discountAmount || 0;
  const finalTotal = Math.max(0, subtotal - discount);
  // Informational only — extracts the GST portion assumed already included in
  // the price, rather than adding a new charge. See note to the developer:
  // confirm with your accountant whether GST should be added on top instead,
  // since that changes the actual amount charged and has real tax-registration
  // implications — this was deliberately NOT wired into backend pricing.
  const GST_RATE = 0.05;
  const gstAmount = finalTotal - finalTotal / (1 + GST_RATE);
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;
  const dateTimeInvalid = !eventDate || !eventTime || combineDateTime(eventDate, eventTime) < new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const data = await api.validateCoupon(couponCode.trim(), subtotal);
      setCouponStatus({ discountAmount: data.discountAmount });
    } catch (err) {
      setCouponStatus({ error: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function placeBooking() {
    if (!eventDate || !eventTime || !guestCount || !address || !phone) {
      Alert.alert("Missing info", "Please fill in date, time, guest count, address, and phone.");
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
        orderTypeId,
        eventDate: eventDate.toISOString(),
        eventTime,
        guestCount,
        deliveryAddress: address,
        contactPhone: phone,
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        needsStaff,
        staffCount: needsStaff ? Number(staffCount) : undefined,
        addons: Object.entries(selectedAddons).map(([addonId, quantity]) => ({ addonId, quantity })),
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
      };
      const { order } = await api.createOrder(payload);

      if (paymentMethod === "COD") {
        Alert.alert("Booking confirmed!", "Pay in cash when your booking is fulfilled.", [
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
        name: "Godelicious",
        description: `${orderType?.name || "Booking"} — Order #${order.id.slice(0, 8)}`,
        prefill: { name: user.name, email: user.email, contact: phone },
        theme: { color: "#1C1B19" },
      });

      await api.verifyRazorpayPayment({
        orderId: order.id,
        razorpayPaymentId: rpResult.razorpay_payment_id,
        razorpaySignature: rpResult.razorpay_signature,
      });
      Alert.alert("Booking confirmed!", `Payment received. Total: ₹${order.totalAmount.toFixed(0)}`, [
        { text: "Track order", onPress: () => navigation.replace("OrderDetail", { orderId: order.id }) },
      ]);
    } catch (err) {
      const message = err?.description || err?.message || "Something went wrong.";
      Alert.alert("Couldn't complete booking", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {orderType && (
        <View style={styles.orderTypeHeader}>
          {orderType.imageUrl && (
            <Image source={{ uri: resolveImageUrl(orderType.imageUrl) }} style={styles.orderTypeImage} />
          )}
          <Text style={styles.orderTypeName}>{orderType.name}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Event details</Text>

      <Text style={styles.label}>Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {DATE_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot.date.toISOString()}
            onPress={() => setEventDate(slot.date)}
            style={[styles.timeSlot, eventDate?.toDateString() === slot.date.toDateString() && styles.timeSlotActive]}
          >
            <Text style={[styles.timeSlotText, eventDate?.toDateString() === slot.date.toDateString() && styles.timeSlotTextActive]}>
              {slot.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Guests</Text>
      <TextInput
        style={[styles.input, { marginBottom: spacing.sm }]} value={guestCount} onChangeText={setGuestCount}
        keyboardType="number-pad" placeholder="e.g. 50"
      />

      <Text style={styles.label}>Delivery time</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {TIME_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot}
            onPress={() => setEventTime(slot)}
            style={[styles.timeSlot, eventTime === slot && styles.timeSlotActive]}
          >
            <Text style={[styles.timeSlotText, eventTime === slot && styles.timeSlotTextActive]}>{slot}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {eventTime && (
        dateTimeInvalid ? (
          <Text style={[styles.timeConfirm, { color: colors.chili, backgroundColor: "rgba(193,68,59,0.1)" }]}>
            Orders must be placed at least {MIN_LEAD_HOURS}h before delivery — pick a later slot
          </Text>
        ) : (
          <Text style={styles.timeConfirm}>Delivered at {eventTime}</Text>
        )
      )}

      <Text style={styles.label}>Venue address</Text>
      <TextInput
        style={[styles.input, { height: 70 }]} value={address} onChangeText={setAddress}
        multiline placeholder="Full address of the event location"
      />
      <TouchableOpacity onPress={useMyLocation} disabled={locating}>
        <Text style={styles.locationLink}>
          {locating ? "Getting location…" : coords ? "✓ Location captured" : "📍 Use my current location"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowMap((s) => !s)}>
        <Text style={styles.locationLink}>🗺️ {showMap ? "Hide map" : "Pick on map"}</Text>
      </TouchableOpacity>
      {showMap && (
        <LocationPickerMap
          initialLat={coords?.latitude} initialLng={coords?.longitude}
          onLocationSelected={async (lat, lng) => {
            setCoords({ latitude: lat, longitude: lng });
            const addr = await reverseGeocode(lat, lng);
            if (addr) setAddress(addr);
          }}
        />
      )}

      <Text style={styles.label}>Contact phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Any special instructions" />

      <View style={styles.divider} />

      <View style={styles.staffRow}>
        <Text style={styles.staffLabel}>Need serving staff for this event?</Text>
        <Switch value={needsStaff} onValueChange={setNeedsStaff} />
      </View>
      {needsStaff && (
        <View style={styles.staffCountRow}>
          <Text style={styles.label}>Number of staff</Text>
          <TextInput
            style={[styles.input, { width: 70 }]} value={staffCount} onChangeText={setStaffCount}
            keyboardType="number-pad"
          />
          {settings && (
            <Text style={styles.hint}>₹{settings.staffPricePerPerson}/staff — ₹{staffCost.toFixed(0)} total</Text>
          )}
        </View>
      )}

      {allAddons.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Add-ons</Text>
          {allAddons.map((addon) => (
            <TouchableOpacity key={addon.id} style={styles.addonRow} onPress={() => toggleAddon(addon.id)}>
              <View style={[styles.checkbox, selectedAddons[addon.id] && styles.checkboxChecked]} />
              <Text style={styles.addonName}>{addon.name}</Text>
              <Text style={styles.addonPrice}>₹{addon.price}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={styles.divider} />
      <Text style={styles.label}>Coupon code</Text>
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

      <Text style={styles.label}>Payment method</Text>
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

      <View style={styles.summary}>
        {needsStaff && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>{staffCount} staff</Text>
            <Text style={styles.summaryPrice}>₹{staffCost.toFixed(0)}</Text>
          </View>
        )}
        {Object.entries(selectedAddons).map(([addonId, qty]) => {
          const addon = allAddons.find((a) => a.id === addonId);
          if (!addon) return null;
          return (
            <View key={addonId} style={styles.summaryRow}>
              <Text style={styles.summaryItem}>{qty}× {addon.name}</Text>
              <Text style={styles.summaryPrice}>₹{(addon.price * qty).toFixed(0)}</Text>
            </View>
          );
        })}
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
        <View style={[styles.summaryRow, { marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toFixed(0)}</Text>
        </View>
      </View>

      {belowMinimum && (
        <Text style={styles.minOrderWarning}>
          Minimum order amount is ₹{settings.minOrderAmount}. Add ₹{(settings.minOrderAmount - finalTotal).toFixed(0)} more to continue.
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={placeBooking} disabled={submitting || belowMinimum || dateTimeInvalid}>
        <Text style={styles.buttonText}>
          {submitting ? "Processing…" : paymentMethod === "COD" ? "Confirm booking (Cash on delivery)" : "Pay & confirm booking"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.paper, flexGrow: 1 },
  orderTypeHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  orderTypeImage: { width: 48, height: 48, borderRadius: 6, marginRight: spacing.sm },
  orderTypeName: { fontSize: 20, fontWeight: "700", color: colors.ink },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, backgroundColor: colors.white, fontSize: 15, justifyContent: "center", color: colors.ink },
  locationLink: { color: colors.saffron2, fontSize: 13, marginTop: 6 },
  timeSlot: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14,
    marginRight: 8, backgroundColor: colors.white,
  },
  timeSlotActive: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.12)" },
  timeSlotText: { fontSize: 13, color: colors.ink },
  timeSlotTextActive: { color: colors.saffron2, fontWeight: "700" },
  timeConfirm: { fontSize: 12, color: colors.saffron2, backgroundColor: "rgba(232,163,61,0.1)", padding: 8, borderRadius: 6, marginBottom: spacing.sm, textAlign: "center" },
  row: { flexDirection: "row" },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.md },
  staffRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  staffLabel: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1, marginRight: spacing.sm },
  staffCountRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  hint: { fontSize: 11, color: colors.inkFaint, marginLeft: spacing.sm },
  addonRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 3, marginRight: spacing.sm },
  checkboxChecked: { backgroundColor: colors.saffron2, borderColor: colors.saffron2 },
  addonName: { flex: 1, fontSize: 14, color: colors.ink },
  addonPrice: { fontSize: 13, color: colors.inkFaint },
  couponRow: { flexDirection: "row", alignItems: "center" },
  applyBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  applyBtnText: { fontSize: 13, color: colors.ink },
  couponError: { color: colors.chili, fontSize: 12, marginTop: 4 },
  couponSuccess: { color: colors.basil, fontSize: 12, marginTop: 4 },
  paymentRow: { flexDirection: "row", marginTop: spacing.sm },
  paymentBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingVertical: 10, alignItems: "center", marginRight: spacing.sm },
  paymentBtnActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  paymentBtnText: { fontSize: 13, color: colors.ink },
  paymentBtnTextActive: { color: colors.paper },
  summary: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.line },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryItem: { fontSize: 14, color: colors.ink },
  summaryPrice: { fontSize: 14, color: colors.ink },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  totalValue: { fontSize: 15, fontWeight: "700", color: colors.ink },
  minOrderWarning: { color: colors.chili, fontSize: 12, marginTop: spacing.sm },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
});
