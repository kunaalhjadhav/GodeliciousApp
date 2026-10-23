import React, { useEffect, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert,
} from "react-native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees, weightLabel, mealBoxCount } from "../utils";
import ComboPickerModal from "../components/ComboPickerModal";

const PRESETS = [1000, 1500, 2000];

export default function ItemDetailScreen({ route, navigation }) {
  const { itemId } = route.params;
  const { t } = useLang();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);
  const [grams, setGrams] = useState(1000);
  const [custom, setCustom] = useState(false);
  const [qty, setQty] = useState(1);
  const { addItem, items: cartItems } = useCart();
  const [boxMin, setBoxMin] = useState(10); // minimum meals per order (set by the shop)
  const { isFavorite, toggle } = useFavorites();

  const minG = item?.minOrderGrams > 0 ? item.minOrderGrams : 250;
  const presets = item ? [...new Set([minG, ...PRESETS.filter((g) => g > minG)])].slice(0, 3) : PRESETS;

  useEffect(() => {
    api.getMenuItem(itemId).then((d) => { setItem(d.item); if (d.item?.soldByWeight) setGrams(Math.max(250, d.item.minOrderGrams || 250)); })
      .catch((err) => Alert.alert("Couldn't load item", err.message)).finally(() => setLoading(false));
    api.itemReviews(itemId).then((d) => setReviews(d.reviews || [])).catch(() => {});
    api.getSettings().then((d) => setBoxMin(d.settings?.mealBoxMinQty || 10)).catch(() => {});
  }, [itemId]);

  // For a meal box, start the quantity at what is still needed to reach the minimum
  const inCartBoxes = mealBoxCount(cartItems);
  useEffect(() => {
    if (item?.isMealBox) setQty(Math.max(1, boxMin - inCartBoxes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, boxMin]);

  useEffect(() => {
    if (!item) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => toggle(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 24, color: isFavorite(item.id) ? colors.chili : colors.paper }}>
            {isFavorite(item.id) ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [item, isFavorite, toggle, navigation]);

  function handlePrimaryAction() {
    if (!item) return;
    if (item.soldByWeight) {
      addItem(item, [], Math.max(grams, minG));
      navigation.navigate("Cart");
      return;
    }
    if (item.isCombo && item.comboGroups?.length > 0) {
      setComboOpen(true);
      return;
    }
    addItem(item, [], qty);
    navigation.navigate("Cart");
  }

  function confirmCombo(selectedOptions) {
    addItem(item, selectedOptions, qty);
    setComboOpen(false);
    navigation.navigate("Cart");
  }

  if (loading || !item) {
    return <View style={styles.center}><ActivityIndicator color={colors.saffron2} /></View>;
  }

  const serves = item.servesPerUnit > 1 ? item.servesPerUnit : 0;
  const total = item.soldByWeight ? Math.round((item.price / 1000) * Math.max(grams, minG)) : item.price * qty;
  const guests = serves ? (item.soldByWeight ? Math.floor((grams / 1000) * serves) : qty * serves) : 0;
  const subtitle = [item.brand?.name ? `by ${item.brand.name}` : null, item.category?.name].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.imageWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: "#E6D8B9" }]} />
          )}
        </View>

        <View style={{ padding: spacing.lg }}>
          <View style={styles.titleRow}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
            <Text style={styles.title}>{item.name}</Text>
          </View>
          <View style={styles.metaRow}>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {item.rating != null && <Text style={styles.rating}>{item.rating.toFixed(1)} ★</Text>}
          </View>

          {!!item.description && <Text style={styles.description}>{item.description}</Text>}

          {item.isMealBox && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>What's in this box</Text>
              {(item.mealBoxItems || []).map((m) => (
                <View key={m.id} style={styles.dishCard}>
                  {m.item?.imageUrl ? (
                    <Image source={{ uri: resolveImageUrl(m.item.imageUrl) }} style={styles.dishImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.dishImage, { backgroundColor: "#E6D8B9" }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dishName} numberOfLines={2}>{m.item?.name}</Text>
                    {!!m.note && <Text style={styles.dishNote}>{m.note}</Text>}
                  </View>
                  <View style={[styles.vegDot, { backgroundColor: m.item?.isVeg ? colors.basil : colors.chili, marginRight: 0 }]} />
                </View>
              ))}
              {(item.mealBoxItems || []).length === 0 && <Text style={styles.hint}>The dishes in this box will be listed here.</Text>}
            </View>
          )}

          <View style={styles.chips}>
            {item.soldByWeight && <View style={styles.chip}><Text style={styles.chipText}>Sold by weight</Text></View>}
            <View style={styles.chip}><Text style={styles.chipText}>Order 15 hrs ahead</Text></View>
            {serves > 0 && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Serves {serves}{item.soldByWeight ? " per kg" : ""}</Text>
              </View>
            )}
            {item.isCombo && <View style={styles.chip}><Text style={styles.chipText}>Combo</Text></View>}
            {item.isMealBox && <View style={styles.chip}><Text style={styles.chipText}>Minimum {boxMin} meals per order</Text></View>}
          </View>

          <Text style={styles.price}>
            ₹{item.price}{item.soldByWeight ? " / kg" : item.isMealBox ? " per box" : ""}
            <Text style={styles.gstNote}>  + GST</Text>
          </Text>
          {item.isMealBox && (
            <Text style={[styles.hint, { marginHorizontal: 0, marginBottom: spacing.sm }]}>
              You can mix different meal boxes to reach {boxMin} meals.{inCartBoxes > 0 ? ` You already have ${inCartBoxes} in your cart.` : ""}
            </Text>
          )}

          {item.soldByWeight ? (
            <View>
              <Text style={styles.label}>Quantity</Text>
              {minG > 250 && <Text style={styles.hint}>Minimum order for this item: {weightLabel(minG)}.</Text>}
              <View style={styles.presetRow}>
                {presets.map((g) => (
                  <TouchableOpacity
                    key={g} onPress={() => { setGrams(g); setCustom(false); }}
                    style={[styles.preset, !custom && grams === g && styles.presetOn]}
                  >
                    <Text style={[styles.presetText, !custom && grams === g && styles.presetTextOn]}>{weightLabel(g)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setCustom(true)} style={[styles.preset, custom && styles.presetOn]}>
                  <Text style={[styles.presetText, custom && styles.presetTextOn]}>Custom</Text>
                </TouchableOpacity>
              </View>
              {custom && (
                <View style={styles.customRow}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setGrams((g) => Math.max(minG, g - 250))}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.gramsInput} value={String(grams)} keyboardType="number-pad"
                    onChangeText={(v) => setGrams(Number(v.replace(/\D/g, '')) || 0)}
                    onEndEditing={() => setGrams((g) => Math.max(minG, g))}
                  />
                  <Text style={styles.hint}>grams</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setGrams((g) => g + 250)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.qtyRow}>
              <Text style={styles.label}>Quantity</Text>
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => q + 1)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {guests > 0 && (
            <View style={styles.feedBox}>
              <Text style={styles.feedText}>
                {item.soldByWeight ? weightLabel(grams) : `${qty} ${qty === 1 ? "piece" : "pieces"}`} feeds about {guests} guests.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("PartySize")}>
                <Text style={styles.feedLink}>Use party planner</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{t("reviews")}</Text>
          {reviews.length === 0 ? (
            <Text style={styles.hint}>No reviews yet. Reviews appear after customers rate their delivered orders.</Text>
          ) : (
            reviews.slice(0, 4).map((r) => (
              <View key={r.id} style={styles.review}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.reviewName}>{r.name}</Text>
                  <Text style={styles.reviewStars}>{"★".repeat(r.rating)}<Text style={{ color: colors.line }}>{"★".repeat(5 - r.rating)}</Text></Text>
                </View>
                {!!r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <View>
          <Text style={styles.bottomQty}>{item.soldByWeight ? weightLabel(grams) : `${qty} x ${rupees(item.price)} + GST`}</Text>
          <Text style={styles.bottomTotal}>{rupees(total)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handlePrimaryAction}>
          <Text style={styles.addButtonText}>{item.isCombo && !item.soldByWeight ? "Customize & add" : t("add_to_cart")}</Text>
        </TouchableOpacity>
      </View>

      <ComboPickerModal visible={comboOpen} item={item} onConfirm={confirmCombo} onClose={() => setComboOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  imageWrap: { width: "100%", height: 260, backgroundColor: colors.line },
  image: { width: "100%", height: "100%" },
  titleRow: { flexDirection: "row", alignItems: "center" },
  vegDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: { fontSize: 24, fontWeight: "700", color: colors.charcoal, flexShrink: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.inkFaint, flexShrink: 1 },
  rating: { fontSize: 14, fontWeight: "700", color: colors.saffron2 },
  description: { fontSize: 14, color: colors.ink, lineHeight: 21, marginTop: spacing.sm },
  dishCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, padding: 8, marginBottom: 8,
  },
  dishImage: { width: 64, height: 64, borderRadius: 10, marginRight: 12 },
  dishName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  dishNote: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  gstNote: { fontSize: 12, fontWeight: "500", color: colors.inkFaint },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm },
  chip: { backgroundColor: "#F1EDE2", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  chipText: { fontSize: 12, color: colors.ink },
  price: { fontSize: 22, fontWeight: "700", color: colors.charcoal, marginTop: spacing.sm, marginBottom: spacing.md },
  label: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  presetRow: { flexDirection: "row", flexWrap: "wrap" },
  preset: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, marginBottom: 8 },
  presetOn: { borderColor: colors.saffron2, borderWidth: 1.5, backgroundColor: "rgba(232,163,61,0.14)" },
  presetText: { fontSize: 14, color: colors.ink },
  presetTextOn: { color: colors.saffron2, fontWeight: "700" },
  customRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line, justifyContent: "center", alignItems: "center" },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: colors.ink },
  gramsInput: { width: 84, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8, textAlign: "center", backgroundColor: colors.white, color: colors.ink, marginHorizontal: 8 },
  hint: { fontSize: 12, color: colors.inkFaint, marginHorizontal: 6 },
  qtyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyControl: { flexDirection: "row", alignItems: "center" },
  qtyText: { fontSize: 17, fontWeight: "700", minWidth: 36, textAlign: "center", color: colors.ink },
  feedBox: { backgroundColor: "rgba(47,82,51,0.10)", borderRadius: 10, padding: spacing.md, marginTop: spacing.sm },
  feedText: { fontSize: 14, color: colors.basil, fontWeight: "600" },
  feedLink: { fontSize: 13, color: colors.saffron2, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.charcoal, marginBottom: spacing.sm },
  review: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: spacing.md, marginBottom: 8 },
  reviewName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  reviewStars: { fontSize: 13, color: colors.saffron2 },
  reviewText: { fontSize: 13, color: colors.ink, marginTop: 4, lineHeight: 19 },
  bottom: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.line,
    paddingHorizontal: spacing.md, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  bottomQty: { fontSize: 12, color: colors.inkFaint },
  bottomTotal: { fontSize: 20, fontWeight: "700", color: colors.charcoal },
  addButton: { backgroundColor: colors.charcoal, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 26 },
  addButtonText: { color: colors.paper, fontWeight: "700", fontSize: 15 },
});
