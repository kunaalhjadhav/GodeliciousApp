import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { api, API_URL } from "../api/client";
import { colors, spacing } from "../theme";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BrandsScreen({ navigation }) {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    api.listBrandsPublic().then((d) => setBrands(d.brands)).catch(() => {});
  }, []);

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={brands}
      keyExtractor={(b) => b.id}
      numColumns={2}
      columnWrapperStyle={{ gap: spacing.sm }}
      ListEmptyComponent={<Text style={styles.empty}>No brand partners available right now.</Text>}
      renderItem={({ item: brand }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("BrandDetail", { brandId: brand.id, brandName: brand.name })}
        >
          {brand.logoUrl ? (
            <Image source={{ uri: resolveImageUrl(brand.logoUrl) }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
          <View style={{ padding: spacing.sm }}>
            <Text style={styles.name}>{brand.name}</Text>
            <Text style={styles.cta}>View combos →</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: {
    flex: 1, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.line,
    marginBottom: spacing.sm, overflow: "hidden",
    shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  image: { width: "100%", height: 90 },
  imagePlaceholder: { backgroundColor: colors.line },
  name: { fontSize: 14, fontWeight: "700", color: colors.ink },
  cta: { fontSize: 11, color: colors.saffron2, marginTop: 2 },
});
