import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";

export default function CartScreen({ navigation }) {
  const { items, totalAmount, addItem, decrementItem, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Text style={styles.link}>Browse the menu →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={items}
        keyExtractor={(line) => line.key}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item: line }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{line.menuItem.name}</Text>
              {line.selectedOptions?.length > 0 && (
                <Text style={styles.options}>
                  {line.selectedOptions.map((o) => o.optionLabel).join(", ")}
                </Text>
              )}
              <Text style={styles.price}>
                {line.menuItem.soldByWeight ? `₹${line.menuItem.price} / kg` : `₹${line.unitPrice} each`}
              </Text>
            </View>
            {line.menuItem.soldByWeight ? (
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(line.key, Math.max(250, line.quantity - 250))}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{line.quantity}g</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(line.key, line.quantity + 250)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => decrementItem(line.key)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{line.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(line.menuItem, line.selectedOptions)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => removeItem(line.key)} style={{ marginLeft: spacing.sm }}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toFixed(0)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate("Checkout")}>
          <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  emptyText: { color: colors.inkFaint, marginBottom: spacing.sm },
  link: { color: colors.saffron2, fontWeight: "600" },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 6,
    padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  options: { fontSize: 11, color: colors.inkFaint },
  price: { fontSize: 12, color: colors.inkFaint },
  qtyControl: { flexDirection: "row", alignItems: "center" },
  qtyBtn: { width: 28, height: 28, borderRadius: 4, backgroundColor: colors.line, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 16, color: colors.ink },
  qtyText: { marginHorizontal: 10, fontSize: 15, fontWeight: "600", color: colors.ink, minWidth: 16, textAlign: "center" },
  remove: { color: colors.chili, fontSize: 12 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  totalLabel: { fontSize: 14, color: colors.inkFaint },
  totalValue: { fontSize: 20, fontWeight: "700", color: colors.ink },
  checkoutBtn: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center" },
  checkoutBtnText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
});
