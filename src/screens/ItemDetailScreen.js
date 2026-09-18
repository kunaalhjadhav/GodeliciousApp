import React, { useEffect, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert,
} from "react-native";
import { api, API_URL } from "../api/client";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import ComboPickerModal from "../components/ComboPickerModal";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function ItemDetailScreen({ route, navigation }) {
  const { itemId } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);
  const [grams, setGrams] = useState(250);
  const { addItem } = useCart();

  useEffect(() => {
    api.getMenuItem(itemId).then((d) => setItem(d.item))
      .catch((err) => Alert.alert("Couldn't load item", err.message)).finally(() => setLoading(false));
  }, [itemId]);

  function handlePrimaryAction() {
    if (!item) return;
    if (item.soldByWeight) {
      addItem(item, [], grams);
      navigation.navigate("Cart");
      return;
    }
    if (item.isCombo && item.comboGroups?.length > 0) {
      setComboOpen(true);
      return;
    }
    addItem(item);
    navigation.navigate("Cart");
  }

  function confirmCombo(selectedOptions) {
    addItem(item, selectedOptions);
    setComboOpen(false);
    navigation.navigate("Cart");
  }

  if (loading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron2} />
      </View>
    );
  }

  const weightTotal = item.soldByWeight ? ((item.price / 1000) * grams).toFixed(0) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.line }]} />
        )}
      </View>

      <View style={{ padding: spacing.lg }}>
        <View style={styles.titleRow}>
          <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.basil : colors.chili }]} />
          <Text style={styles.title}>{item.name}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginBottom: spacing.md }}>
          {item.isCombo && (
            <View style={styles.badge}><Text style={styles.badgeText}>COMBO</Text></View>
          )}
          {item.soldByWeight && (
            <View style={[styles.badge, { backgroundColor: "rgba(47,82,51,0.15)" }]}>
              <Text style={[styles.badgeText, { color: colors.basil }]}>SOLD PER KG</Text>
            </View>
          )}
          {item.category?.name && (
            <View style={[styles.badge, { backgroundColor: colors.line }]}>
              <Text style={[styles.badgeText, { color: colors.inkFaint }]}>{item.category.name}</Text>
            </View>
          )}
        </View>

        {!!item.description && <Text style={styles.description}>{item.description}</Text>}

        <Text style={styles.price}>₹{item.price}{item.soldByWeight ? " / kg" : ""}</Text>

        {item.soldByWeight && (
          <View style={styles.weightBox}>
            <Text style={styles.weightLabel}>Quantity (grams)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setGrams((g) => Math.max(250, g - 250))}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.gramsInput} value={String(grams)} keyboardType="number-pad"
                onChangeText={(t) => setGrams(Math.max(250, Number(t) || 0))}
              />
              <TouchableOpacity style={styles.stepBtn} onPress={() => setGrams((g) => g + 250)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.kgHint}>= {(grams / 1000).toFixed(2)} kg</Text>
            </View>
            <Text style={styles.lineTotal}>Line total: ₹{weightTotal}</Text>
            <Text style={styles.kgHint}>
              Your cart's total (across all items) needs to reach the store's minimum order value
              at checkout — this item doesn't need to hit it alone.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handlePrimaryAction}>
          <Text style={styles.addButtonText}>
            {item.soldByWeight ? "Add to cart" : item.isCombo ? "Customize & add" : "Add to cart"}
          </Text>
        </TouchableOpacity>
      </View>

      <ComboPickerModal visible={comboOpen} item={item} onConfirm={confirmCombo} onClose={() => setComboOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  imageWrap: { width: "100%", height: 320, backgroundColor: colors.paper, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%" },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  vegDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  badge: { backgroundColor: "rgba(232,163,61,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.saffron2 },
  description: { fontSize: 14, color: colors.inkFaint, lineHeight: 20, marginBottom: spacing.md },
  price: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  weightBox: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.line },
  weightLabel: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", marginBottom: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.line, justifyContent: "center", alignItems: "center" },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: colors.ink },
  gramsInput: { width: 80, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 8, textAlign: "center", backgroundColor: colors.white, color: colors.ink },
  kgHint: { fontSize: 11, color: colors.inkFaint, marginTop: 6 },
  lineTotal: { fontSize: 13, color: colors.ink, marginTop: 10, fontWeight: "600" },
  addButton: { backgroundColor: colors.saffron, borderRadius: 6, padding: 16, alignItems: "center" },
  addButtonText: { color: colors.charcoal, fontWeight: "700", fontSize: 15 },
});
