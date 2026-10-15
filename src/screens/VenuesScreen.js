import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees } from "../utils";

const UNIT = { EVENT: "event", DAY: "day", HOUR: "hour", PLATE: "plate" };

export default function VenuesScreen({ navigation }) {
  const { t } = useLang();
  const [venues, setVenues] = useState([]);
  const [q, setQ] = useState("");
  const [eventType, setEventType] = useState(null);
  const [types, setTypes] = useState([]); // event types seen across venues, for the chips
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);

  const load = useCallback((query, type) => {
    setError("");
    return api.listVenues({ q: query, eventType: type })
      .then((d) => {
        setVenues(d.venues);
        setLoaded(true);
        // Build the chip list from the unfiltered list so chips don't vanish while filtering
        if (!query && !type) setTypes([...new Set(d.venues.flatMap((v) => v.eventTypes))].slice(0, 8));
      })
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(useCallback(() => { load(q, eventType); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  // Search a moment after typing stops; chips apply straight away
  useEffect(() => {
    if (!loaded) return undefined;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q.trim(), eventType), 350);
    return () => clearTimeout(timer.current);
  }, [q, eventType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={venues}
      keyExtractor={(v) => v.id}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(q.trim(), eventType).finally(() => setRefreshing(false)); }} />}
      ListHeaderComponent={
        <View>
          <View style={styles.topRow}>
            <TextInput
              style={styles.search} placeholder="Search by area or venue name" placeholderTextColor={colors.inkFaint}
              value={q} onChangeText={setQ}
            />
            <TouchableOpacity onPress={() => navigation.navigate("MyVenueRequests")}>
              <Text style={styles.link}>{t("my_requests")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
            {[{ key: null, label: "All" }, ...types.map((x) => ({ key: x, label: x }))].map((c) => (
              <TouchableOpacity key={c.label} onPress={() => setEventType(c.key)} style={[styles.chip, eventType === c.key && styles.chipOn]}>
                <Text style={[styles.chipText, eventType === c.key && styles.chipTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={loaded ? <Text style={styles.empty}>No venues match yet.</Text> : null}
      renderItem={({ item: v }) => (
        <TouchableOpacity
          style={styles.card} activeOpacity={0.85}
          onPress={() => navigation.navigate("VenueDetail", { venueId: v.id, venueName: v.name })}
        >
          <View>
            {v.imageUrl ? <Image source={{ uri: resolveImageUrl(v.imageUrl) }} style={styles.image} resizeMode="cover" /> : <View style={[styles.image, { backgroundColor: "#E6D8B9" }]} />}
            <View style={styles.badge}><Text style={styles.badgeText}>Approved</Text></View>
          </View>
          <View style={{ padding: spacing.md }}>
            <Text style={styles.name}>{v.name}</Text>
            <Text style={styles.detail}>{[v.address, v.city].filter(Boolean).join(", ")} · up to {v.capacity} guests</Text>
            <View style={styles.tags}>
              {v.eventTypes.slice(0, 3).map((x) => <View key={x} style={styles.tag}><Text style={styles.tagText}>{x}</Text></View>)}
              {v.foodOptions.slice(0, 1).map((x) => <View key={x} style={styles.tag}><Text style={styles.tagText}>{x}</Text></View>)}
            </View>
            {v.startingFrom != null && (
              <Text style={styles.price}>
                Hall from <Text style={styles.priceNum}>{rupees(v.startingFrom)}</Text> / {UNIT[v.startingUnit] || "event"}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center" },
  search: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: colors.ink, marginRight: 10 },
  link: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  chipOn: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.paper, fontWeight: "700" },
  error: { color: colors.chili, marginBottom: spacing.sm },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 14, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  image: { width: "100%", height: 130 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: colors.charcoal, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  name: { fontSize: 18, fontWeight: "700", color: colors.charcoal },
  detail: { fontSize: 12, color: colors.inkFaint, marginTop: 3 },
  tags: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  tag: { backgroundColor: "#F1EDE2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  tagText: { fontSize: 11, color: colors.ink },
  price: { fontSize: 13, color: colors.ink, marginTop: 6 },
  priceNum: { fontSize: 16, fontWeight: "700", color: colors.saffron2 },
});
