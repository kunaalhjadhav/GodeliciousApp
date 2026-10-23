import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// English / Kannada. Screens call t("key"); anything missing in Kannada falls
// back to English, so a half-translated screen never shows a blank. To add a
// string: put the English in `en`, the Kannada in `kn`, and use the same key.
// Have a Kannada speaker review the wording in `kn` before you publish the app.
const en = {
  tab_menu: "Menu", tab_orders: "Orders", tab_chat: "Chat", tab_profile: "Profile",
  search_ph: "Search sweets, meal boxes, brands",
  next_delivery: "Your next delivery",
  veg_only: "Veg only", under_500: "Under ₹500", by_weight: "By weight", combos: "Combos", bestsellers: "Bestsellers",
  plan_by_occasion: "Plan by occasion", plan_party: "Plan my party",
  plan_party_sub: "How many guests? We suggest quantities and a total",
  offers_for_you: "Offers for you", order_again: "Order again", see_all: "See all", add_again: "Add again",
  brand_partners: "Brand partners", view_all: "View all",
  weekly_box: "Weekly meal box", weekly_box_sub: "Office lunches or tiffin on repeat. Pause any time.", set_up_plan: "Set up a plan",
  book_venue: "Book a venue", browse_venues: "Browse venues", my_requests: "My requests",
  all_dishes: "All dishes", add: "Add", customize: "Customize",
  your_cart: "Your cart", checkout: "Checkout", total: "Total", delivery: "Delivery", free: "Free",
  proceed_checkout: "Proceed to checkout", add_to_cart: "Add to cart",
  coupon_code: "Coupon code", apply: "Apply",
  items_total: "Items total", gst_incl: "GST", gst: "GST", to_pay: "To pay", meal_boxes: "Meal boxes", meal_box: "Meal box",
  favourites: "Favourites", add_all_available: "Add all available to cart", notify_me: "Notify me",
  reviews: "Reviews",
  profile_points: "Reward points", refer_friend: "Refer a friend", my_orders: "My orders",
  saved_addresses: "Saved addresses", my_venue_requests: "My venue requests",
  language: "Language", alerts: "Order and offer alerts", help_support: "Help and support", log_out: "Log out",
  start_plan: "Start plan", send_request: "Send request",
  get_quote: "Get a quote", add_all_cart: "Add all to cart",
  loading: "Loading...",
};

