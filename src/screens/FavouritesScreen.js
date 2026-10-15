import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, Alert, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees } from "../utils";

const isBuyable = (mi) => mi.isAvailable && mi.stockQty > 0;

export default function FavouritesScreen({ navigation }) {
  const { t } = useLang();
  const { addItem } = useCart();
  const { toggle, refresh } = useFavorites();
  const [favs, setFavs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState(null);

  const load = useCallback(() => api.myFavorites().then((d) => { setFavs(d.favorites); setLoaded(true); }).catch((e) => console.warn(e.message)), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = useMemo(() => [...new Set(favs.map((f) => f.menuItem?.category?.name).filter(Boolean))], [favs]);
  const shown = favs.filter((f) => f.menuItem && (!category || f.menuItem.category?.name === category));

  // Weight items go in at 1 kg; combos need their options picked, so they open the item page.
  function addOne(mi) {
    if (mi.isCombo) { navigation.navigate("ItemDetail", { itemId: mi.id }); return false; }
    addItem(mi, [], mi.soldByWeight ? 1000 : 1);
    return true;
  }

  function addAll() {
    const ready = shown.filter((f) => isBuyable(f.menuItem));
    let added = 0;
    let skipped = 0;
    for (const f of ready) {
      if (f.menuItem.isCombo) { skipped += 1; continue; }
      addOne(f.menuItem);
      added += 1;
    }
    if (added === 0) { Alert.alert("Nothing to add", skipped ? "Combos need their options picked. Open each one to add it." : "None of these are available right now."); return; }
    if (skipped) Alert.alert("Added to cart", `${added} added. ${skipped} combo${skipped > 1 ? "s need" : " needs"} its options picked on its own page.`);
    navigation.navigate("Cart");
  }

  async function remove(f) {
    setFavs((prev) => prev.filter((x) => x.id !== f.id));
    await toggle(f.menuItemId);
    refresh();
  }

  async function toggleNotify(f) {
    const next = !f.notifyWhenBack;
    setFavs((prev) => prev.map((x) => (x.id === f.id ? { ...x, notifyWhenBack: next } : x)));
    try { await api.setFavoriteNotify(f.menuItemId, next); } catch (e) { load(); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={shown}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />}
        ListHeaderComponent={
          favs.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {[{ key: null, label: `All ${favs.length}` }, ...categories.map((c) => ({ key: c, label: c }))].map((c) => (
                <TouchableOpacity key={c.label} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipOn]}>
                  <Text style={[styles.chipText, category === c.key && styles.chipTextOn]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySub}>Tap the heart on any dish to keep it here for quick reordering.</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Home")}><Text style={styles.link}>Browse the menu →</Text></TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item: f }) => {
          const mi = f.menuItem;
          const ok = isBuyable(mi);
          return (
            <View style={[styles.row, !ok && { opacity: 0.8 }]}>
              <TouchableOpacity onPress={() => navigation.navigate("ItemDetail", { itemId: mi.id })}>
                {mi.imageUrl ? <Image source={{ uri: resolveImageUrl(mi.imageUrl) }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: "#E6D8B9" }]} />}
              </TouchableOpacity>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.name} numberOfLines={1}>{mi.name}</Text>
                {ok ? (
                  <Text style={styles.sub}>{rupees(mi.price)}{mi.soldByWeight ? " / kg" : ""}{mi.rating != null ? ` · ${mi.rating.toFixed(1)} rating` : ""}</Text>
                ) : (
                  <Text style={[styles.sub, { color: colors.chili }]}>Not available this week</Text>
                )}
                <TouchableOpacity onPress={() => remove(f)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
              </View>
              {ok ? (
                <TouchableOpacity style={styles.addBtn} onPress={() => { if (addOne(mi)) navigation.navigate("Cart"); }}>
                  <Text style={styles.addText}>{mi.isCombo ? t("customize") : t("add")}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => toggleNotify(f)}>
                  <Text style={styles.notify}>{f.notifyWhenBack ? "We will tell you ✓" : t("notify_me")}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          shown.some((f) => isBuyable(f.menuItem)) ? (
            <TouchableOpacity style={styles.addAll} onPress={addAll}><Text style={styles.addAllText}>{t("add_all_available")}</Text></TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  chipOn: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.paper, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 10 },
  thumb: { width: 68, height: 68, borderRadius: 10 },
  name: { fontSize: 14, fontWeight: "600", color: colors.ink },
  sub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  removeText: { fontSize: 12, color: colors.inkFaint, marginTop: 6, textDecorationLine: "underline" },
  addBtn: { borderWidth: 1.5, borderColor: colors.saffron2, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  addText: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },
  notify: { fontSize: 12, color: colors.saffron2, fontWeight: "700", maxWidth: 90, textAlign: "right" },
  addAll: { backgroundColor: colors.charcoal, borderRadius: 12, padding: 14, alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
  addAllText: { color: colors.paper, fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", marginTop: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  emptySub: { fontSize: 13, color: colors.inkFaint, textAlign: "center", marginVertical: spacing.sm },
  link: { color: colors.saffron2, fontWeight: "700" },
});
