import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { colors, spacing } from "../theme";
import { resolveImageUrl, rupees, shortDate, longDate, weightLabel } from "../utils";
import { useLang } from "../i18n";

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_LABELS = ["Placed", "Confirmed", "Preparing", "On the way", "Delivered"];

export function SectionTitle({ title, action, onAction }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction}><Text style={s.sectionAction}>{action}</Text></TouchableOpacity>
      )}
    </View>
  );
}

// "Your next delivery" card with a mini progress line
export function NextDeliveryCard({ delivery, onPress }) {
  const { t } = useLang();
  if (!delivery) return null;
  const idx = Math.max(0, STEPS.indexOf(delivery.status));
  const when = delivery.eventDate ? `${longDate(delivery.eventDate)}${delivery.eventTime ? `, ${delivery.eventTime}` : ""}` : "";
  return (
    <TouchableOpacity style={s.nextCard} onPress={onPress} activeOpacity={0.9}>
      <Text style={s.nextLabel}>{t("next_delivery").toUpperCase()}</Text>
      <View style={s.nextTop}>
        <Text style={s.nextTitle}>{when || "Scheduled"}</Text>
      </View>
      <Text style={s.nextSub}>{delivery.summary} · {STEP_LABELS[idx]}</Text>
      <View style={s.progressRow}>
        {STEP_LABELS.map((label, i) => (
          <View key={label} style={s.progressCell}>
            <View style={[s.progressBar, i <= idx && s.progressBarOn]} />
            <Text style={[s.progressText, i <= idx && { color: colors.saffron }]} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export function CutoffBanner({ message }) {
  if (!message) return null;
  return (
    <View style={s.cutoff}>
      <Text style={s.cutoffText}>{message}</Text>
    </View>
  );
}

export function FilterChips({ filters, active, onToggle }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      {filters.map((f) => {
        const on = active.includes(f.key);
        return (
          <TouchableOpacity key={f.key} onPress={() => onToggle(f.key)} style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function OccasionPlanner({ occasions, onPick, onPlan }) {
  const { t } = useLang();
  return (
    <View>
      <SectionTitle title={t("plan_by_occasion")} />
      <View style={s.tileGrid}>
        {occasions.map((o) => (
          <TouchableOpacity key={o.key} style={s.tile} onPress={() => onPick(o)}>
            <Text style={s.tileText}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={s.plannerCta} onPress={onPlan} activeOpacity={0.9}>
        <View style={{ flex: 1 }}>
          <Text style={s.plannerTitle}>{t("plan_party_sub")}</Text>
        </View>
        <View style={s.plannerBtn}><Text style={s.plannerBtnText}>{t("plan_party")}</Text></View>
      </TouchableOpacity>
    </View>
  );
}

export function OffersStrip({ offers, cartTotal, onCoupon, onBrand }) {
  const { t } = useLang();
  if (!offers.length) return null;
  return (
    <View>
      <SectionTitle title={t("offers_for_you")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
        {offers.map((o, i) => {
          const away = o.type === "DELIVERY" && cartTotal > 0 ? Math.max(0, o.threshold - cartTotal) : null;
          return (
            <TouchableOpacity
              key={`${o.type}-${i}`} style={[s.offer, o.type === "COUPON" && s.offerDashed]} activeOpacity={0.85}
              onPress={() => (o.type === "COUPON" ? onCoupon(o) : o.type === "BRAND" ? onBrand(o) : null)}
            >
              <Text style={s.offerTitle}>{o.title}</Text>
              <Text style={s.offerSub}>{o.subtitle}</Text>
              {o.type === "COUPON" && <Text style={s.offerCode}>Code {o.code}</Text>}
              {o.type === "COUPON" && <Text style={s.offerHint}>Tap to use</Text>}
              {away !== null && (
                <Text style={s.offerHint}>{away > 0 ? `You are ${rupees(away)} away` : "You have free delivery"}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function OrderAgainStrip({ entries, onAdd }) {
  const { t } = useLang();
  if (!entries.length) return null;
  return (
    <View>
      <SectionTitle title={t("order_again")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
        {entries.map((e) => (
          <View key={e.menuItemId} style={s.againCard}>
            {e.imageUrl ? (
              <Image source={{ uri: resolveImageUrl(e.imageUrl) }} style={s.againImg} />
            ) : (
              <View style={[s.againImg, { backgroundColor: colors.line }]} />
            )}
            <Text style={s.againName} numberOfLines={1}>
              {e.name}{e.soldByWeight ? `, ${weightLabel(e.quantity)}` : e.quantity > 1 ? ` x ${e.quantity}` : ""}
            </Text>
            <Text style={s.againSub}>Ordered {shortDate(e.orderedAt)} · {rupees(e.lineTotal)}</Text>
            <TouchableOpacity style={s.againBtn} onPress={() => onAdd(e)}>
              <Text style={s.againBtnText}>{t("add_again")}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function BrandStrip({ brands, onBrand, onAll }) {
  const { t } = useLang();
  if (!brands.length) return null;
  return (
    <View>
      <SectionTitle title={t("brand_partners")} action={t("view_all")} onAction={onAll} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
        {brands.map((b) => (
          <TouchableOpacity key={b.id} style={s.brand} onPress={() => onBrand(b)}>
            <View style={s.brandCircle}>
              {b.logoUrl ? (
                <Image source={{ uri: resolveImageUrl(b.logoUrl) }} style={s.brandLogo} />
              ) : (
                <Text style={s.brandInitial}>{b.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={s.brandName} numberOfLines={1}>{b.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function WeeklyBoxPromo({ info, onPress }) {
  const { t } = useLang();
  if (!info || !info.available) return null;
  const mine = info.mine;
  return (
    <TouchableOpacity style={s.weekly} onPress={onPress} activeOpacity={0.9}>
      {!mine && info.discountPct > 0 && (
        <View style={s.newPill}><Text style={s.newPillText}>SAVE {Math.round(info.discountPct)}%</Text></View>
      )}
      <Text style={s.weeklyTitle}>{t("weekly_box")}</Text>
      <Text style={s.weeklySub}>
        {mine ? `Your plan is ${mine.status === "ACTIVE" ? "active" : "paused"}: ${mine.boxesPerDay} x ${mine.itemName}` : t("weekly_box_sub")}
      </Text>
      <View style={s.weeklyBtn}><Text style={s.weeklyBtnText}>{mine ? "Manage plan" : t("set_up_plan")}</Text></View>
    </TouchableOpacity>
  );
}

export function VenuesPromo({ info, onBrowse, onRequests }) {
  const { t } = useLang();
  if (!info || !info.count) return null;
  return (
    <View style={s.venues}>
      <Text style={s.venuesTitle}>{t("book_venue")}</Text>
      <Text style={s.venuesSub}>
        Halls in Bengaluru and Mysuru. Compare tariffs, send a date request.
        {info.fromPrice ? ` Halls from ${rupees(info.fromPrice)}.` : ""}
      </Text>
      <View style={{ flexDirection: "row", marginTop: spacing.sm }}>
        <TouchableOpacity style={s.venuesBtn} onPress={onBrowse}><Text style={s.venuesBtnText}>{t("browse_venues")}</Text></TouchableOpacity>
        <TouchableOpacity style={s.venuesBtnGhost} onPress={onRequests}><Text style={s.venuesBtnGhostText}>{t("my_requests")}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export function showCouponHint(code) {
  Alert.alert(`Code ${code}`, "Saved. Open your cart and it will be filled in for you.");
}

const s = StyleSheet.create({
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 19, fontWeight: "700", color: colors.charcoal },
  sectionAction: { fontSize: 13, color: colors.saffron2, fontWeight: "700" },

  nextCard: { backgroundColor: colors.charcoal, borderRadius: 14, marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md },
  nextLabel: { fontSize: 11, letterSpacing: 1, color: colors.saffron, fontWeight: "700" },
  nextTop: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  nextTitle: { fontSize: 20, fontWeight: "700", color: colors.paper },
  nextSub: { fontSize: 13, color: "#CFC9B8", marginTop: 4 },
  progressRow: { flexDirection: "row", marginTop: spacing.md },
  progressCell: { flex: 1, paddingRight: 4 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: "#4A473F", marginBottom: 4 },
  progressBarOn: { backgroundColor: colors.saffron },
  progressText: { fontSize: 9, color: "#8A8578" },

  cutoff: { marginHorizontal: spacing.md, marginTop: spacing.sm, backgroundColor: "rgba(232,163,61,0.14)", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  cutoffText: { fontSize: 13, color: "#7A4E10", fontWeight: "600", textAlign: "center" },

  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  chipOn: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.paper, fontWeight: "700" },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md - 4 },
  tile: { width: "46%", margin: "2%", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  tileText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  plannerCta: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.md, marginTop: spacing.sm, backgroundColor: colors.basil, borderRadius: 12, padding: spacing.md },
  plannerTitle: { color: colors.paper, fontSize: 13, paddingRight: 10 },
  plannerBtn: { backgroundColor: colors.saffron, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  plannerBtnText: { color: colors.charcoal, fontWeight: "700", fontSize: 13 },

  offer: { width: 210, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: spacing.md, marginRight: 10 },
  offerDashed: { borderStyle: "dashed", borderColor: colors.saffron2 },
  offerTitle: { fontSize: 16, fontWeight: "700", color: colors.charcoal },
  offerSub: { fontSize: 12, color: colors.inkFaint, marginTop: 2 },
  offerCode: { fontSize: 13, fontWeight: "700", color: colors.saffron2, marginTop: 8 },
  offerHint: { fontSize: 12, color: colors.basil, marginTop: 4, fontWeight: "600" },

  againCard: { width: 170, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, marginRight: 10 },
  againImg: { width: "100%", height: 80, borderRadius: 8, marginBottom: 8 },
  againName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  againSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  againBtn: { marginTop: 8, borderWidth: 1.5, borderColor: colors.saffron2, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  againBtnText: { color: colors.saffron2, fontWeight: "700", fontSize: 13 },

  brand: { alignItems: "center", width: 74, marginRight: 8 },
  brandCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#E6D8B9", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brandLogo: { width: "100%", height: "100%" },
  brandInitial: { fontSize: 22, fontWeight: "700", color: colors.charcoal },
  brandName: { fontSize: 11, color: colors.ink, marginTop: 4, textAlign: "center" },

  weekly: { backgroundColor: colors.basil, borderRadius: 14, marginHorizontal: spacing.md, marginTop: spacing.lg, padding: spacing.md },
  newPill: { alignSelf: "flex-start", backgroundColor: colors.saffron, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  newPillText: { fontSize: 10, fontWeight: "800", color: colors.charcoal },
  weeklyTitle: { fontSize: 20, fontWeight: "700", color: colors.paper },
  weeklySub: { fontSize: 13, color: "#CFE2C8", marginTop: 4 },
  weeklyBtn: { alignSelf: "flex-start", marginTop: spacing.sm, backgroundColor: colors.paper, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  weeklyBtnText: { color: colors.basil, fontWeight: "700", fontSize: 13 },

  venues: { backgroundColor: colors.charcoal, borderRadius: 14, marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md },
  venuesTitle: { fontSize: 20, fontWeight: "700", color: colors.paper },
  venuesSub: { fontSize: 13, color: "#CFC9B8", marginTop: 4 },
  venuesBtn: { backgroundColor: colors.saffron, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, marginRight: 8 },
  venuesBtnText: { color: colors.charcoal, fontWeight: "700", fontSize: 13 },
  venuesBtnGhost: { borderWidth: 1, borderColor: "#6A665C", borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  venuesBtnGhostText: { color: colors.paper, fontWeight: "600", fontSize: 13 },
});


// Horizontal strip of meal boxes on the home screen
export function MealBoxStrip({ info, onOpen, onAll }) {
  const boxes = info?.items || [];
  if (boxes.length === 0) return null;
  return (
    <View>
      <SectionTitle title="Meal boxes" action="See all" onAction={onAll} />
      <Text style={{ marginHorizontal: 16, marginBottom: 8, fontSize: 12, color: "#8A8578" }}>
        Order at least {info.minQty || 10} meals, mix any boxes
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {boxes.map((b) => (
          <TouchableOpacity key={b.id} onPress={() => onOpen(b)} style={{ width: 150, marginRight: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E4DFD3", overflow: "hidden" }}>
            {b.imageUrl ? (
              <Image source={{ uri: resolveImageUrl(b.imageUrl) }} style={{ width: "100%", height: 90 }} />
            ) : (
              <View style={{ width: "100%", height: 90, backgroundColor: "#E4DFD3" }} />
            )}
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: "#2A2822", paddingHorizontal: 10, paddingTop: 8 }}>{b.name}</Text>
            <Text style={{ fontSize: 11, color: "#C97F1F", paddingHorizontal: 10, paddingBottom: 8, paddingTop: 2 }}>
              ₹{b.price} + GST · {b.dishCount} dishes
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
