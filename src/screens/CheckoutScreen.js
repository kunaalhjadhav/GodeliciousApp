import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import RazorpayCheckout from "react-native-razorpay";
import { api, API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import { rupees, computeTotals, mealBoxCount } from "../utils";
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
  const { items, totalAmount, clearCart, coupon: cartCoupon, staff } = useCart();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(null);
  const [eventTime, setEventTime] = useState(null);
  const [guestCount, setGuestCount] = useState("");
  const [coords, setCoords] = useState(null);
  const [areaMsg, setAreaMsg] = useState(""); // set when the chosen location is outside the delivery area
  useEffect(() => {
    if (!coords) { setAreaMsg(""); return; }
    api.serviceCheck(coords.latitude, coords.longitude)
      .then((r) => setAreaMsg(r.ok ? "" : r.message || "Service not available to this area yet. Coming shortly. Thank you."))
      .catch(() => {});
  }, [coords]);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Address autocomplete (Google Places)
  const [suggestions, setSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const autocompleteTimer = useRef(null);

  const [couponCode, setCouponCode] = useState(cartCoupon?.code || "");
  const [couponStatus, setCouponStatus] = useState(cartCoupon ? { discountAmount: cartCoupon.discountAmount } : null);

  // Saved addresses (Home / Office / Venue pills) and reward points
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [saveAs, setSaveAs] = useState(null); // null = do not save, otherwise the label
  const [loyalty, setLoyalty] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [settings, setSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
    api.myLoyalty().then(setLoyalty).catch(() => {});
    if (user?.phone) setPhone(user.phone);
    api.myAddresses().then((d) => {
      setAddresses(d.addresses);
      const def = d.addresses.find((a) => a.isDefault) || d.addresses[0];
      if (def) pickSavedAddress(def);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSavedAddress(a) {
    setSelectedAddressId(a.id);
    setAddress(a.address);
    setSuggestions([]);
    setSaveAs(null);
    if (a.phone) setPhone(a.phone);
    setCoords(a.latitude != null && a.longitude != null ? { latitude: a.latitude, longitude: a.longitude } : null);
  }

  const discount = couponStatus?.discountAmount || 0;
  // Delivery fee: same rule the server applies (0 = free; waived above the free-delivery amount, measured before the coupon)
  const deliveryFee = settings && settings.deliveryFee > 0 && !(settings.freeDeliveryAbove > 0 && totalAmount >= settings.freeDeliveryAbove)
    ? settings.deliveryFee : 0;
  const gstPercent = settings?.gstPercent ?? 5;
  // GST is added on top of (items - coupon). Reward points (10 points = Rs 1, whole rupees) come off the amount payable.
  const base = computeTotals({ subtotal: totalAmount, discount, deliveryFee, gstPercent });
  const pointsRupees = usePoints && loyalty ? Math.min(Math.floor(loyalty.points / 10), Math.floor(base.taxable + base.gst + base.deliveryFee)) : 0;
  const totals = computeTotals({ subtotal: totalAmount, discount, deliveryFee, pointsRupees, gstPercent });
  const finalTotal = totals.total;
  const gstAmount = totals.gst;
  // The minimum order is checked on the cart BEFORE the coupon, so a coupon never blocks checkout.
  const belowMinimum = settings && totalAmount < settings.minOrderAmount && totalAmount > 0;
  const boxMin = settings?.mealBoxMinQty ?? 10;
  const boxes = mealBoxCount(items);
  const boxesShort = boxes > 0 && boxes < boxMin;
  const minAllowedTime = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
  const dateTimeInvalid = !eventDate || !eventTime || combineDateTime(eventDate, eventTime) < minAllowedTime;
  // A whole day is greyed out when even its last slot (9 PM) is inside the notice window
  const dayClosed = (d) => combineDateTime(d, TIME_SLOTS[TIME_SLOTS.length - 1]) < minAllowedTime;
  const slotClosed = (d, slot) => combineDateTime(d, slot) < minAllowedTime;

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
    // Collect everything that's missing and show it in one pop-up
    const missing = [];
    if (!address.trim()) missing.push("Delivery address");
    const phoneDigits = String(phone || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!phoneDigits) missing.push("Contact phone number");
    else if (phoneDigits.length !== 10) missing.push("A valid 10-digit phone number");
    if (!eventDate) missing.push("Delivery date");
    if (!eventTime) missing.push("Delivery time");
    if (!items.length) missing.push("At least one item in your cart");
    if (missing.length) {
      Alert.alert(
        "Please complete these details",
        missing.map((m) => `\u2022 ${m}`).join("\n")
      );
      return;
    }
    if (areaMsg) {
      Alert.alert("Service not available", areaMsg);
      return;
    }
    if (belowMinimum) {
      Alert.alert("Minimum order", `The minimum order is ${rupees(settings.minOrderAmount)} (before GST and discounts). Please add more items to continue.`);
      return;
    }
    if (boxesShort) {
      Alert.alert("Meal boxes", `Meal boxes need a minimum of ${boxMin} meals per order. You have ${boxes}. Please add ${boxMin - boxes} more.`);
      return;
    }
    const chosen = combineDateTime(eventDate, eventTime);
    const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
    if (chosen < minAllowed) {
      Alert.alert("Too soon", `Orders must be placed at least ${MIN_LEAD_HOURS} hours before the selected delivery time. Please pick a later date or time.`);
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
        contactPhone: phoneDigits,
        notes,
        eventDate: eventDate.toISOString(),
        eventTime,
        guestCount: guestCount || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
        usePoints: usePoints && pointsRupees > 0,
        ...(staff && { needsStaff: true, staffCount: staff.count }),
      };
      const { order } = await api.createOrder(payload);

      if (saveAs && !selectedAddressId) {
        api.addAddress({ label: saveAs, address, phone, latitude: coords?.latitude, longitude: coords?.longitude })
          .catch(() => {}); // saving the address is a convenience, never block the order on it
      }

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
        prefill: { name: user.name, email: user.email, contact: phoneDigits },
        theme: { color: "#1C1B19" },
      });

      await api.verifyRazorpayPayment({
        orderId: order.id,
        razorpayPaymentId: rpResult.razorpay_payment_id,
        razorpaySignature: rpResult.razorpay_signature,
      });
      clearCart();
      Alert.alert("Order placed!", `Payment confirmed. Total: ${rupees(order.totalAmount)}`, [
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
        <Text style={styles.cardLabel}>Deliver to</Text>
        {addresses.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {addresses.map((a) => (
              <TouchableOpacity
                key={a.id} onPress={() => pickSavedAddress(a)}
                style={[styles.pill, selectedAddressId === a.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, selectedAddressId === a.id && styles.pillTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { setSelectedAddressId(null); setAddress(""); setCoords(null); }}
              style={styles.pill}
            >
              <Text style={styles.pillText}>+ New</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
        <TextInput
          style={[styles.input, { height: 64 }]} value={address}
          onChangeText={(v) => { setSelectedAddressId(null); handleAddressChange(v); }}
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
        {!!areaMsg && <Text style={{ color: colors.chili, fontSize: 13, marginTop: 6 }}>{areaMsg}</Text>}
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
        {!selectedAddressId && address.trim().length > 5 && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.cardLabel}>Save this address as</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {["Home", "Office", "Venue"].map((label) => (
                <TouchableOpacity key={label} onPress={() => setSaveAs(saveAs === label ? null : label)} style={[styles.pill, saveAs === label && styles.pillActive]}>
                  <Text style={[styles.pillText, saveAs === label && styles.pillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Date & time card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Delivery date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATE_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot.date.toISOString()}
              onPress={() => { setEventDate(slot.date); setEventTime(null); }}
              disabled={dayClosed(slot.date)}
              style={[styles.pill, eventDate?.toDateString() === slot.date.toDateString() && styles.pillActive, dayClosed(slot.date) && styles.pillOff]}
            >
              <Text style={[styles.pillText, eventDate?.toDateString() === slot.date.toDateString() && styles.pillTextActive, dayClosed(slot.date) && styles.pillTextOff]}>
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
                  disabled={slotClosed(eventDate, slot)}
                  style={[styles.pill, eventTime === slot && styles.pillActive, slotClosed(eventDate, slot) && styles.pillOff]}
                >
                  <Text style={[styles.pillText, eventTime === slot && styles.pillTextActive, slotClosed(eventDate, slot) && styles.pillTextOff]}>{slot}</Text>
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

        <Text style={styles.timeConfirm}>Orders need {MIN_LEAD_HOURS} hours notice. Earlier slots are greyed out.</Text>

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
        <Text style={styles.cardLabel}>Pay with</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            onPress={() => setPaymentMethod("ONLINE")}
            style={[styles.payOption, paymentMethod === "ONLINE" && styles.payOptionActive]}
          >
            <Text style={styles.payTitle}>UPI / Card</Text>
            <Text style={styles.paySub}>via Razorpay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPaymentMethod("COD")}
            disabled={settings && !settings.codEnabled}
            style={[styles.payOption, paymentMethod === "COD" && styles.payOptionActive, settings && !settings.codEnabled && { opacity: 0.4 }]}
          >
            <Text style={styles.payTitle}>Cash on delivery</Text>
            <Text style={styles.paySub}>Pay at the door</Text>
          </TouchableOpacity>
        </View>
        {settings && !settings.codEnabled && (
          <Text style={styles.hint}>Cash on delivery isn't available right now.</Text>
        )}
        {loyalty && loyalty.points >= 10 && (
          <TouchableOpacity style={styles.pointsRow} onPress={() => setUsePoints((v) => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, usePoints && styles.checkboxOn]}>
              {usePoints && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.pointsText}>
              Use my {loyalty.points} reward points (worth {rupees(loyalty.rupeeValue)})
            </Text>
          </TouchableOpacity>
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
            <Text style={styles.summaryPrice}>{rupees(line.unitPrice * line.quantity)}</Text>
          </View>
        ))}
        {staff && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>Serving staff ({staff.count} x ₹{staff.unitPrice})</Text>
            <Text style={styles.summaryPrice}>{rupees(staff.count * staff.unitPrice)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>Items total</Text>
          <Text style={styles.summaryPrice}>{rupees(totalAmount)}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { color: colors.basil }]}>Coupon discount</Text>
            <Text style={[styles.summaryPrice, { color: colors.basil }]}>−{rupees(discount)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryItem}>GST ({gstPercent}%)</Text>
          <Text style={styles.summaryPrice}>{rupees(gstAmount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryItem, deliveryFee === 0 && { color: colors.basil }]}>Delivery</Text>
          <Text style={[styles.summaryPrice, deliveryFee === 0 && { color: colors.basil }]}>{deliveryFee === 0 ? "Free" : rupees(deliveryFee)}</Text>
        </View>
        {pointsRupees > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { color: colors.basil }]}>Reward points</Text>
            <Text style={[styles.summaryPrice, { color: colors.basil }]}>−{rupees(pointsRupees)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>To pay (incl. GST)</Text>
          <Text style={styles.totalValue}>{rupees(finalTotal)}</Text>
        </View>
      </View>

      {belowMinimum && (
        <Text style={styles.minOrderWarning}>
          Minimum order amount is {rupees(settings.minOrderAmount)} (before GST and discounts). Add {rupees(settings.minOrderAmount - totalAmount)} more to checkout.
        </Text>
      )}
      {boxesShort && (
        <Text style={styles.minOrderWarning}>
          Meal boxes need a minimum of {boxMin} meals per order. Add {boxMin - boxes} more.
        </Text>
      )}

      <TouchableOpacity style={[styles.button, (belowMinimum || boxesShort || dateTimeInvalid || !address.trim() || !phone) && { opacity: 0.55 }]} onPress={placeOrder} disabled={submitting}>
        <Text style={styles.buttonText}>
          {submitting ? "Processing…" : paymentMethod === "COD" ? `Place order · ${rupees(finalTotal)}` : `Pay ${rupees(finalTotal)}`}
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
  pillOff: { opacity: 0.35 },
  pillTextOff: { textDecorationLine: "line-through" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextActive: { color: colors.saffron2, fontWeight: "700" },
  timeConfirm: { fontSize: 12, color: colors.saffron2, backgroundColor: "rgba(232,163,61,0.1)", padding: 8, borderRadius: 8, marginTop: 10, textAlign: "center" },
  couponRow: { flexDirection: "row", alignItems: "center" },
  applyBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  applyBtnText: { fontSize: 13, color: colors.ink },
  couponError: { color: colors.chili, fontSize: 12, marginTop: 6 },
  couponSuccess: { color: colors.basil, fontSize: 12, marginTop: 6 },
  paymentRow: { flexDirection: "row", gap: spacing.sm },
  payOption: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12 },
  payOptionActive: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.10)" },
  payTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  paySub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  pointsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxOn: { backgroundColor: colors.basil, borderColor: colors.basil },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: "700" },
  pointsText: { flex: 1, fontSize: 14, color: colors.ink },
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
