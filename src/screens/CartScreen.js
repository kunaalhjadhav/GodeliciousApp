import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useLang } from "../i18n";
import { colors, spacing } from "../theme";
import { rupees, weightLabel, computeTotals, mealBoxCount } from "../utils";

function ProgressRow({ label, status, ratio, done }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.progressTop}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressStatus, done && { color: colors.basil }]}>{status}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, ratio * 100))}%` }, done && { backgroundColor: colors.basil }]} />
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { t } = useLang();
  const {
    items, totalAmount, addItem, decrementItem, updateQuantity, removeItem,
    staff, setStaff, coupon, setCoupon, couponDraft, setCouponDraft,
  } = useCart();
  const [shop, setShop] = useState(null);            // min order, delivery fee, free-delivery threshold
  const [suggestion, setSuggestion] = useState(null); // item to add to reach free delivery
  const [code, setCode] = useState(couponDraft || "");
  const [couponMsg, setCouponMsg] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.getSettings().then((d) => setShop(d.settings)).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0 && staff) setStaff(null);
  }, [items.length, staff, setStaff]);

  const discount = coupon?.discountAmount || 0;
  const minOrder = shop?.minOrderAmount || 0;
  const feeRule = shop && shop.deliveryFee > 0;
  const freeAt = feeRule ? shop.freeDeliveryAbove : 0;
  const deliveryFee = feeRule && !(freeAt > 0 && totalAmount >= freeAt) ? shop.deliveryFee : 0;
  const gstPercent = shop?.gstPercent ?? 5;
  const couponMin = shop?.couponMinOrder ?? 0;
  const boxMin = shop?.mealBoxMinQty ?? 10;
  // GST is added on top. The minimum order and the coupon minimum look at the cart BEFORE the coupon,
  // so applying a coupon can never block checkout.
  const totals = computeTotals({ subtotal: totalAmount, discount, deliveryFee, gstPercent });
  const finalTotal = totals.total;
  const gst = totals.gst;
  const gap = freeAt > 0 ? Math.max(0, freeAt - totalAmount) : 0;
  const boxes = mealBoxCount(items);
  const boxesShort = boxes > 0 && boxes < boxMin;

  // Suggest a bestseller that, added a few times, gets the order to free delivery
  useEffect(() => {
    setSuggestion(null);
    if (!gap) return;
    const inCart = items.map((l) => l.menuItem.id);
    api.bestsellers(inCart).then((d) => {
      const pick = (d.items || []).find((i) => !i.soldByWeight && !i.isCombo && i.price > 0 && Math.ceil(gap / i.price) <= 5);
      if (pick) setSuggestion({ item: pick, qty: Math.ceil(gap / pick.price) });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap > 0, items.length]);

  // A coupon can stop applying when the cart shrinks, so check it again whenever the total changes
  useEffect(() => {
    if (!coupon) return;
    api.validateCoupon(coupon.code, totalAmount)
      .then((d) => setCoupon({ code: coupon.code, discountAmount: d.discountAmount }))
      .catch((e) => { setCoupon(null); setCouponMsg(e.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount]);

  async function applyCoupon() {
    if (!code.trim()) return;
    setChecking(true);
    setCouponMsg("");
    try {
      const d = await api.validateCoupon(code.trim(), totalAmount);
      setCoupon({ code: code.trim().toUpperCase(), discountAmount: d.discountAmount });
      setCouponDraft("");
    } catch (err) {
      setCoupon(null);
      setCouponMsg(err.message);
    } finally {
      setChecking(false);
    }
  }

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

  const belowMin = (minOrder > 0 && totalAmount < minOrder) || boxesShort;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={items}
        keyExtractor={(line) => line.key}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          <View style={styles.card}>
            {minOrder > 0 && (
              <ProgressRow
                label={`Minimum order ${rupees(minOrder)}`}
                status={totalAmount >= minOrder ? "Reached" : `${rupees(minOrder - totalAmount)} to go`}
                ratio={totalAmount / minOrder} done={totalAmount >= minOrder}
              />
            )}
            {boxes > 0 && (
              <ProgressRow
                label={`${t("meal_boxes")}: minimum ${boxMin} meals`}
                status={boxes >= boxMin ? `${boxes} meals` : `${boxMin - boxes} more needed`}
                ratio={boxes / boxMin} done={boxes >= boxMin}
              />
            )}
            {freeAt > 0 && (
              <ProgressRow
                label={`Free delivery above ${rupees(freeAt)}`}
                status={gap > 0 ? `${rupees(gap)} to go` : "Unlocked"}
                ratio={totalAmount / freeAt} done={gap === 0}
              />
            )}
            <Text style={styles.note}>Weight items and other dishes count together towards the minimum. Prices are before GST.</Text>
          </View>
        }
        renderItem={({ item: line }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{line.menuItem.name}</Text>
              {line.selectedOptions?.length > 0 && (
                <Text style={styles.options}>{line.selectedOptions.map((o) => o.optionLabel).join(", ")}</Text>
              )}
              <Text style={styles.price}>
                {line.menuItem.soldByWeight ? `${weightLabel(line.quantity)} · ₹${line.menuItem.price} per kg` : `₹${line.unitPrice} each`}
              </Text>
            </View>
            {line.menuItem.soldByWeight ? (
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(line.key, Math.max(line.menuItem.minOrderGrams > 0 ? line.menuItem.minOrderGrams : 250, line.quantity - 250))}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{weightLabel(line.quantity)}</Text>
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
            <View style={styles.lineTotalWrap}>
              <Text style={styles.lineTotal}>{rupees(line.unitPrice * line.quantity)}</Text>
              <TouchableOpacity onPress={() => removeItem(line.key)}><Text style={styles.remove}>Remove</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {staff && (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>Serving staff</Text>
                  <Text style={styles.price}>{staff.count} x ₹{staff.unitPrice}</Text>
                </View>
                <View style={styles.lineTotalWrap}>
                  <Text style={styles.lineTotal}>{rupees(staff.count * staff.unitPrice)}</Text>
                  <TouchableOpacity onPress={() => setStaff(null)}><Text style={styles.remove}>Remove</Text></TouchableOpacity>
                </View>
              </View>
            )}

            {suggestion && (
              <View style={styles.suggest}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestTitle}>Add {suggestion.item.name} x {suggestion.qty}</Text>
                  <Text style={styles.suggestSub}>to get free delivery · {rupees(suggestion.item.price * suggestion.qty)}</Text>
                </View>
                <TouchableOpacity style={styles.suggestBtn} onPress={() => addItem(suggestion.item, [], suggestion.qty)}>
                  <Text style={styles.suggestBtnText}>{t("add")}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t("coupon_code")}</Text>
              {coupon ? (
                <View style={styles.couponApplied}>
                  <Text style={styles.couponOk}>{coupon.code} applied · −{rupees(coupon.discountAmount)}</Text>
                  <TouchableOpacity onPress={() => { setCoupon(null); setCode(""); }}><Text style={styles.remove}>Remove</Text></TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row" }}>
                  <TextInput
                    style={styles.input} value={code} autoCapitalize="characters" placeholder="e.g. WELCOME10"
                    placeholderTextColor={colors.inkFaint}
                    onChangeText={(v) => { setCode(v.toUpperCase()); setCouponMsg(""); }}
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon} disabled={checking || !code.trim()}>
                    {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <Text style={styles.applyText}>{t("apply")}</Text>}
                  </TouchableOpacity>
                </View>
              )}
              {!coupon && couponMin > 0 && (
                <Text style={styles.couponHint}>
                  {totalAmount >= couponMin
                    ? `Coupons work on carts of ${rupees(couponMin)} or more. Your cart qualifies.`
                    : `Add ${rupees(couponMin - totalAmount)} more to use a coupon (carts of ${rupees(couponMin)} or more).`}
                </Text>
              )}
              {!!couponMsg && <Text style={styles.couponErr}>{couponMsg}</Text>}
            </View>

            <View style={styles.card}>
              <View style={styles.billRow}><Text style={styles.billText}>{t("items_total")}</Text><Text style={styles.billText}>{rupees(totalAmount)}</Text></View>
              {discount > 0 && (
                <View style={styles.billRow}><Text style={[styles.billText, { color: colors.basil }]}>Coupon discount</Text><Text style={[styles.billText, { color: colors.basil }]}>−{rupees(discount)}</Text></View>
              )}
              <View style={styles.billRow}><Text style={styles.billText}>{t("gst")} ({gstPercent}%)</Text><Text style={styles.billText}>{rupees(gst)}</Text></View>
              <View style={styles.billRow}>
                <Text style={styles.billText}>{t("delivery")}</Text>
                <Text style={[styles.billText, deliveryFee === 0 && { color: colors.basil, fontWeight: "600" }]}>{deliveryFee === 0 ? t("free") : rupees(deliveryFee)}</Text>
              </View>
              <View style={styles.sep} />
              <View style={styles.billRow}><Text style={styles.totalLabel}>{t("to_pay")}</Text><Text style={styles.totalValue}>{rupees(finalTotal)}</Text></View>
            </View>
          </View>
        }
      />

      <View style={styles.footer}>
        {boxesShort && <Text style={styles.minWarn}>Meal boxes need at least {boxMin} meals per order. Add {boxMin - boxes} more.</Text>}
        {!boxesShort && minOrder > 0 && totalAmount < minOrder && <Text style={styles.minWarn}>Add {rupees(minOrder - totalAmount)} more to reach the minimum order.</Text>}
        <TouchableOpacity style={[styles.checkoutBtn, belowMin && { opacity: 0.45 }]} disabled={belowMin} onPress={() => navigation.navigate("Checkout")}>
          <Text style={styles.checkoutBtnText}>{t("proceed_checkout")} · {rupees(finalTotal)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper },
  emptyText: { color: colors.inkFaint, marginBottom: spacing.sm },
  link: { color: colors.saffron2, fontWeight: "600" },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  cardLabel: { fontSize: 11, color: colors.inkFaint, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  progressTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  progressStatus: { fontSize: 12, color: colors.saffron2, fontWeight: "700" },
  track: { height: 6, backgroundColor: "#EDE8DC", borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.saffron, borderRadius: 3 },
  note: { fontSize: 11, color: colors.inkFaint },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  options: { fontSize: 11, color: colors.inkFaint },
  price: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  qtyControl: { flexDirection: "row", alignItems: "center", marginHorizontal: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.line, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 16, color: colors.ink },
  qtyText: { marginHorizontal: 8, fontSize: 14, fontWeight: "600", color: colors.ink, minWidth: 28, textAlign: "center" },
  lineTotalWrap: { alignItems: "flex-end", minWidth: 62 },
  lineTotal: { fontSize: 15, fontWeight: "700", color: colors.ink },
  remove: { color: colors.chili, fontSize: 12, marginTop: 4 },
  suggest: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(232,163,61,0.14)", borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderStyle: "dashed", borderColor: colors.saffron2 },
  suggestTitle: { fontSize: 14, fontWeight: "700", color: colors.charcoal },
  suggestSub: { fontSize: 12, color: "#7A4E10", marginTop: 2 },
  suggestBtn: { borderWidth: 1.5, borderColor: colors.saffron2, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  suggestBtnText: { color: colors.saffron2, fontWeight: "700" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, marginRight: 8 },
  applyBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 18, justifyContent: "center", minWidth: 70, alignItems: "center" },
  applyText: { color: colors.ink, fontWeight: "600" },
  couponApplied: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  couponOk: { color: colors.basil, fontWeight: "700", fontSize: 14 },
  couponErr: { color: colors.chili, fontSize: 12, marginTop: 6 },
  couponHint: { color: colors.inkFaint, fontSize: 12, marginTop: 6 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  billText: { fontSize: 14, color: colors.ink },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  totalValue: { fontSize: 18, fontWeight: "700", color: colors.ink },
  footer: { padding: spacing.md, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  minWarn: { fontSize: 12, color: colors.chili, marginBottom: 8, textAlign: "center" },
  checkoutBtn: { backgroundColor: colors.charcoal, borderRadius: 12, padding: 15, alignItems: "center" },
  checkoutBtnText: { color: colors.paper, fontWeight: "700", fontSize: 15 },
});
