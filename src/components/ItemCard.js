import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { resolveImageUrl } from "../utils";
import { useFavorites } from "../context/FavoritesContext";
import { useLang } from "../i18n";

// One dish card used on the home screen (menu list and bestsellers).
export default function ItemCard({ item, navigation, onAddPress }) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useLang();
  const fav = isFavorite(item.id);
  const open = () => navigation.navigate("ItemDetail", { itemId: item.id });

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={open} activeOpacity={0.9}>
        {item.imageUrl ? (
          <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.line }]} />
        )}
        {item.soldByWeight && (
          <View style={styles.badge}><Text style={styles.badgeText}>PER KG</Text></View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.heart} onPress={() => toggle(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={fav ? "Remove from favourites" : "Add to favourites"}
      >
        <Text style={[styles.heartText, fav && { color: colors.chili }]}>{fav ? "♥" : "♡"}</Text>
      </TouchableOpacity>
      <View style={styles.body}>
        <TouchableOpacity onPress={open}>
          <View style={styles.titleRow}>
            <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            {item.isCombo && <View style={styles.combo}><Text style={styles.comboText}>COMBO</Text></View>}
          </View>
        </TouchableOpacity>
        {item.rating != null && (
          <Text style={styles.rating}>★ {item.rating.toFixed(1)} · {item.ratingCount} review{item.ratingCount === 1 ? "" : "s"}</Text>
        )}
        {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.footer}>
          <Text style={styles.price}>₹{item.price}{item.soldByWeight ? " / kg" : ""}<Text style={{ fontSize: 11, fontWeight: "500", color: colors.inkFaint }}> + GST</Text></Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAddPress(item)}>
            <Text style={styles.addText}>{item.isCombo || item.soldByWeight || item.isMealBox ? t("customize") : t("add")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, borderRadius: 14, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line,
    overflow: "hidden", shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  image: { width: "100%", height: 170 },
  badge: { position: "absolute", top: 10, left: 10, backgroundColor: colors.basil, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.paper },
  heart: {
    position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center",
  },
  heartText: { fontSize: 20, color: colors.ink, marginTop: -1 },
  body: { padding: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  vegDot: { width: 9, height: 9, borderRadius: 5, marginRight: 7 },
  title: { fontSize: 17, fontWeight: "600", color: colors.ink, flexShrink: 1 },
  combo: { backgroundColor: "rgba(232,163,61,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  comboText: { fontSize: 10, fontWeight: "700", color: colors.saffron2 },
  rating: { fontSize: 12, color: colors.saffron2, fontWeight: "600", marginBottom: 4 },
  desc: { fontSize: 13, color: colors.inkFaint, marginBottom: 10, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  price: { fontSize: 16, fontWeight: "700", color: colors.ink },
  addBtn: { backgroundColor: colors.saffron, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  addText: { color: colors.charcoal, fontWeight: "700", fontSize: 13 },
});
