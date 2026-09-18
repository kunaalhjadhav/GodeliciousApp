import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

const STATUS_COLORS = {
  PENDING: colors.saffron2,
  CONFIRMED: "#2563EB",
  PREPARING: colors.saffron2,
  OUT_FOR_DELIVERY: "#2563EB",
  DELIVERED: colors.basil,
  CANCELLED: colors.chili,
};

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.myOrders().then((d) => setOrders(d.orders)).catch((e) => console.warn(e.message));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    Promise.resolve(load()).finally(() => setRefreshing(false));
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={orders}
      keyExtractor={(o) => o.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>You haven't placed any orders yet.</Text>}
      renderItem={({ item: order }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}>
          <View style={styles.rowBetween}>
            <Text style={[styles.status, { color: STATUS_COLORS[order.status] }]}>
              {order.status.replace(/_/g, " ")}
            </Text>
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.itemsSummary}>
            {order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}
          </Text>
          <Text style={styles.total}>₹{order.totalAmount.toFixed(0)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  status: { fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  date: { fontSize: 12, color: colors.inkFaint },
  itemsSummary: { fontSize: 13, color: colors.ink, marginBottom: 4 },
  total: { fontWeight: "700", color: colors.ink },
});