const kn = {
  tab_menu: "ಮೆನು", tab_orders: "ಆರ್ಡರ್‌ಗಳು", tab_chat: "ಚಾಟ್", tab_profile: "ಪ್ರೊಫೈಲ್",
  search_ph: "ಸಿಹಿ, ಊಟದ ಬಾಕ್ಸ್, ಬ್ರಾಂಡ್ ಹುಡುಕಿ",
  next_delivery: "ನಿಮ್ಮ ಮುಂದಿನ ಡೆಲಿವರಿ",
  veg_only: "ಸಸ್ಯಾಹಾರ ಮಾತ್ರ", under_500: "₹500 ಒಳಗೆ", by_weight: "ತೂಕದ ಪ್ರಕಾರ", combos: "ಕಾಂಬೊ", bestsellers: "ಹೆಚ್ಚು ಮಾರಾಟವಾದವು",
  plan_by_occasion: "ಸಂದರ್ಭದ ಪ್ರಕಾರ ಯೋಜಿಸಿ", plan_party: "ನನ್ನ ಪಾರ್ಟಿ ಯೋಜಿಸಿ",
  plan_party_sub: "ಎಷ್ಟು ಅತಿಥಿಗಳು? ನಾವು ಪ್ರಮಾಣ ಮತ್ತು ಒಟ್ಟು ಮೊತ್ತ ಸೂಚಿಸುತ್ತೇವೆ",
  offers_for_you: "ನಿಮಗಾಗಿ ಆಫರ್‌ಗಳು", order_again: "ಮತ್ತೆ ಆರ್ಡರ್ ಮಾಡಿ", see_all: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ", add_again: "ಮತ್ತೆ ಸೇರಿಸಿ",
  brand_partners: "ಬ್ರಾಂಡ್ ಪಾಲುದಾರರು", view_all: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ",
  weekly_box: "ವಾರದ ಊಟದ ಬಾಕ್ಸ್", weekly_box_sub: "ಆಫೀಸ್ ಊಟ ಅಥವಾ ಟಿಫಿನ್ ಪ್ರತಿ ವಾರ. ಯಾವಾಗ ಬೇಕಾದರೂ ನಿಲ್ಲಿಸಿ.", set_up_plan: "ಯೋಜನೆ ಹೊಂದಿಸಿ",
  book_venue: "ಸಭಾಂಗಣ ಬುಕ್ ಮಾಡಿ", browse_venues: "ಸಭಾಂಗಣಗಳನ್ನು ನೋಡಿ", my_requests: "ನನ್ನ ವಿನಂತಿಗಳು",
  all_dishes: "ಎಲ್ಲಾ ಖಾದ್ಯಗಳು", add: "ಸೇರಿಸಿ", customize: "ಆಯ್ಕೆ ಮಾಡಿ",
  your_cart: "ನಿಮ್ಮ ಕಾರ್ಟ್", checkout: "ಚೆಕ್‌ಔಟ್", total: "ಒಟ್ಟು", delivery: "ಡೆಲಿವರಿ", free: "ಉಚಿತ",
  proceed_checkout: "ಚೆಕ್‌ಔಟ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ", add_to_cart: "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
  coupon_code: "ಕೂಪನ್ ಕೋಡ್", apply: "ಅನ್ವಯಿಸಿ",
  items_total: "ಐಟಂಗಳ ಒಟ್ಟು", gst_incl: "GST", gst: "GST", to_pay: "ಪಾವತಿಸಬೇಕಾದದ್ದು", meal_boxes: "ಊಟದ ಬಾಕ್ಸ್‌ಗಳು", meal_box: "ಊಟದ ಬಾಕ್ಸ್",
  favourites: "ಮೆಚ್ಚಿನವು", add_all_available: "ಲಭ್ಯವಿರುವ ಎಲ್ಲವನ್ನೂ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ", notify_me: "ನನಗೆ ತಿಳಿಸಿ",
  reviews: "ವಿಮರ್ಶೆಗಳು",
  profile_points: "ರಿವಾರ್ಡ್ ಪಾಯಿಂಟ್‌ಗಳು", refer_friend: "ಸ್ನೇಹಿತರಿಗೆ ಶಿಫಾರಸು ಮಾಡಿ", my_orders: "ನನ್ನ ಆರ್ಡರ್‌ಗಳು",
  saved_addresses: "ಉಳಿಸಿದ ವಿಳಾಸಗಳು", my_venue_requests: "ನನ್ನ ಸಭಾಂಗಣ ವಿನಂತಿಗಳು",
  language: "ಭಾಷೆ", alerts: "ಆರ್ಡರ್ ಮತ್ತು ಆಫರ್ ಅಲರ್ಟ್‌ಗಳು", help_support: "ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ", log_out: "ಲಾಗ್ ಔಟ್",
  start_plan: "ಯೋಜನೆ ಪ್ರಾರಂಭಿಸಿ", send_request: "ವಿನಂತಿ ಕಳುಹಿಸಿ",
  get_quote: "ಕೋಟ್ ಪಡೆಯಿರಿ", add_all_cart: "ಎಲ್ಲವನ್ನೂ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
  loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
};

const TABLES = { en, kn };
const LANG_KEY = "godelicious_lang";
const LangContext = createContext({ lang: "en", setLang: () => {}, t: (k) => en[k] || k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => { if (v === "en" || v === "kn") setLangState(v); }).catch(() => {});
  }, []);

  function setLang(next) {
    setLangState(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  }

  const t = (key) => (TABLES[lang] && TABLES[lang][key]) || en[key] || key;
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
