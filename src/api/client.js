import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: change this to your machine's LAN IP when testing on a real
// device or emulator — "localhost" inside an Android emulator refers to the
// emulator itself, not your dev machine. Android emulator special-case:
// 10.0.2.2 maps to your host machine's localhost.
//
// - Android emulator:  http://10.0.2.2:5000
// - iOS simulator:     http://localhost:5000
// - Physical device:   http://<your-computer-LAN-IP>:5000  (e.g. 192.168.1.5)
export const API_URL = "https://godelicious.onrender.com";

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
  // Address search / autofill (served by our backend; works with or without a Google key)
  placesAutocomplete: (q, lat, lng) =>
    request(`/api/places/autocomplete?q=${encodeURIComponent(q)}${lat != null ? `&lat=${lat}&lng=${lng}` : ""}`),
  placeDetails: (id) => request(`/api/places/details?id=${encodeURIComponent(id)}`),
  placesReverse: (lat, lng) => request(`/api/places/reverse?lat=${lat}&lng=${lng}`),
  serviceCheck: (latitude, longitude) => request("/api/settings/service-check", { method: "POST", body: { latitude, longitude } }),
  listMealBoxes: () => request("/api/meal-boxes"),

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

  // Venue booking (venue partners' halls)
  listVenues: (params = {}) => {
    const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return request(`/api/venues${qs ? `?${qs}` : ""}`);
  },
  getVenue: (id) => request(`/api/venues/${id}`),
  requestVenue: (id, payload) => request(`/api/venues/${id}/bookings`, { method: "POST", body: payload }),
  myVenueRequests: () => request("/api/venues/bookings/my"),
  cancelVenueRequest: (id) => request(`/api/venues/bookings/${id}/cancel`, { method: "PATCH" }),

  // Push notifications
  registerDevice: (token, platform) =>
    request("/api/devices/register", { method: "POST", body: { token, platform } }),

  // Home feed, bestsellers, item reviews
  home: () => request("/api/home"),
  bestsellers: (exclude = []) => request(`/api/menu/bestsellers?limit=6${exclude.length ? `&exclude=${exclude.join(",")}` : ""}`),
  itemReviews: (id) => request(`/api/menu/${id}/reviews`),

  // Favourites
  myFavorites: () => request("/api/favorites"),
  myFavoriteIds: () => request("/api/favorites/ids"),
  addFavorite: (menuItemId) => request("/api/favorites", { method: "POST", body: { menuItemId } }),
  removeFavorite: (menuItemId) => request(`/api/favorites/${menuItemId}`, { method: "DELETE" }),
  setFavoriteNotify: (menuItemId, notify) =>
    request(`/api/favorites/${menuItemId}/notify`, { method: "PATCH", body: { notify } }),

  // Saved addresses
  myAddresses: () => request("/api/addresses"),
  addAddress: (payload) => request("/api/addresses", { method: "POST", body: payload }),
  updateAddress: (id, payload) => request(`/api/addresses/${id}`, { method: "PATCH", body: payload }),
  deleteAddress: (id) => request(`/api/addresses/${id}`, { method: "DELETE" }),

  // Rewards and referrals
  myLoyalty: () => request("/api/loyalty/me"),
  applyReferral: (code) => request("/api/loyalty/apply-referral", { method: "POST", body: { code } }),

  // Party planner
  planParty: (guests, foodStyle, occasion) =>
    request("/api/planner/suggest", { method: "POST", body: { guests, foodStyle, occasion } }),

  // Weekly meal box
  subscriptionPlans: () => request("/api/subscriptions/plans"),
  mySubscriptions: () => request("/api/subscriptions/my"),
  createSubscription: (payload) => request("/api/subscriptions", { method: "POST", body: payload }),
  updateSubscription: (id, payload) => request(`/api/subscriptions/${id}`, { method: "PATCH", body: payload }),
  skipSubscriptionDay: (id, date) => request(`/api/subscriptions/${id}/skip`, { method: "POST", body: { date } }),
  unskipSubscriptionDay: (id, date) => request(`/api/subscriptions/${id}/skip/${date}`, { method: "DELETE" }),

  unregisterDevice: (token) => request("/api/devices/register", { method: "DELETE", body: { token } }),

  // Brand partner browsing
  listBrandsPublic: () => request("/api/brands/public"),
  listMenuByBrand: (brandId) => request(`/api/menu?available=true&brandId=${brandId}`),
};
