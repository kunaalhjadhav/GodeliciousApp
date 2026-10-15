import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Share, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import { isPushEnabled, setPushEnabled, pushAvailable } from "../push";
import { colors, spacing } from "../theme";
import { rupees } from "../utils";
import { APP_NAME } from "../brand";

function Row({ label, value, onPress, last }) {
  return (
    <TouchableOpacity style={[styles.row, last && { borderBottomWidth: 0 }]} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : onPress ? <Text style={styles.chev}>›</Text> : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const [loyalty, setLoyalty] = useState(null);
  const [plans, setPlans] = useState([]);
  const [addrCount, setAddrCount] = useState(0);
  const [pushOn, setPushOn] = useState(true);
  const [code, setCode] = useState("");

  const load = useCallback(() => {
    api.myLoyalty().then(setLoyalty).catch(() => {});
    api.mySubscriptions().then((d) => setPlans(d.subscriptions)).catch(() => {});
    api.myAddresses().then((d) => setAddrCount(d.addresses.length)).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { isPushEnabled().then(setPushOn); }, []);

  // Most of these screens live in the Menu tab's stack, so go there first
  const go = (screen, params) => navigation.navigate("MenuTab", { screen, params });

  async function shareCode() {
    if (!loyalty) return;
    try {
      await Share.share({
        message: `Order from ${APP_NAME} with my code ${loyalty.referralCode} and we both get Rs ${loyalty.referralBonusRupees} in reward points after your first delivery.`,
      });
    } catch (e) { /* share sheet dismissed */ }
  }

  async function applyCode() {
    if (!code.trim()) return;
    try {
      const r = await api.applyReferral(code.trim());
      Alert.alert("Done", r.message);
      setCode("");
      load();
    } catch (e) {
      Alert.alert("Couldn't apply", e.message);
    }
  }

  function togglePush(v) {
    setPushOn(v);
    if (!pushAvailable()) {
      Alert.alert("Not set up yet", "Push alerts are not set up in this build of the app.");
    }
    setPushEnabled(v, api.registerDevice, api.unregisterDevice);
  }

  const activePlans = plans.filter((p) => p.status === "ACTIVE").length;

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text></View>
        <View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.contact}>{user?.phone || user?.email}</Text>
        </View>
      </View>

      <View style={{ padding: spacing.md }}>
        <View style={styles.statRow}>
          <View style={[styles.stat, { backgroundColor: colors.basil }]}>
            <Text style={[styles.statLabel, { color: "#CFE2C8" }]}>{t("profile_points").toUpperCase()}</Text>
            <Text style={[styles.statNum, { color: colors.white }]}>{loyalty ? loyalty.points : "-"}</Text>
            <Text style={[styles.statSub, { color: "#CFE2C8" }]}>{loyalty ? `Worth ${rupees(loyalty.rupeeValue)} off` : " "}</Text>
          </View>
          <TouchableOpacity style={styles.stat} onPress={shareCode} activeOpacity={0.85}>
            <Text style={styles.statLabel}>{t("refer_friend").toUpperCase()}</Text>
            <Text style={[styles.statNum, { color: colors.saffron2 }]}>{loyalty ? rupees(loyalty.referralBonusRupees) : "-"}</Text>
            <Text style={styles.statSub}>{loyalty ? `Code ${loyalty.referralCode}. Tap to share` : " "}</Text>
          </TouchableOpacity>
        </View>
        {loyalty && loyalty.referredCount > 0 && (
          <Text style={styles.small}>{loyalty.referredCount} friend{loyalty.referredCount > 1 ? "s" : ""} joined with your code.</Text>
        )}

        {loyalty && !loyalty.alreadyReferred && (
          <View style={styles.card}>
            <Text style={styles.cap}>Have a friend's code?</Text>
            <View style={{ flexDirection: "row" }}>
              <TextInput
                style={styles.input} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters"
                placeholder="Enter code" placeholderTextColor={colors.inkFaint}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={applyCode}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.card, { paddingVertical: 4 }]}>
          <Row label={t("my_orders")} onPress={() => navigation.navigate("OrdersTab")} />
          <Row label={t("favourites")} onPress={() => go("Favourites")} />
          <Row label={t("weekly_box")} value={activePlans ? "Active" : null} onPress={() => go("Subscribe")} />
          <Row label={t("my_venue_requests")} onPress={() => go("MyVenueRequests")} />
          <Row label={t("saved_addresses")} value={addrCount ? String(addrCount) : null} onPress={() => go("SavedAddresses")} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cap}>{t("language")}</Text>
          <View style={styles.seg}>
            {[{ k: "en", l: "English" }, { k: "kn", l: "ಕನ್ನಡ" }].map((o) => (
              <TouchableOpacity key={o.k} style={[styles.segItem, lang === o.k && styles.segOn]} onPress={() => setLang(o.k)}>
                <Text style={[styles.segText, lang === o.k && { color: colors.white, fontWeight: "700" }]}>{o.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>{t("alerts")}</Text>
            <Switch value={pushOn} onValueChange={togglePush} trackColor={{ true: colors.basil, false: colors.line }} />
          </View>
        </View>

        <View style={[styles.card, { paddingVertical: 4 }]}>
          <Row label={t("help_support")} onPress={() => navigation.navigate("ChatTab")} />
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={logout}>
            <Text style={[styles.rowLabel, { color: colors.chili, fontWeight: "600" }]}>{t("log_out")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.charcoal, flexDirection: "row", alignItems: "center", padding: spacing.md, paddingTop: spacing.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: "700", color: colors.charcoal },
  name: { fontSize: 20, fontWeight: "700", color: colors.paper },
  contact: { fontSize: 12, color: "#CFC9B8", marginTop: 2 },
  statRow: { flexDirection: "row", marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginHorizontal: 4 },
  statLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, color: colors.inkFaint },
  statNum: { fontSize: 28, fontWeight: "700", marginTop: 4, color: colors.charcoal },
  statSub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  small: { fontSize: 12, color: colors.inkFaint, textAlign: "center", marginBottom: spacing.sm },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  cap: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#EDE8DC" },
  rowLabel: { fontSize: 14, color: colors.ink },
  rowValue: { fontSize: 12, color: colors.basil, fontWeight: "700" },
  chev: { fontSize: 20, color: colors.inkFaint },
  seg: { flexDirection: "row", backgroundColor: "#F1EDE2", borderRadius: 10, padding: 3 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8 },
  segOn: { backgroundColor: colors.charcoal },
  segText: { fontSize: 14, color: colors.ink },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, marginRight: 8 },
  applyBtn: { backgroundColor: colors.charcoal, borderRadius: 8, paddingHorizontal: 18, justifyContent: "center" },
  applyText: { color: colors.paper, fontWeight: "700" },
});
