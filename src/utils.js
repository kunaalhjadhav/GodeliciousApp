import { API_URL } from "./api/client";

export function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// 1420 -> "₹1,420"   1039.5 -> "₹1,039.50" (paise only appear when there are some)
export function rupees(n) {
  const num = Number(n) || 0;
  const whole = Math.abs(num - Math.round(num)) < 0.005;
  const v = whole ? Math.round(num) : Math.round(num * 100) / 100;
  return `₹${v.toLocaleString("en-IN", whole ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// The same sum the server does (backend/src/utils/pricing.js), so the number shown here is the number charged:
//   subtotal - coupon = taxable;  taxable + GST + delivery - reward points = total to pay.
// GST is added on top of the prices. The minimum order and coupon minimum use the subtotal BEFORE the coupon.
export function computeTotals({ subtotal, discount = 0, deliveryFee = 0, pointsRupees = 0, gstPercent = 5 }) {
  const sub = round2(subtotal);
  const disc = round2(Math.min(Math.max(Number(discount) || 0, 0), sub));
  const taxable = round2(sub - disc);
  const gst = round2(taxable * ((Number(gstPercent) || 0) / 100));
  const fee = round2(deliveryFee);
  const points = Math.max(0, Math.min(Math.floor(Number(pointsRupees) || 0), Math.floor(taxable + gst + fee)));
  return { subtotal: sub, discount: disc, taxable, gst, deliveryFee: fee, pointsRupees: points, total: round2(taxable + gst + fee - points) };
}

// How many meal boxes are in the cart (the minimum per order is counted across all boxes)
export function mealBoxCount(items) {
  return (items || []).reduce((n, l) => n + (l.menuItem?.isMealBox ? l.quantity : 0), 0);
}

// 1500 -> "1.5 kg", 250 -> "250 g"
export function weightLabel(grams) {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2).replace(/0$/, "")} kg`;
  }
  return `${grams} g`;
}

// Quantity text for a cart/order line
export function qtyLabel(menuItem, quantity) {
  return menuItem.soldByWeight ? weightLabel(quantity) : `${quantity}`;
}

// "3 Oct" from an ISO date string
export function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// "Sat 12 Oct"
export function longDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
