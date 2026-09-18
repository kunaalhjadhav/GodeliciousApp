import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { api, API_URL } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import ComboPickerModal from "../components/ComboPickerModal";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BrandDetailScreen({ route }) {
  const { brandId } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comboItem, setComboItem] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    api.listMenuByBrand(brandId).then((d) => setItems(d.items)).catch(() => {}).finally(() => setLoading(false));
  }, [brandId]);

  function handleAddPress(item) {
    if (item.isCombo && item.comboGroups?.length > 0) {
      setComboItem(item);
    } else {
      addItem(item);
    }
  }

  function confirmCombo(selectedOptions) {
    addItem(comboItem, selectedOptions);
    setComboItem(null);
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
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<Text style={styles.empty}>This brand doesn't have any items listed yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? (
              <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.isCombo && (
                  <View style={styles.comboBadge}>
                    <Text style={styles.comboBadgeText}>COMBO</Text>
                  </View>
                )}
              </View>
              {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>₹{item.price}</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => handleAddPress(item)}>
                  <Text style={styles.addButtonText}>{item.isCombo ? "Customize" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <ComboPickerModal
        visible={!!comboItem}
        item={comboItem}
        onConfirm={confirmCombo}
        onClose={() => setComboItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: {
    flexDirection: "row", backgroundColor: colors.white, borderRadius: 6, marginBottom: spacing.sm,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.line,
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
});
