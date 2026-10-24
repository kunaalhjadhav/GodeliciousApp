import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { api, API_URL } from "../api/client";
import { colors, greens } from "../theme";
import GradientView from "./GradientView";

const { width } = Dimensions.get("window");
const HEIGHT = 200;

function resolveUrl(url) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// Shown when the admin hasn't published a banner yet (or a picture can't load),
// so the top of the home screen never looks empty or broken.
const DEFAULT_SLIDES = [
  { id: "default-1", title: "Meal boxes, made fresh in Mysuru", sub: "Order 10 or more and we deliver to your door", target: "MealBoxes" },
  { id: "default-2", title: "Biryani, thalis & party orders", sub: "Browse the full menu and order today", target: null },
];

// Simple HTML wrapper so a video URL plays inline via WebView, avoiding a
// heavier native video module (react-native-video) and its extra native
// linking/build-config surface — reasonable trade-off for a banner clip.
function videoHtml(url) {
  return `
    <html><body style="margin:0;background:#1C1B19;">
      <video src="${url}" autoplay muted loop playsinline
        style="width:100%;height:100%;object-fit:cover;"></video>
    </body></html>
  `;
}

export default function BannerCarousel({ navigation }) {
  const [banners, setBanners] = useState(null); // null = still loading
  const [broken, setBroken] = useState({});
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let tries = 0;
    let cancelled = false;
    function load() {
      api.listBanners()
        .then((d) => !cancelled && setBanners(d.banners || []))
        .catch(() => {
          // The free server can be asleep for a moment — try again a couple of times.
          if (cancelled) return;
          if (++tries < 3) setTimeout(load, 4000);
          else setBanners([]);
        });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const real = (banners || []).filter((b) => !broken[b.id]);
  const slides = real.length ? real : DEFAULT_SLIDES;
  const isDefault = !real.length;

  useEffect(() => { setIndex(0); }, [real.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (banners === null) {
    return <View style={[styles.container, styles.placeholder]} />;
  }

  const banner = slides[index % slides.length];

  function handleTap() {
    if (isDefault) {
      if (banner.target) navigation?.navigate(banner.target);
      return;
    }
    if (!banner.linkUrl) return;
    // Admin-set links look like "/menu/<itemId>" — matches the web route
    // convention, so the same linkUrl value works on both platforms.
    const menuMatch = banner.linkUrl.match(/^\/menu\/(.+)$/);
    if (menuMatch) {
      navigation?.navigate("ItemDetail", { itemId: menuMatch[1] });
    } else if (banner.linkUrl === "/meal-boxes") {
      navigation?.navigate("MealBoxes");
    } else if (banner.linkUrl.startsWith("http")) {
      Linking.openURL(banner.linkUrl);
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handleTap} activeOpacity={0.9}>
      {isDefault ? (
        <GradientView colors={greens.headerGradient} style={[styles.media, styles.defaultSlide]}>
          <Text style={styles.defaultTitle}>{banner.title}</Text>
          <Text style={styles.defaultSub}>{banner.sub}</Text>
          <View style={styles.defaultBtn}><Text style={styles.defaultBtnText}>Order now</Text></View>
        </GradientView>
      ) : banner.mediaType === "IMAGE" ? (
        <Image
          key={banner.id}
          source={{ uri: resolveUrl(banner.mediaUrl) }} style={styles.media} resizeMode="cover"
          onError={() => setBroken((m) => ({ ...m, [banner.id]: true }))}
        />
      ) : (
        <WebView
          key={banner.id}
          source={{ html: videoHtml(resolveUrl(banner.mediaUrl)) }}
          style={styles.media}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onError={() => setBroken((m) => ({ ...m, [banner.id]: true }))}
        />
      )}

      {!isDefault && !!banner.title && (
        <View style={styles.titleOverlay}>
          <Text style={styles.titleText}>{banner.title}</Text>
        </View>
      )}

      {slides.length > 1 && (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index % slides.length && styles.dotActive]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width, height: HEIGHT, backgroundColor: colors.charcoal },
  placeholder: { justifyContent: "center", alignItems: "center" },
  media: { width, height: HEIGHT },
  defaultSlide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  defaultTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  defaultSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 6, textAlign: "center" },
  defaultBtn: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginTop: 14 },
  defaultBtnText: { color: greens.deep, fontWeight: "700", fontSize: 14 },
  titleOverlay: { position: "absolute", bottom: 16, left: 16 },
  titleText: { color: colors.paper, fontSize: 20, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 },
  dots: { position: "absolute", bottom: 10, right: 14, flexDirection: "row" },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.4)", marginLeft: 4 },
  dotActive: { backgroundColor: "#fff" },
});
