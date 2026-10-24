import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import { rupees, weightLabel, resolveImageUrl } from "../utils";

const OCCASIONS = ["Birthday", "Wedding", "Office lunch", "Pooja", "Housewarming"];
const STYLES = [{ key: "veg", label: "Veg" }, { key: "mixed", label: "Mixed" }, { key: "jain", label: "Jain" }];
const MIN_G = 10;
const MAX_G = 250;
const GUESTS_PER_STAFF = 20;
const DEFAULT_GUESTS_PER_KG = 10;

// How much of an item feeds `guests` people: pieces (or grams for items sold by weight).
function qtyFor(item, guests) {
  if (item.soldByWeight) {
    const perKg = item.servesPerUnit > 1 ? item.servesPerUnit : DEFAULT_GUESTS_PER_KG;
    const half = Math.ceil((guests / perKg) * 2); // round up to the next 0.5 kg
    return Math.max(half * 500, item.minOrderGrams || 0);
  }
  return Math.max(1, Math.ceil(guests / Math.max(1, item.servesPerUnit || 1)));
}
const stepFor = (item) => (item.soldByWeight ? 500 : 1);
const needsOptions = (item) => item.isCombo && item.comboGroups?.length > 0;
const lineCost = (item, qty) => Math.round(item.soldByWeight ? (item.price / 1000) * qty : item.price * qty);

