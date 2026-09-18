import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

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

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(() => {
    api.getOrder(orderId).then((d) => setOrder(d.order)).catch((e) => console.warn(e.message));
  }, [orderId]);

  useEffect(load, [load]);

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
        <View style={[styles.paymentBadge, order.paymentStatus === "PAID" ? styles.paymentBadgePaid : styles.paymentBadgePending]}>
          <Text style={[styles.paymentBadgeText, order.paymentStatus === "PAID" ? { color: colors.basil } : { color: colors.saffron2 }]}>
            {order.paymentMethod} · {order.paymentStatus}
          </Text>
        </View>
      </View>

      {isCancelled ? (
        <Text style={styles.cancelledBadge}>CANCELLED</Text>
      ) : (
        <View style={styles.tracker}>
          {STEPS.map((step, idx) => {
            const done = idx <= currentStepIndex;
            return (
              <View key={step} style={styles.trackerStep}>
                <View style={[styles.dot, done && styles.dotDone]} />
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.replace(/_/g, " ")}</Text>
                {idx < STEPS.length - 1 && <View style={[styles.connector, done && styles.connectorDone]} />}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.quantity}× {item.menuItem.name}</Text>
            <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
          </View>
        ))}
        <View style={[styles.itemRow, { marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery details</Text>
        <Text style={styles.detailText}>{order.deliveryAddress}</Text>
        <Text style={styles.detailText}>{order.contactPhone}</Text>
        {!!order.notes && <Text style={styles.detailNote}>"{order.notes}"</Text>}
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
