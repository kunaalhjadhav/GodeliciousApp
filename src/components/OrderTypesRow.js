import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { api, API_URL } from "../api/client";
import { colors, spacing } from "../theme";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function OrderTypesRow({ navigation }) {
  const [orderTypes, setOrderTypes] = useState([]);

  useEffect(() => {
    api.listOrderTypes().then((d) => setOrderTypes(d.orderTypes)).catch(() => {});
  }, []);

  if (orderTypes.length === 0) return null;

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={orderTypes}
      keyExtractor={(ot) => ot.id}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      renderItem={({ item: ot }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("Booking", { orderTypeId: ot.id })}
        >
          {ot.imageUrl ? (
            <Image source={{ uri: resolveImageUrl(ot.imageUrl) }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
          <Text style={styles.name} numberOfLines={1}>{ot.name}</Text>
          <Text style={styles.cta}>Book →</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, marginRight: spacing.sm, backgroundColor: colors.white,
    borderRadius: 8, borderWidth: 1, borderColor: colors.line, overflow: "hidden",
    shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    elevation: 3,
  },
  image: { width: "100%", height: 80 },
  imagePlaceholder: { backgroundColor: colors.line },
  name: { fontSize: 13, fontWeight: "700", color: colors.ink, paddingHorizontal: 10, paddingTop: 8 },
  cta: { fontSize: 11, color: colors.saffron2, paddingHorizontal: 10, paddingBottom: 8, paddingTop: 2 },
});
