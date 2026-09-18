import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: change this to your machine's LAN IP when testing on a real
// device or emulator — "localhost" inside an Android emulator refers to the
// emulator itself, not your dev machine. Android emulator special-case:
// 10.0.2.2 maps to your host machine's localhost.
//
// - Android emulator:  http://10.0.2.2:5000
// - iOS simulator:     http://localhost:5000
// - Physical device:   http://<your-computer-LAN-IP>:5000  (e.g. 192.168.1.5)
export const API_URL = "https://godelicious-production.up.railway.app";

const TOKEN_KEY = "godelicious_token";

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (name, email, password, phone) =>
    request("/api/auth/register", { method: "POST", body: { name, email, password, phone } }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me"),

  listCategories: () => request("/api/menu/categories"),
  listMenu: (categoryId) =>
    request(`/api/menu?available=true${categoryId ? `&categoryId=${categoryId}` : ""}`),
  getMenuItem: (id) => request(`/api/menu/${id}`),

  createOrder: (payload) => request("/api/orders", { method: "POST", body: payload }),
  myOrders: () => request("/api/orders/my"),
  getOrder: (id) => request(`/api/orders/${id}`),

  createEnquiry: (payload) => request("/api/venue-enquiries", { method: "POST", body: payload }),
  myEnquiries: () => request("/api/venue-enquiries/my"),

  listBanners: () => request("/api/banners"),

  validateCoupon: (code, subtotal) =>
    request("/api/coupons/validate", { method: "POST", body: { code, subtotal } }),

  myNotifications: () => request("/api/notifications/my"),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: "POST" }),

  myMessages: () => request("/api/chat/my"),
  sendMessage: (body) => request("/api/chat/my", { method: "POST", body: { body } }),

  // OTP login
  requestOtp: (phone) => request("/api/auth/otp/request", { method: "POST", body: { phone } }),
  verifyOtp: (phone, code, name) =>
    request("/api/auth/otp/verify", { method: "POST", body: { phone, code, name } }),

  // Settings
  getSettings: () => request("/api/settings"),

  // Razorpay
  createRazorpayOrder: (orderId) =>
    request("/api/payments/razorpay/create-order", { method: "POST", body: { orderId } }),
  verifyRazorpayPayment: (payload) =>
    request("/api/payments/razorpay/verify", { method: "POST", body: payload }),

  // Reviews
  createReview: (orderId, rating, comment) =>
    request("/api/reviews", { method: "POST", body: { orderId, rating, comment } }),

  // Order types (the 3 home-screen package cards) and add-ons for booking
  listOrderTypes: () => request("/api/order-types"),
  listAddons: () => request("/api/addons"),

  // Brand partner browsing
  listBrandsPublic: () => request("/api/brands/public"),
  listMenuByBrand: (brandId) => request(`/api/menu?available=true&brandId=${brandId}`),
};
