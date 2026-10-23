import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { rupees, longDate, computeTotals } from "../utils";

// Monday first; the number is the weekday the server uses (0 = Sunday)
const DAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" },
  { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 0, label: "Sun" },
];
const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.n, d.label]));

function PlanCard({ plan, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    try { await fn(); await onChanged(); } catch (e) { Alert.alert("Couldn't update", e.message); } finally { setBusy(false); }
  }

  const paused = plan.status === "PAUSED";
  return (
    <View style={styles.planCard}>
      <View style={styles.planTop}>
        <Text style={styles.planTitle}>{plan.boxesPerDay} x {plan.menuItem?.name}</Text>
        <View style={[styles.statusPill, paused && { backgroundColor: "rgba(232,163,61,0.2)" }]}>
          <Text style={[styles.statusText, paused && { color: colors.saffron2 }]}>{plan.status}</Text>
        </View>
      </View>
      <Text style={styles.planSub}>{plan.days.map((d) => DAY_LABEL[d]).join(", ")} · {plan.timeSlot}</Text>
      <Text style={styles.planSub}>{rupees(plan.weekly?.total)} per week (incl. {plan.weekly?.gstPercent ?? 5}% GST)</Text>

      <Text style={[styles.label, { marginTop: spacing.md }]}>Upcoming deliveries</Text>
      {plan.upcoming.length === 0 ? (
        <Text style={styles.planSub}>{paused ? "Paused. Resume to schedule deliveries." : "No upcoming deliveries."}</Text>
      ) : plan.upcoming.slice(0, 4).map((u) => (
        <View key={u.date} style={styles.dateRow}>
          <Text style={[styles.dateText, u.skipped && { textDecorationLine: "line-through", color: colors.inkFaint }]}>
            {longDate(`${u.date}T12:00:00+05:30`)}
          </Text>
          {u.canChange ? (
            <TouchableOpacity disabled={busy} onPress={() => run(() => (u.skipped ? api.unskipSubscriptionDay(plan.id, u.date) : api.skipSubscriptionDay(plan.id, u.date)))}>
              <Text style={styles.skipText}>{u.skipped ? "Undo skip" : "Skip"}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.locked}>Locked</Text>
          )}
        </View>
      ))}

      <View style={styles.planActions}>
        {paused ? (
          <TouchableOpacity style={styles.smallBtn} disabled={busy} onPress={() => run(() => api.updateSubscription(plan.id, { status: "ACTIVE" }))}>
            <Text style={styles.smallBtnText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.smallBtn} disabled={busy}
            onPress={() => {
              const d = new Date(Date.now() + 5.5 * 3600 * 1000 + 7 * 86400000).toISOString().slice(0, 10);
              run(() => api.updateSubscription(plan.id, { status: "PAUSED", pausedUntil: d }));
            }}
          >
            <Text style={styles.smallBtnText}>Pause 1 week</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          disabled={busy}
          onPress={() => Alert.alert("Cancel this plan?", "Deliveries already scheduled for tomorrow stay. Nothing after that will be created.", [
            { text: "Keep plan", style: "cancel" },
            { text: "Cancel plan", style: "destructive", onPress: () => run(() => api.updateSubscription(plan.id, { status: "CANCELLED" })) },
          ])}
        >
          <Text style={styles.cancelText}>Cancel plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SubscribeScreen({ navigation }) {
  const { t } = useLang();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);       // { items, discountPct, slots, firstDelivery }
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [itemId, setItemId] = useState(null);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [slot, setSlot] = useState("12:30 PM");
  const [boxes, setBoxes] = useState(10);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pl, mine, addrs] = await Promise.all([api.subscriptionPlans(), api.mySubscriptions(), api.myAddresses().catch(() => ({ addresses: [] }))]);
      setInfo(pl);
      setPlans(mine.subscriptions);
      setItemId((cur) => cur || pl.items[0]?.id || null);
      const def = addrs.addresses.find((a) => a.isDefault) || addrs.addresses[0];
      if (def) { setAddress((cur) => cur || def.address); if (def.phone) setPhone((cur) => cur || def.phone); }
    } catch (e) {
      Alert.alert("Couldn't load", e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const item = info?.items.find((i) => i.id === itemId);
  const gross = item ? item.price * boxes * days.length : 0;
  const saving$ = info ? Math.round((gross * info.discountPct) / 100) : 0;
  // GST is added on top of the price after the weekly saving
  const gstPercent = info?.gstPercent ?? 5;
  const wk = computeTotals({ subtotal: gross, discount: saving$, gstPercent });
  const weekly = wk.total;
  const gst = wk.gst;

  function toggleDay(n) {
    setDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]));
  }

  async function start() {
    if (!item) return;
    if (days.length === 0) { Alert.alert("Pick days", "Choose at least one delivery day."); return; }
    if (!address.trim() || !phone.trim()) { Alert.alert("Missing info", "Delivery address and phone are required."); return; }
    setSaving(true);
    try {
      await api.createSubscription({ menuItemId: item.id, boxesPerDay: boxes, days, timeSlot: slot, address: address.trim(), phone: phone.trim() });
      Alert.alert("Plan started", "Your first delivery is scheduled. We create each day's order the evening before, and you pay on delivery.");
      await load();
    } catch (e) {
      Alert.alert("Couldn't start plan", e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.saffron2} /></View>;

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Lunch, on repeat</Text>
        <Text style={styles.heroSub}>
          Pick the days and the box. We deliver fresh and you pay on delivery. Skip or pause any day.
        </Text>
      </View>

      {plans.length > 0 && (
        <View>
          <Text style={[styles.label, { marginTop: spacing.lg }]}>Your plans</Text>
          {plans.map((p) => <PlanCard key={p.id} plan={p} onChanged={load} />)}
        </View>
      )}

      {!info || info.items.length === 0 ? (
        <Text style={styles.empty}>Weekly meal boxes are not open yet. Please check back soon.</Text>
      ) : (
        <View>
          <Text style={[styles.label, { marginTop: spacing.lg }]}>{plans.length ? "Start another plan" : "Set up your plan"}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Delivery days</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d) => (
                <TouchableOpacity key={d.n} onPress={() => toggleDay(d.n)} style={[styles.day, days.includes(d.n) && styles.dayOn]}>
                  <Text style={[styles.dayText, days.includes(d.n) && { color: colors.white, fontWeight: "700" }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Delivery time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {info.slots.map((s) => (
                <TouchableOpacity key={s} onPress={() => setSlot(s)} style={[styles.pill, slot === s && styles.pillOn]}>
                  <Text style={[styles.pillText, slot === s && styles.pillTextOn]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Box</Text>
            {info.items.map((i) => (
              <TouchableOpacity key={i.id} style={[styles.boxRow, itemId === i.id && styles.boxRowOn]} onPress={() => setItemId(i.id)}>
                <View style={[styles.radio, itemId === i.id && styles.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.boxName}>{i.name}</Text>
                  {!!i.description && <Text style={styles.boxDesc} numberOfLines={1}>{i.description}</Text>}
                </View>
                <Text style={styles.boxPrice}>{rupees(i.price)}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.stepRow}>
              <Text style={styles.boxName}>Boxes per day</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setBoxes((b) => Math.max(1, b - 1))}><Text style={styles.stepText}>−</Text></TouchableOpacity>
                <Text style={styles.stepNum}>{boxes}</Text>
                <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.charcoal }]} onPress={() => setBoxes((b) => Math.min(500, b + 1))}>
                  <Text style={[styles.stepText, { color: colors.white }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Deliver to</Text>
            <TextInput
              style={[styles.input, { height: 64 }]} multiline value={address} onChangeText={setAddress}
              placeholder="Office or home address" placeholderTextColor={colors.inkFaint}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad"
              placeholder="Phone number" placeholderTextColor={colors.inkFaint}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.sumRow}><Text style={styles.sumText}>{boxes} boxes x {days.length} days x {rupees(item?.price || 0)}</Text><Text style={styles.sumText}>{rupees(gross)}</Text></View>
            {saving$ > 0 && (
              <View style={styles.sumRow}><Text style={[styles.sumText, { color: colors.basil }]}>Weekly plan saving ({Math.round(info.discountPct)}%)</Text><Text style={[styles.sumText, { color: colors.basil }]}>−{rupees(saving$)}</Text></View>
            )}
            <View style={styles.sumRow}><Text style={styles.sumText}>GST ({gstPercent}%)</Text><Text style={styles.sumText}>{rupees(gst)}</Text></View>
            <View style={[styles.sumRow, styles.sumTotal]}><Text style={styles.sumTotalText}>Per week (incl. GST)</Text><Text style={styles.sumTotalText}>{rupees(weekly)}</Text></View>
          </View>
          <Text style={styles.fine}>
            First delivery {longDate(`${info.firstDelivery}T12:00:00+05:30`)} or the next day you picked. Skip or pause before 6 PM the day before.
          </Text>

          <TouchableOpacity style={[styles.startBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={start}>
            <Text style={styles.startText}>{saving ? "Starting…" : t("start_plan")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  hero: { backgroundColor: colors.basil, borderRadius: 14, padding: spacing.md },
  heroTitle: { fontSize: 22, fontWeight: "700", color: colors.white },
  heroSub: { fontSize: 13, color: "#CFE2C8", marginTop: 4, lineHeight: 19 },
  label: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  dayRow: { flexDirection: "row", justifyContent: "space-between" },
  day: { width: 42, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  dayOn: { backgroundColor: colors.basil, borderColor: colors.basil },
  dayText: { fontSize: 12, color: colors.inkFaint },
  pill: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  pillOn: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.14)" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextOn: { color: colors.saffron2, fontWeight: "700" },
  boxRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 4 },
  boxRowOn: { borderColor: colors.saffron2, backgroundColor: "rgba(232,163,61,0.08)" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, marginRight: 10 },
  radioOn: { borderColor: colors.saffron2, backgroundColor: colors.saffron },
  boxName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  boxDesc: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  boxPrice: { fontSize: 15, fontWeight: "700", color: colors.ink },
  stepRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: "#EDE8DC" },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 18, color: colors.ink, marginTop: -2 },
  stepNum: { fontSize: 16, fontWeight: "700", minWidth: 40, textAlign: "center", color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, fontSize: 14, color: colors.ink, backgroundColor: colors.white },
  sumRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sumText: { fontSize: 14, color: colors.ink, flexShrink: 1, paddingRight: 8 },
  sumTotal: { borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  sumTotalText: { fontSize: 16, fontWeight: "700", color: colors.ink },
  fine: { fontSize: 12, color: colors.inkFaint, textAlign: "center", marginVertical: spacing.sm },
  startBtn: { backgroundColor: colors.charcoal, borderRadius: 12, padding: 16, alignItems: "center" },
  startText: { color: colors.paper, fontWeight: "700", fontSize: 15 },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  planCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  planTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  statusPill: { backgroundColor: "rgba(47,82,51,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.basil },
  planSub: { fontSize: 13, color: colors.inkFaint, marginTop: 3 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderColor: "#EDE8DC" },
  dateText: { fontSize: 14, color: colors.ink },
  skipText: { fontSize: 13, color: colors.saffron2, fontWeight: "700" },
  locked: { fontSize: 12, color: colors.inkFaint },
  planActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  smallBtn: { borderWidth: 1.5, borderColor: colors.charcoal, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  smallBtnText: { fontSize: 13, fontWeight: "700", color: colors.charcoal },
  cancelText: { fontSize: 13, color: colors.chili, fontWeight: "600" },
});
