import React, { useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees, mealBoxCount } from "../utils";

// All meal boxes the shop has put together. Customers mix any boxes to reach the minimum number of meals.
export default function MealBoxesScreen({ navigation }) {
  const { items: cartItems, addItem } = useCart();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await api.listMealBoxes());
    } catch (e) {
      setError(e.message || "Could not load meal boxes");
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const minQty = data?.minQty || 10;
  const inCart = mealBoxCount(cartItems);
  const picked = Object.values(qty).reduce((a, b) => a + b, 0);
  const total = inCart + picked;
  const missing = Math.max(0, minQty - total);

  const bump = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  function addPicked() {
    for (const b of data.boxes) {
      const n = qty[b.id] || 0;
      if (n > 0) addItem(b, [], n);
    }
    setQty({});
    navigation.navigate("Cart");
  }

  if (!data && !error) return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={data?.boxes || []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Choose at least {minQty} meals in total. You can mix different boxes. Prices are before GST ({data?.gstPercent ?? 5}% is added at checkout).
          </Text>
        }
        ListEmptyComponent={<Text style={styles.empty}>{error || "No meal boxes yet. Please check back soon."}</Text>}
        renderItem={({ item: b }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => navigation.navigate("ItemDetail", { itemId: b.id })} activeOpacity={0.9}>
              {b.imageUrl ? (
                <Image source={{ uri: resolveImageUrl(b.imageUrl) }} style={styles.image} />
              ) : (
                <View style={[styles.image, { backgroundColor: colors.line }]} />
              )}
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <View style={[styles.dot, { backgroundColor: b.isVeg ? colors.basil : colors.chili }]} />
                  <Text style={styles.name} numberOfLines={1}>{b.name}</Text>
                </View>
                <Text style={styles.price}>{rupees(b.price)} <Text style={styles.gst}>+ GST · {b.mealBoxItems?.length || 0} dishes</Text></Text>
                <View style={styles.thumbs}>
                  {(b.mealBoxItems || []).slice(0, 5).map((m) => (
                    m.item?.imageUrl
                      ? <Image key={m.id} source={{ uri: resolveImageUrl(m.item.imageUrl) }} style={styles.thumb} />
                      : <View key={m.id} style={[styles.thumb, { backgroundColor: colors.line }]} />
                  ))}
                </View>
                <Text style={styles.link}>See what's inside →</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => bump(b.id, -1)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
              <Text style={styles.qty}>{qty[b.id] || 0}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => bump(b.id, 1)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barTitle}>{total} of {minQty} meals</Text>
          <Text style={[styles.barSub, missing === 0 && { color: colors.basil }]}>
            {missing === 0 ? "Minimum reached" : `Add ${missing} more to order`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cta, picked === 0 && inCart === 0 && { opacity: 0.5 }]}
          disabled={picked === 0 && inCart === 0}
          onPress={() => (picked > 0 ? addPicked() : navigation.navigate("Cart"))}
        >
          <Text style={styles.ctaText}>{picked > 0 ? "Add to cart" : "View cart"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  intro: { fontSize: 13, color: colors.inkFaint, marginBottom: spacing.md, lineHeight: 19 },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: 40 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md, overflow: "hidden" },
  image: { width: "100%", height: 150 },
  body: { padding: 12 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.ink },
  price: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 4 },
  gst: { fontSize: 12, fontWeight: "500", color: colors.inkFaint },
  thumbs: { flexDirection: "row", marginTop: 8 },
  thumb: { width: 38, height: 38, borderRadius: 8, marginRight: 6 },
  link: { fontSize: 12, color: colors.saffron2, marginTop: 8 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 12, paddingTop: 0 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, color: colors.ink },
  qty: { width: 40, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.ink },
  bar: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, padding: spacing.md,
  },
  barTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  barSub: { fontSize: 12, color: colors.chili, marginTop: 2 },
  cta: { backgroundColor: colors.saffron, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  ctaText: { color: colors.charcoal || colors.ink, fontWeight: "700", fontSize: 15 },
});
