import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

const LABELS = ["Home", "Office", "Venue"];

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState([]);
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.myAddresses().then((d) => setAddresses(d.addresses)).catch((e) => Alert.alert("Couldn't load", e.message)), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    if (address.trim().length < 6) { Alert.alert("Address needed", "Type the full address."); return; }
    setSaving(true);
    try {
      await api.addAddress({ label, address: address.trim(), phone: phone.trim() || undefined });
      setAddress(""); setPhone("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  }

  function remove(a) {
    Alert.alert(`Delete "${a.label}"?`, a.address, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => api.deleteAddress(a.id).then(load).catch((e) => Alert.alert("Couldn't delete", e.message)) },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      {addresses.map((a) => (
        <View key={a.id} style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.label}>{a.label}</Text>
            {a.isDefault && <View style={styles.def}><Text style={styles.defText}>DEFAULT</Text></View>}
          </View>
          <Text style={styles.addr}>{a.address}</Text>
          {!!a.phone && <Text style={styles.phone}>{a.phone}</Text>}
          <View style={styles.actions}>
            {!a.isDefault && (
              <TouchableOpacity onPress={() => api.updateAddress(a.id, { isDefault: true }).then(load)}>
                <Text style={styles.link}>Make default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => remove(a)}><Text style={styles.del}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {addresses.length === 0 && <Text style={styles.empty}>No saved addresses yet. Add one below, or save one at checkout.</Text>}

      <View style={styles.card}>
        <Text style={styles.cap}>Add an address</Text>
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {LABELS.map((l) => (
            <TouchableOpacity key={l} onPress={() => setLabel(l)} style={[styles.pill, label === l && styles.pillOn]}>
              <Text style={[styles.pillText, label === l && styles.pillTextOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { height: 70 }]} multiline value={address} onChangeText={setAddress}
          placeholder="House or flat no, street, area, city, pincode" placeholderTextColor={colors.inkFaint}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad"
          placeholder="Contact phone (optional)" placeholderTextColor={colors.inkFaint}
        />
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} disabled={saving} onPress={add}>
          <Text style={styles.btnText}>{saving ? "Saving…" : "Save address"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  top: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 16, fontWeight: "700", color: colors.ink },
  def: { backgroundColor: "rgba(47,82,51,0.12)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  defText: { fontSize: 10, fontWeight: "800", color: colors.basil },
  addr: { fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 20 },
  phone: { fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  link: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },
  del: { color: colors.chili, fontWeight: "600", fontSize: 13 },
  empty: { textAlign: "center", color: colors.inkFaint, marginVertical: spacing.lg, fontSize: 13 },
  cap: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 10 },
  pill: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, marginRight: 8, backgroundColor: colors.white },
  pillOn: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.14)" },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextOn: { color: colors.saffron2, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, fontSize: 14, color: colors.ink },
  btn: { backgroundColor: colors.charcoal, borderRadius: 10, padding: 14, alignItems: "center", marginTop: spacing.md },
  btnText: { color: colors.paper, fontWeight: "700" },
});
