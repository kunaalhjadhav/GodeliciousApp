import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { rupees } from "../utils";

const OCCASIONS = ["Birthday", "Wedding", "Office lunch", "Pooja", "Housewarming"];
const STYLES = [{ key: "veg", label: "Veg" }, { key: "mixed", label: "Mixed" }, { key: "jain", label: "Jain" }];
const MIN_G = 10;
const MAX_G = 250;

export default function PartySizeScreen({ route, navigation }) {
  const { t } = useLang();
  const { addItem, setStaff } = useCart();
  const p = route.params || {};
  const [occasion, setOccasion] = useState(p.occasion || "Wedding");
  const [guests, setGuests] = useState(p.guests || 50);
  const [style, setStyle] = useState(p.foodStyle || "veg");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackWidth, setTrackWidth] = useState(1);
  const timer = useRef(null);

  // Ask the server for quantities, a moment after the last change
  useEffect(() => {
    setLoading(true);
    setError("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.planParty(guests, style, occasion)
        .then(setPlan)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [guests, style, occasion]);

  const clampGuests = (n) => Math.max(1, Math.min(5000, Math.round(n)));
  const pct = Math.max(0, Math.min(1, (guests - MIN_G) / (MAX_G - MIN_G)));

  function slideTo(x) {
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    setGuests(Math.round((MIN_G + ratio * (MAX_G - MIN_G)) / 5) * 5);
  }

  function addAllToCart() {
    if (!plan || plan.lines.length === 0) return;
    const needsChoice = [];
    for (const line of plan.lines) {
      const mi = line.menuItem;
      if (mi.isCombo && mi.comboGroups?.length) { needsChoice.push(mi); continue; }
      addItem(mi, [], line.quantity);
    }
    if (plan.staff) setStaff({ count: plan.staff.count, unitPrice: plan.staff.unitPrice });
    if (needsChoice.length) {
      Alert.alert("One more step", `${needsChoice[0].name} has options to choose. Pick them on its page.`, [
        { text: "Open it", onPress: () => navigation.navigate("ItemDetail", { itemId: needsChoice[0].id }) },
      ]);
      return;
    }
    navigation.navigate("Cart");
  }

  function getQuote() {
    const lines = (plan?.lines || []).map((l) => `${l.display} ${l.menuItem.name}`).join(", ");
    navigation.navigate("ChatTab", {
      prefill: `Hi, I need a quote for ${guests} guests (${occasion}, ${style}). ${lines ? `Suggested: ${lines}. ` : ""}`,
    });
  }

  const short = (plan?.lines || []).filter((l) => !l.inStock);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <Text style={styles.label}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {OCCASIONS.map((o) => (
            <TouchableOpacity key={o} onPress={() => setOccasion(o)} style={[styles.pill, occasion === o && styles.pillOn]}>
              <Text style={[styles.pillText, occasion === o && styles.pillTextOn]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Guests</Text>
        <View style={styles.guestCard}>
          <View style={styles.guestRow}>
            <TouchableOpacity style={styles.round} onPress={() => setGuests((g) => clampGuests(g - 5))}><Text style={styles.roundText}>−</Text></TouchableOpacity>
            <Text style={styles.guestNum}>{guests}</Text>
            <TouchableOpacity style={[styles.round, styles.roundDark]} onPress={() => setGuests((g) => clampGuests(g + 5))}><Text style={[styles.roundText, { color: colors.white }]}>+</Text></TouchableOpacity>
          </View>
          <View
            style={styles.trackTouch}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => slideTo(e.nativeEvent.locationX)}
            onResponderMove={(e) => slideTo(e.nativeEvent.locationX)}
          >
            <View pointerEvents="none" style={styles.track}>
              <View style={[styles.trackFill, { width: `${pct * 100}%` }]} />
            </View>
            <View pointerEvents="none" style={[styles.thumb, { left: pct * trackWidth - 11 }]} />
          </View>
          <View style={styles.rangeRow}><Text style={styles.range}>{MIN_G}</Text><Text style={styles.range}>{MAX_G}+</Text></View>
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Food style</Text>
        <View style={{ flexDirection: "row" }}>
          {STYLES.map((s) => (
            <TouchableOpacity key={s.key} onPress={() => setStyle(s.key)} style={[styles.pill, style === s.key && styles.pillOn]}>
              <Text style={[styles.pillText, style === s.key && styles.pillTextOn]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.label}>Suggested for {guests} guests</Text>
          {loading && !plan ? (
            <ActivityIndicator color={colors.saffron2} style={{ margin: spacing.lg }} />
          ) : error ? (
            <Text style={styles.err}>{error}</Text>
          ) : plan && plan.lines.length === 0 ? (
            <Text style={styles.note}>{plan.note || "No suggestions available yet."}</Text>
          ) : (
            <View style={{ opacity: loading ? 0.5 : 1 }}>
              {(plan?.lines || []).map((l, i) => (
                <View key={`${l.menuItem.id}-${i}`} style={[styles.line, i === 0 && { borderTopWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName}>{l.menuItem.name}</Text>
                    {!l.inStock && <Text style={styles.stockWarn}>Only {l.menuItem.soldByWeight ? `${l.availableQty / 1000} kg` : l.availableQty} in stock</Text>}
                  </View>
                  <Text style={styles.lineQty}>
                    <Text style={{ fontWeight: "700" }}>{l.display}</Text>
                    <Text style={{ color: colors.inkFaint }}> x {rupees(l.unitPrice)}</Text>
                  </Text>
                </View>
              ))}
              {plan?.staff && (
                <View style={styles.line}>
                  <Text style={[styles.lineName, { flex: 1 }]}>Serving staff</Text>
                  <Text style={styles.lineQty}>
                    <Text style={{ fontWeight: "700" }}>{plan.staff.count}</Text>
                    <Text style={{ color: colors.inkFaint }}> x {rupees(plan.staff.unitPrice)}</Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {plan && plan.lines.length > 0 && (
          <View>
            <View style={[styles.totalRow, { marginBottom: 2 }]}>
              <Text style={styles.totalLabel}>Estimated food total</Text>
              <Text style={styles.totalValue}>{rupees(plan.total)}</Text>
            </View>
            <View style={[styles.totalRow, { marginBottom: 2 }]}>
              <Text style={styles.totalLabel}>GST ({plan.gstPercent ?? 5}%)</Text>
              <Text style={styles.totalValue}>{rupees(plan.gst ?? 0)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated total to pay</Text>
              <Text style={styles.totalValue}>{rupees(plan.payable ?? plan.total)}</Text>
            </View>
            {short.length > 0 && <Text style={styles.stockWarn}>Some items have limited stock. Ask for a quote for the full amount.</Text>}
            <Text style={styles.note}>Adjust any quantity in the cart. For very large events, ask us for a custom quote.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.quoteBtn} onPress={getQuote}><Text style={styles.quoteText}>{t("get_quote")}</Text></TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, (!plan || plan.lines.length === 0) && { opacity: 0.4 }]}
          disabled={!plan || plan.lines.length === 0} onPress={addAllToCart}
        >
          <Text style={styles.addText}>{t("add_all_cart")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  pill: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  pillOn: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.14)" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextOn: { color: colors.saffron2, fontWeight: "700" },
  guestCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md },
  guestRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  roundDark: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  roundText: { fontSize: 22, color: colors.ink, marginTop: -2 },
  guestNum: { fontSize: 40, fontWeight: "700", color: colors.charcoal },
  trackTouch: { height: 36, justifyContent: "center", marginTop: 6 },
  track: { height: 6, backgroundColor: "#EDE8DC", borderRadius: 3 },
  trackFill: { height: 6, backgroundColor: colors.saffron, borderRadius: 3 },
  thumb: { position: "absolute", top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.saffron2 },
  rangeRow: { flexDirection: "row", justifyContent: "space-between" },
  range: { fontSize: 11, color: colors.inkFaint },
  listCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginTop: spacing.lg },
  line: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderColor: "#EDE8DC" },
  lineName: { fontSize: 14, color: colors.ink },
  lineQty: { fontSize: 14, color: colors.ink },
  stockWarn: { fontSize: 12, color: colors.chili, marginTop: 2 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.md, paddingHorizontal: 4 },
  totalLabel: { fontSize: 13, color: colors.inkFaint, flex: 1 },
  totalValue: { fontSize: 24, fontWeight: "700", color: colors.charcoal },
  note: { fontSize: 12, color: colors.inkFaint, marginTop: 6, paddingHorizontal: 4 },
  err: { color: colors.chili, fontSize: 13, marginTop: 6 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line },
  quoteBtn: { borderWidth: 1.5, borderColor: colors.charcoal, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginRight: 10 },
  quoteText: { fontWeight: "700", fontSize: 14, color: colors.charcoal },
  addBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  addText: { color: colors.paper, fontWeight: "700", fontSize: 15 },
});
