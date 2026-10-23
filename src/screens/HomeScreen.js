import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, RefreshControl, TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees } from "../utils";
import BannerCarousel from "../components/BannerCarousel";
import ComboPickerModal from "../components/ComboPickerModal";
import OrderTypesRow from "../components/OrderTypesRow";
import ItemCard from "../components/ItemCard";
import {
  SectionTitle, NextDeliveryCard, CutoffBanner, FilterChips, OccasionPlanner, OffersStrip,
  OrderAgainStrip, BrandStrip, WeeklyBoxPromo, VenuesPromo, showCouponHint, MealBoxStrip,
} from "../components/HomeSections";

export default function HomeScreen({ navigation }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { refresh: refreshFavorites } = useFavorites();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [feed, setFeed] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comboItem, setComboItem] = useState(null);
  const { addItem, itemCount, totalAmount, setCouponDraft } = useCart();

  const FILTERS = [
    { key: "veg", label: t("veg_only") },
    { key: "under500", label: t("under_500") },
    { key: "weight", label: t("by_weight") },
    { key: "combo", label: t("combos") },
    { key: "best", label: t("bestsellers") },
  ];

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

  const loadMenu = useCallback(async (categoryId) => {
    try {
      const [catData, menuData] = await Promise.all([
        categories.length ? Promise.resolve({ categories }) : api.listCategories(),
        api.listMenu(categoryId),
      ]);
      if (!categories.length) setCategories(catData.categories);
      setItems(menuData.items);
    } catch (err) {
      console.warn("Failed to load menu:", err.message);
    }
  }, [categories]);

  const loadFeed = useCallback(async () => {
    try {
      setFeed(await api.home());
    } catch (err) {
      console.warn("Failed to load home feed:", err.message); // the menu still works without it
    }
  }, []);

  useEffect(() => {
    Promise.all([loadMenu(activeCategory), loadFeed()]).finally(() => { setLoading(false); setRefreshing(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, user?.id]);

  // Coming back to Home (after ordering, say) refreshes the delivery card and "order again"
  useFocusEffect(useCallback(() => { loadFeed(); refreshFavorites(); }, [loadFeed, refreshFavorites]));

  function onRefresh() {
    setRefreshing(true);
    Promise.all([loadMenu(activeCategory), loadFeed()]).finally(() => setRefreshing(false));
  }

  function toggleFilter(key) {
    setFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const bestIds = useMemo(() => new Set((feed?.bestsellers || []).map((b) => b.id)), [feed]);
  const needle = search.trim().toLowerCase();
  const filtered = needle.length > 0 || filters.length > 0;

  const visibleItems = useMemo(() => items.filter((i) => {
    if (needle && !`${i.name} ${i.brand?.name || ""} ${i.category?.name || ""}`.toLowerCase().includes(needle)) return false;
    if (filters.includes("veg") && !i.isVeg) return false;
    if (filters.includes("under500") && !(i.price < 500)) return false;
    if (filters.includes("weight") && !i.soldByWeight) return false;
    if (filters.includes("combo") && !i.isCombo) return false;
    if (filters.includes("best") && !bestIds.has(i.id)) return false;
    return true;
  }), [items, needle, filters, bestIds]);

  function addAgain(entry) {
    const mi = entry.menuItem;
    if (mi.isCombo) {
      navigation.navigate("ItemDetail", { itemId: mi.id }); // combo choices have to be picked again
    } else {
      addItem(mi, [], entry.quantity);
    }
  }

  function renderHeader() {
    return (
      <View>
        {!filtered && <BannerCarousel navigation={navigation} />}
        <View style={styles.header}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput} placeholder={t("search_ph")} placeholderTextColor={colors.inkFaint}
              value={search} onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginLeft: spacing.sm }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {!filtered && (
          <NextDeliveryCard
            delivery={feed?.nextDelivery}
            onPress={() => navigation.navigate("OrderDetail", { orderId: feed.nextDelivery.id })}
          />
        )}
        <CutoffBanner message={feed?.leadTime?.message} />
        <FilterChips filters={FILTERS} active={filters} onToggle={toggleFilter} />

        {filtered ? (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>{visibleItems.length} result{visibleItems.length === 1 ? "" : "s"}</Text>
            <TouchableOpacity onPress={() => { setSearch(""); setFilters([]); }}>
              <Text style={styles.clear}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <OrderTypesRow navigation={navigation} />
            <OccasionPlanner
              occasions={feed?.occasions || []}
              onPick={(o) => navigation.navigate("PartySize", { occasion: o.label, guests: o.guests, foodStyle: o.foodStyle })}
              onPlan={() => navigation.navigate("PartySize")}
            />
            <MealBoxStrip
              info={feed?.mealBoxes}
              onOpen={(b) => navigation.navigate("ItemDetail", { itemId: b.id })}
              onAll={() => navigation.navigate("MealBoxes")}
            />
            <OffersStrip
              offers={feed?.offers || []} cartTotal={totalAmount}
              onCoupon={(o) => { setCouponDraft(o.code); showCouponHint(o.code); }}
              onBrand={(o) => o.brandId && navigation.navigate("BrandDetail", { brandId: o.brandId, brandName: "Brand" })}
            />
            <OrderAgainStrip entries={feed?.orderAgain || []} onAdd={addAgain} />
            <BrandStrip
              brands={feed?.brands || []}
              onBrand={(b) => navigation.navigate("BrandDetail", { brandId: b.id, brandName: b.name })}
              onAll={() => navigation.navigate("Brands")}
            />
            <WeeklyBoxPromo info={feed?.weeklyBox} onPress={() => navigation.navigate("Subscribe")} />
            <VenuesPromo
              info={feed?.venues}
              onBrowse={() => navigation.navigate("Venues")}
              onRequests={() => navigation.navigate("MyVenueRequests")}
            />

            {(feed?.bestsellers || []).length > 0 && (
              <View>
                <SectionTitle title={t("bestsellers")} />
                <View style={{ paddingHorizontal: spacing.md }}>
                  {feed.bestsellers.map((b) => (
                    <ItemCard key={b.id} item={b} navigation={navigation} onAddPress={handleAddPress} />
                  ))}
                </View>
              </View>
            )}

            <SectionTitle title={t("all_dishes")} />
            <FlatList
              horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              data={[{ id: null, name: "All", imageUrl: null }, ...categories]}
              keyExtractor={(c) => c.id || "all"}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setActiveCategory(item.id)} style={styles.categoryCard}>
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
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.saffron2} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={visibleItems}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={{ paddingBottom: itemCount ? 90 : spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <ItemCard item={item} navigation={navigation} onAddPress={handleAddPress} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{filtered ? "Nothing matches. Try clearing a filter." : "No items in this category right now."}</Text>}
      />

      <ComboPickerModal visible={!!comboItem} item={comboItem} onConfirm={confirmCombo} onClose={() => setComboItem(null)} />

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.cartBarText}>{itemCount} item{itemCount > 1 ? "s" : ""} · {rupees(totalAmount)}</Text>
          <Text style={styles.cartBarAction}>View cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.charcoal, flexDirection: "row", alignItems: "center" },
  logo: { width: 32, height: 32, borderRadius: 6, marginRight: spacing.sm },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderRadius: 8, paddingHorizontal: 10, height: 38 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  resultsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  resultsText: { fontSize: 13, color: colors.inkFaint },
  clear: { fontSize: 13, color: colors.saffron2, fontWeight: "700" },
  categoryRow: { flexGrow: 0, paddingBottom: spacing.sm },
  categoryCard: { alignItems: "center", width: 72, marginHorizontal: 6 },
  categoryCircle: {
    width: 60, height: 60, borderRadius: 30, overflow: "hidden", backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line,
    justifyContent: "center", alignItems: "center",
  },
  categoryCircleActive: { borderColor: colors.saffron2 },
  categoryImage: { width: "100%", height: "100%" },
  categoryLabel: { fontSize: 11, color: colors.inkFaint, marginTop: 4, textAlign: "center" },
  categoryLabelActive: { color: colors.saffron2, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.charcoal,
    padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cartBarText: { color: colors.paper, fontWeight: "600" },
  cartBarAction: { color: colors.saffron, fontWeight: "600" },
});
