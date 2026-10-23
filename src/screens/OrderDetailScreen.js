import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";
import { rupees, longDate } from "../utils";
import TrackingMap from "../components/TrackingMap";

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_TITLES = {
  PENDING: "Order placed", CONFIRMED: "Confirmed by kitchen", PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "On the way", DELIVERED: "Delivered",
};
const STEP_NOTES = { PREPARING: "Being cooked fresh", OUT_FOR_DELIVERY: "Your order has left the kitchen" };

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

function StarPicker({ value, onChange }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[styles.star, n <= value && styles.starActive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(() => {
    api.getOrder(orderId).then((d) => setOrder(d.order)).catch((e) => console.warn(e.message));
  }, [orderId]);

  // Refresh every 20 seconds while this screen is open so the timeline moves on its own
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 20000);
      return () => clearInterval(timer);
    }, [load])
  );

  useEffect(() => {
    navigation.setOptions({ title: `Order #${orderId.slice(0, 8).toUpperCase()}` });
  }, [navigation, orderId]);

  function onRefresh() {
    setRefreshing(true);
    Promise.resolve(load()).finally(() => setRefreshing(false));
  }

  async function submitReview() {
    if (rating === 0) {
      Alert.alert("Pick a rating", "Please choose a star rating first.");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.createReview(order.id, rating, comment);
      load();
    } catch (err) {
      Alert.alert("Couldn't submit review", err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron2} />
      </View>
    );
  }

  const currentStepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const eventAt = (status) => (order.events || []).find((e) => e.status === status)?.createdAt || (status === "PENDING" ? order.createdAt : null);
  const arriving = order.eventDate ? `${longDate(order.eventDate)}${order.eventTime ? `, ${order.eventTime}` : ""}` : null;
  const partner = order.deliveryPartner;

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TrackingMap latitude={order.latitude} longitude={order.longitude} />

      <View style={{ padding: spacing.lg }}>
        {isCancelled ? (
          <Text style={styles.cancelledBadge}>CANCELLED</Text>
        ) : (
          <View style={styles.arriving}>
            <Text style={styles.arrivingLabel}>{isDelivered ? "DELIVERED" : "ARRIVING"}</Text>
            <Text style={styles.arrivingTitle}>{arriving || "Scheduled"}</Text>
          </View>
        )}

        {!isCancelled && (
          <View style={styles.timeline}>
            {STEPS.map((step, idx) => {
              const done = idx < currentStepIndex || (idx === currentStepIndex && isDelivered);
              const current = idx === currentStepIndex && !isDelivered;
              const at = eventAt(step);
              const last = idx === STEPS.length - 1;
              return (
                <View key={step} style={styles.tlRow}>
                  <View style={styles.tlRail}>
                    <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCurrent]}>
                      {done && <Text style={styles.tlTick}>✓</Text>}
                    </View>
                    {!last && <View style={[styles.tlLine, done && styles.tlLineDone]} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                    <Text style={[styles.tlTitle, current && { color: colors.saffron2, fontWeight: "700" }, !done && !current && { color: colors.inkFaint }]}>
                      {STEP_TITLES[step]}
                    </Text>
                    {(done || current) && !!at && <Text style={styles.tlTime}>{when(at)}</Text>}
                    {current && !!STEP_NOTES[step] && <Text style={styles.tlTime}>{STEP_NOTES[step]}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!isCancelled && (
          <View style={styles.partnerCard}>
            <View style={styles.partnerAvatar}><Text style={styles.partnerInitial}>{(partner?.name || "D").charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{partner ? `${partner.name}, delivery partner` : "Delivery partner"}</Text>
              <Text style={styles.partnerSub}>
                {partner ? "Call if you need to guide them to the door" : "Assigned once your order is ready to leave"}
              </Text>
            </View>
            {!!partner?.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${partner.phone}`)} accessibilityLabel="Call delivery partner">
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("ChatTab", { prefill: `About order #${order.id.slice(0, 8).toUpperCase()}: ` })}
          >
            <Text style={styles.actionText}>Chat with us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowDetails((v) => !v)}>
            <Text style={styles.actionText}>{showDetails ? "Hide details" : "Order details"}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.headerRow, { marginTop: spacing.md }]}>
          <Text style={styles.orderId}>{order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}</Text>
          <View style={[styles.paymentBadge, order.paymentStatus === "PAID" ? styles.paymentBadgePaid : styles.paymentBadgePending]}>
            <Text style={[styles.paymentBadgeText, order.paymentStatus === "PAID" ? { color: colors.basil } : { color: colors.saffron2 }]}>
              {order.paymentStatus}
            </Text>
          </View>
        </View>

      {showDetails && (
      <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.menuItem.soldByWeight ? `${item.quantity}g` : `${item.quantity}×`} {item.menuItem.name}</Text>
            <Text style={styles.itemPrice}>{rupees(item.price * item.quantity)}</Text>
          </View>
        ))}
        {order.staffCost > 0 && (
          <View style={styles.itemRow}><Text style={styles.itemName}>Serving staff ({order.staffCount})</Text><Text style={styles.itemPrice}>{rupees(order.staffCost)}</Text></View>
        )}
        {order.discountAmount > 0 && (
          <View style={styles.itemRow}><Text style={[styles.itemName, { color: colors.basil }]}>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</Text><Text style={[styles.itemPrice, { color: colors.basil }]}>−{rupees(order.discountAmount)}</Text></View>
        )}
        {order.gstAmount > 0 && (
          <View style={styles.itemRow}><Text style={styles.itemName}>GST</Text><Text style={styles.itemPrice}>{rupees(order.gstAmount)}</Text></View>
        )}
        <View style={styles.itemRow}>
          <Text style={styles.itemName}>Delivery</Text>
          <Text style={styles.itemPrice}>{order.deliveryFee > 0 ? rupees(order.deliveryFee) : "Free"}</Text>
        </View>
        {order.pointsDiscount > 0 && (
          <View style={styles.itemRow}><Text style={[styles.itemName, { color: colors.basil }]}>Reward points</Text><Text style={[styles.itemPrice, { color: colors.basil }]}>−{rupees(order.pointsDiscount)}</Text></View>
        )}
        <View style={[styles.itemRow, { marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm }]}>
          <Text style={styles.totalLabel}>{order.gstAmount > 0 ? "Total (incl. GST)" : "Total"}</Text>
          <Text style={styles.totalValue}>{rupees(order.totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery details</Text>
        <Text style={styles.detailText}>{order.deliveryAddress}</Text>
        <Text style={styles.detailText}>{order.contactPhone}</Text>
        {!!order.notes && <Text style={styles.detailNote}>"{order.notes}"</Text>}
      </View>

      </View>
      )}

      {isDelivered && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{order.review ? "Your review" : "How was your order?"}</Text>
          {order.review ? (
            <View>
              <Text style={styles.reviewStars}>
                {"★".repeat(order.review.rating)}
                <Text style={{ color: colors.line }}>{"★".repeat(5 - order.review.rating)}</Text>
              </Text>
              {!!order.review.comment && <Text style={styles.detailText}>{order.review.comment}</Text>}
            </View>
          ) : (
            <View>
              <StarPicker value={rating} onChange={setRating} />
              <TextInput
                style={styles.commentInput} value={comment} onChangeText={setComment}
                placeholder="Tell us more (optional)" multiline
              />
              <TouchableOpacity style={styles.reviewButton} onPress={submitReview} disabled={submittingReview}>
                <Text style={styles.reviewButtonText}>{submittingReview ? "Submitting…" : "Submit review"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  arriving: { backgroundColor: colors.charcoal, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: spacing.md },
  arrivingLabel: { fontSize: 11, letterSpacing: 1, color: colors.saffron, fontWeight: "700" },
  arrivingTitle: { fontSize: 22, fontWeight: "700", color: colors.paper, marginTop: 4 },
  timeline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  tlRow: { flexDirection: "row" },
  tlRail: { width: 26, alignItems: "center" },
  tlDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  tlDotDone: { backgroundColor: colors.basil, borderColor: colors.basil },
  tlDotCurrent: { backgroundColor: colors.saffron, borderColor: "#F6DDAE" },
  tlTick: { color: colors.white, fontSize: 11, fontWeight: "700", marginTop: -1 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  tlLineDone: { backgroundColor: colors.basil },
  tlTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  tlTime: { fontSize: 12, color: colors.inkFaint, marginTop: 1 },
  partnerCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  partnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E6D8B9", alignItems: "center", justifyContent: "center", marginRight: 12 },
  partnerInitial: { fontSize: 18, fontWeight: "700", color: colors.charcoal },
  partnerName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  partnerSub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  callBtn: { backgroundColor: colors.basil, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
  callText: { color: colors.white, fontWeight: "700" },
  actionRow: { flexDirection: "row", marginTop: spacing.xs },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginHorizontal: 4 },
  actionText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  orderId: { fontSize: 12, color: colors.inkFaint, fontFamily: "monospace" },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  paymentBadgePaid: { backgroundColor: "rgba(47,82,51,0.1)" },
  paymentBadgePending: { backgroundColor: "rgba(232,163,61,0.1)" },
  paymentBadgeText: { fontSize: 11, fontFamily: "monospace" },
  cancelledBadge: { color: colors.chili, fontWeight: "700", fontSize: 16, marginBottom: spacing.lg },
  tracker: { marginBottom: spacing.lg },
  trackerStep: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.line, marginRight: spacing.sm },
  dotDone: { backgroundColor: colors.basil },
  stepLabel: { fontSize: 13, color: colors.inkFaint, textTransform: "capitalize" },
  stepLabelDone: { color: colors.ink, fontWeight: "600" },
  connector: { position: "absolute", left: 5, top: 14, width: 2, height: 20, backgroundColor: colors.line },
  connectorDone: { backgroundColor: colors.basil },
  section: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemName: { fontSize: 14, color: colors.ink },
  itemPrice: { fontSize: 14, color: colors.ink },
  totalLabel: { fontWeight: "700", color: colors.ink },
  totalValue: { fontWeight: "700", color: colors.ink },
  detailText: { fontSize: 14, color: colors.ink, marginBottom: 2 },
  detailNote: { fontSize: 13, color: colors.inkFaint, fontStyle: "italic", marginTop: 4 },
  star: { fontSize: 28, color: colors.line, marginRight: 4 },
  starActive: { color: colors.saffron2 },
  reviewStars: { fontSize: 24, color: colors.saffron2, marginBottom: 4 },
  commentInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, marginTop: spacing.sm, marginBottom: spacing.sm, minHeight: 60, backgroundColor: colors.white, color: colors.ink },
  reviewButton: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 12, alignItems: "center" },
  reviewButtonText: { color: colors.paper, fontWeight: "600", fontSize: 14 },
});