export default function PartySizeScreen({ route, navigation }) {
  const { addItem, updateQuantity, items: cartItems, setStaff } = useCart();
  const p = route.params || {};
  const [occasion, setOccasion] = useState(p.occasion || "Wedding");
  const [guests, setGuests] = useState(p.guests || 50);
  const [style, setStyle] = useState(p.foodStyle || "veg");
  const [trackWidth, setTrackWidth] = useState(1);

  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [settings, setSettings] = useState(null);
  const [withStaff, setWithStaff] = useState(false);
  // { [itemId]: { item, qty, manual } } - manual = the customer changed the amount themselves
  const [picked, setPicked] = useState({});
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    api.listCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
    api.listMenu().then((d) => setMenu(d.items || [])).catch((e) => setLoadError(e.message));
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const vegOnly = style !== "mixed" || /pooja|puja|housewarming/i.test(occasion);
  const clampGuests = (n) => Math.max(1, Math.min(5000, Math.round(n)));
  const pct = Math.max(0, Math.min(1, (guests - MIN_G) / (MAX_G - MIN_G)));

  function slideTo(x) {
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    setGuests(Math.round((MIN_G + ratio * (MAX_G - MIN_G)) / 5) * 5);
  }

  // Cap an amount at what's in stock (the server refuses orders above stock)
  const cap = (item, qty) => Math.min(qty, item.stockQty);
  const inStock = (item) => item.stockQty >= (item.soldByWeight ? Math.max(250, item.minOrderGrams || 0) : 1);

  // When the guest count changes, re-scale every pick the customer hasn't adjusted by hand
  useEffect(() => {
    setPicked((prev) => {
      const next = {};
      for (const [id, e] of Object.entries(prev)) {
        if (vegOnly && !e.item.isVeg) continue; // food style changed: drop non-veg picks
        next[id] = e.manual ? e : { ...e, qty: cap(e.item, qtyFor(e.item, guests)) };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, vegOnly]);

  function pick(item) {
    if (needsOptions(item)) {
      navigation.navigate("ItemDetail", { itemId: item.id });
      return;
    }
    setPicked((prev) => ({ ...prev, [item.id]: { item, qty: cap(item, qtyFor(item, guests)), manual: false } }));
  }
  function unpick(id) {
    setPicked((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function change(id, dir) {
    setPicked((prev) => {
      const e = prev[id];
      if (!e) return prev;
      const step = stepFor(e.item);
      const min = e.item.soldByWeight ? Math.max(250, e.item.minOrderGrams || 250) : 1;
      const q = e.qty + dir * step;
      if (q < min) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: { ...e, qty: Math.min(q, e.item.stockQty), manual: true } };
    });
  }

  // Optional shortcut: fill in the shop's own suggestion (items tagged for the planner)
  async function autoPick() {
    setAutoLoading(true);
    try {
      const plan = await api.planParty(guests, style, occasion);
      if (!plan.lines?.length) {
        Alert.alert("No suggestion yet", "Choose the dishes you like from the list below.");
        return;
      }
      const next = {};
      for (const l of plan.lines) {
        const full = (menu || []).find((m) => m.id === l.menuItem.id) || l.menuItem;
        if (needsOptions(full)) continue;
        next[full.id] = { item: full, qty: cap(full, l.quantity), manual: false };
      }
      setPicked(next);
    } catch (e) {
      Alert.alert("Couldn't suggest", e.message);
    } finally {
      setAutoLoading(false);
    }
  }

  const visible = useMemo(() => {
    return (menu || []).filter((m) => (activeCat === "all" || m.categoryId === activeCat) && (!vegOnly || m.isVeg));
  }, [menu, activeCat, vegOnly]);

  const entries = Object.values(picked);
  const foodTotal = entries.reduce((n, e) => n + lineCost(e.item, e.qty), 0);
  const staffPrice = settings?.staffPricePerPerson || 0;
  const staffCount = Math.ceil(guests / GUESTS_PER_STAFF);
  const staffTotal = withStaff && staffPrice > 0 ? staffCount * staffPrice : 0;
  const subtotal = foodTotal + staffTotal;
  const gstPercent = settings?.gstPercent ?? 5;
  const gst = Math.round(subtotal * gstPercent) / 100;
  const boxMin = settings?.mealBoxMinQty ?? 10;
  const boxQty = entries.reduce((n, e) => n + (e.item.isMealBox ? e.qty : 0), 0);
  const boxShort = boxQty > 0 && boxQty < boxMin;

  function checkout() {
    if (!entries.length) return;
    if (boxShort) {
      Alert.alert("Meal box minimum", `Meal boxes need at least ${boxMin} in total. You have ${boxQty}.`);
      return;
    }
    for (const e of entries) {
      const existing = cartItems.find((l) => l.menuItem.id === e.item.id && !(l.selectedOptions && l.selectedOptions.length));
      if (existing) updateQuantity(existing.key, e.qty);
      else addItem(e.item, [], e.qty);
    }
    if (withStaff && staffPrice > 0) setStaff({ count: staffCount, unitPrice: staffPrice });
    navigation.navigate("Cart");
  }

  const qtyText = (item, q) => (item.soldByWeight ? weightLabel(q) : `${q}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 150 }}>
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
          {STYLES.map((st) => (
            <TouchableOpacity key={st.key} onPress={() => setStyle(st.key)} style={[styles.pill, style === st.key && styles.pillOn]}>
              <Text style={[styles.pillText, style === st.key && styles.pillTextOn]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chooseHead}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Choose your menu</Text>
          <TouchableOpacity onPress={autoPick} disabled={autoLoading}>
            <Text style={styles.autoLink}>{autoLoading ? "Picking…" : "✨ Pick for me"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>Tap Add on the dishes you want. Quantities are set for {guests} guests, and you can change them.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setActiveCat(c.id)} style={[styles.pill, activeCat === c.id && styles.pillOn]}>
              <Text style={[styles.pillText, activeCat === c.id && styles.pillTextOn]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {menu === null && !loadError && <ActivityIndicator color={colors.saffron2} style={{ margin: spacing.lg }} />}
        {!!loadError && <Text style={styles.err}>{loadError}</Text>}
        {menu && visible.length === 0 && <Text style={styles.note}>Nothing in this category for the chosen food style.</Text>}

        {visible.map((item) => {
          const e = picked[item.id];
          const out = !inStock(item);
          const img = resolveImageUrl(item.imageUrl);
          return (
            <View key={item.id} style={[styles.dish, e && styles.dishOn, out && { opacity: 0.5 }]}>
              {img ? <Image source={{ uri: img }} style={styles.dishImg} /> : <View style={[styles.dishImg, { backgroundColor: colors.line }]} />}
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.vegDot, { borderColor: item.isVeg ? "#2e7d32" : colors.chili }]}>
                    <View style={[styles.vegInner, { backgroundColor: item.isVeg ? "#2e7d32" : colors.chili }]} />
                  </View>
                  <Text style={styles.dishName} numberOfLines={2}>{item.name}</Text>
                </View>
                <Text style={styles.dishMeta}>
                  {rupees(item.price)}{item.soldByWeight ? " / kg" : ""}
                  {item.servesPerUnit > 1 ? ` · serves ${item.servesPerUnit}${item.soldByWeight ? " per kg" : ""}` : ""}
                </Text>
                {out ? <Text style={styles.stockWarn}>Out of stock</Text>
                  : e && e.qty < qtyFor(item, guests) && !e.manual ? <Text style={styles.stockWarn}>Only {qtyText(item, item.stockQty)} left</Text> : null}
              </View>
              {out ? null : e ? (
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => change(item.id, -1)}><Text style={styles.stepTxt}>−</Text></TouchableOpacity>
                  <Text style={styles.stepQty}>{qtyText(item, e.qty)}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => change(item.id, 1)}><Text style={styles.stepTxt}>+</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addSmall} onPress={() => pick(item)}>
                  <Text style={styles.addSmallText}>{needsOptions(item) ? "Choose" : "Add"}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {staffPrice > 0 && (
          <TouchableOpacity style={[styles.dish, withStaff && styles.dishOn]} onPress={() => setWithStaff((v) => !v)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dishName}>Serving staff</Text>
              <Text style={styles.dishMeta}>{staffCount} staff for {guests} guests · {rupees(staffPrice)} each</Text>
            </View>
            <Text style={[styles.addSmallText, { color: withStaff ? colors.chili : colors.saffron2 }]}>{withStaff ? "Remove" : "Add"}</Text>
          </TouchableOpacity>
        )}

        {entries.length > 0 && (
          <View style={styles.listCard}>
            <Text style={styles.label}>Your selection</Text>
            {entries.map((e, i) => (
              <View key={e.item.id} style={[styles.line, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={[styles.lineName, { flex: 1 }]}>{e.item.name}</Text>
                <Text style={styles.lineQty}>
                  <Text style={{ fontWeight: "700" }}>{qtyText(e.item, e.qty)}</Text>
                  <Text style={{ color: colors.inkFaint }}> · {rupees(lineCost(e.item, e.qty))}</Text>
                </Text>
                <TouchableOpacity onPress={() => unpick(e.item.id)} style={{ paddingLeft: 12 }}><Text style={{ color: colors.chili, fontSize: 16 }}>✕</Text></TouchableOpacity>
              </View>
            ))}
            {boxShort && <Text style={styles.stockWarn}>Meal boxes need at least {boxMin} in total (you have {boxQty}).</Text>}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barCount}>{entries.length} {entries.length === 1 ? "item" : "items"} · {guests} guests</Text>
          <Text style={styles.barTotal}>{rupees(subtotal + gst)}</Text>
          <Text style={styles.barSub}>incl. {gstPercent}% GST · delivery at checkout</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, entries.length === 0 && { opacity: 0.4 }]}
          disabled={entries.length === 0} onPress={checkout}
        >
          <Text style={styles.addText}>Review & checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const extraStyles = {
  chooseHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg },
  autoLink: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },
  dish: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, marginTop: 10 },
  dishOn: { borderColor: colors.saffron2, backgroundColor: "rgba(232,163,61,0.08)" },
  dishImg: { width: 56, height: 56, borderRadius: 8 },
  dishName: { fontSize: 14, fontWeight: "600", color: colors.ink, flexShrink: 1 },
  dishMeta: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  vegDot: { width: 12, height: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 6 },
  vegInner: { width: 6, height: 6, borderRadius: 3 },
  addSmall: { borderWidth: 1.5, borderColor: colors.saffron2, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  addSmallText: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.charcoal, borderRadius: 8 },
  stepBtn: { paddingHorizontal: 11, paddingVertical: 6 },
  stepTxt: { color: colors.paper, fontSize: 18, fontWeight: "700" },
  stepQty: { color: colors.paper, fontWeight: "700", minWidth: 34, textAlign: "center", fontSize: 13 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line },
  barCount: { fontSize: 12, color: colors.inkFaint },
  barTotal: { fontSize: 22, fontWeight: "800", color: colors.charcoal },
  barSub: { fontSize: 11, color: colors.inkFaint },
  checkoutBtn: { backgroundColor: colors.charcoal, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20 },
};

const styles = StyleSheet.create({
  ...extraStyles,
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