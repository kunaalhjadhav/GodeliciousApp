import { API_URL } from "./api/client";

export function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// 1420 -> "₹1,420"
export function rupees(n) {
  const v = Math.round(Number(n) || 0);
  return `₹${v.toLocaleString("en-IN")}`;
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
