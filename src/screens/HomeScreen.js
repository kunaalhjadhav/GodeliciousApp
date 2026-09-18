import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, RefreshControl, TextInput,
} from "react-native";
import { api, API_URL } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import BannerCarousel from "../components/BannerCarousel";
import ComboPickerModal from "../components/ComboPickerModal";
import OrderTypesRow from "../components/OrderTypesRow";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comboItem, setComboItem] = useState(null);
  const { addItem, itemCount, totalAmount } = useCart();

  function handleAddPress(item) {
    if (item.soldByWeight) {
      navigation.navigate("ItemDetail", { itemId: item.id });
    } else if (item.isCombo && item.comboGroups?.length > 0) {
      setComboItem(item);
    } else {
      addItem(item);
    }
  }

  function confirmCombo(selectedOptions) {
    addItem(comboItem, selectedOptions);
    setComboItem(null);
  }

  const load = useCallback(async (categoryId) => {
    try {
      const [catData, menuData] = await Promise.all([
        categories.length ? Promise.resolve({ categories }) : api.listCategories(),
        api.listMenu(categoryId),
      ]);
      if (!categories.length) setCategories(catData.categories);
      setItems(menuData.items);
    } catch (err) {
      console.warn("Failed to load menu:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categories]);

  useEffect(() => {
    load(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function onRefresh() {
    setRefreshing(true);
    load(activeCategory);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron2} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <BannerCarousel navigation={navigation} />
      <View style={styles.header}>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items…"
            placeholderTextColor={colors.inkFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginLeft: spacing.sm }}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("Brands")} style={{ marginRight: spacing.md }}>
          <Text style={styles.venueLink}>Brand Partners</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("VenueEnquiry")}>
          <Text style={styles.venueLink}>Venue →</Text>
        </TouchableOpacity>
      </View>

      <OrderTypesRow navigation={navigation} />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        data={[{ id: null, name: "All", imageUrl: null }, ...categories]}
        keyExtractor={(c) => c.id || "all"}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.id)}
            style={styles.categoryCard}
          >
            <View style={[styles.categoryCircle, activeCategory === item.id && styles.categoryCircleActive]}>
              {item.imageUrl ? (
                <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.categoryImage} />
              ) : (
                <Text style={{ fontSize: 22 }}>{item.id === null ? "🍴" : "🍽️"}</Text>
              )}
            </View>
            <Text style={[styles.categoryLabel, activeCategory === item.id && styles.categoryLabelActive]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: itemCount ? 90 : spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}>
              {item.imageUrl ? (
                <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.isCombo && (
                    <View style={styles.comboBadge}>
                      <Text style={styles.comboBadgeText}>COMBO</Text>
                    </View>
                  )}
                  {item.soldByWeight && (
                    <View style={[styles.comboBadge, { backgroundColor: "rgba(47,82,51,0.15)" }]}>
                      <Text style={[styles.comboBadgeText, { color: colors.basil }]}>PER KG</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>₹{item.price}{item.soldByWeight ? "/kg" : ""}</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => handleAddPress(item)}>
                  <Text style={styles.addButtonText}>{item.isCombo || item.soldByWeight ? "Customize" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items in this category right now.</Text>}
      />

      <ComboPickerModal
        visible={!!comboItem}
        item={comboItem}
        onConfirm={confirmCombo}
        onClose={() => setComboItem(null)}
      />

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.cartBarText}>{itemCount} item{itemCount > 1 ? "s" : ""} · ₹{totalAmount.toFixed(0)}</Text>
          <Text style={styles.cartBarAction}>View cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.charcoal,
    flexDirection: "row", alignItems: "center",
  },
  logo: { width: 32, height: 32, borderRadius: 6, marginRight: spacing.sm },
  searchWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.paper,
    borderRadius: 8, paddingHorizontal: 10, height: 38,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  subHeader: {
    flexDirection: "row", paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.charcoal2 || colors.charcoal,
  },
  brand: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  venueLink: { color: colors.saffron, fontSize: 13 },
  categoryRow: { flexGrow: 0, paddingVertical: spacing.sm },
  categoryCard: { alignItems: "center", width: 72, marginHorizontal: 6 },
  categoryCircle: {
    width: 60, height: 60, borderRadius: 30, overflow: "hidden",
    backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line,
    justifyContent: "center", alignItems: "center",
  },
  categoryCircleActive: { borderColor: colors.saffron2 },
  categoryImage: { width: "100%", height: "100%" },
  categoryLabel: { fontSize: 11, color: colors.inkFaint, marginTop: 4, textAlign: "center" },
  categoryLabelActive: { color: colors.saffron2, fontWeight: "700" },
  card: {
    flexDirection: "row", backgroundColor: colors.white, borderRadius: 8, marginBottom: spacing.sm,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.line,
    shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  cardImage: { width: 64, height: 64, borderRadius: 4, marginRight: spacing.sm },
  cardImagePlaceholder: { backgroundColor: colors.line },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  vegDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  comboBadge: { backgroundColor: "rgba(232,163,61,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 6 },
  comboBadgeText: { fontSize: 9, fontWeight: "700", color: colors.saffron2 },
  cardDesc: { fontSize: 12, color: colors.inkFaint, marginBottom: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { fontSize: 14, fontWeight: "600", color: colors.ink },
  addButton: { backgroundColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 4 },
  addButtonText: { color: colors.charcoal, fontWeight: "700", fontSize: 12 },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.charcoal,
    padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cartBarText: { color: colors.paper, fontWeight: "600" },
  cartBarAction: { color: colors.saffron, fontWeight: "600" },
});
