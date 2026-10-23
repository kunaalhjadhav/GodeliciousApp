import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import { GOOGLE_MAPS_API_KEY } from "../config";
import { colors, spacing } from "../theme";

// Self-contained HTML page embedding the Google Maps JavaScript API with a
// single draggable pin. Runs inside a WebView (already a dependency, used
// elsewhere for banner videos) rather than react-native-maps — avoids adding
// a new native module and its own Gradle/linking surface to this project.
function mapHtml(apiKey, lat, lng) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function initMap() {
            var pos = { lat: ${lat}, lng: ${lng} };
            var map = new google.maps.Map(document.getElementById('map'), {
              center: pos, zoom: 15, streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
            });
            var marker = new google.maps.Marker({ position: pos, map: map, draggable: true });

            function report() {
              var p = marker.getPosition();
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat: p.lat(), lng: p.lng() }));
            }
            marker.addListener('dragend', report);
            map.addListener('click', function (e) {
              marker.setPosition(e.latLng);
              report();
            });
          }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
      </body>
    </html>
  `;
}

// Free fallback (no key, no billing): Leaflet + OpenStreetMap tiles, same pin behaviour.
function osmHtml(lat, lng) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([${lat}, ${lng}], 16);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
          function report() {
            var p = marker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: p.lat, lng: p.lng }));
          }
          marker.on('dragend', report);
          map.on('click', function (e) { marker.setLatLng(e.latlng); report(); });
        </script>
      </body>
    </html>
  `;
}

// Renders the map (Google if a key is configured, otherwise OpenStreetMap) and reports the is configured) and reports the
// chosen { latitude, longitude } back via onLocationSelected whenever the
// pin is moved. Reverse geocoding into an address happens on the native
// side (via fetch), not inside the WebView, to avoid any WebView network
// quirks — the caller already has a reverseGeocode() helper for this.
export default function LocationPickerMap({ initialLat, initialLng, onLocationSelected }) {
  const lat = initialLat || 12.322983; // fallback centre: Vijayanagar, Mysuru
  const lng = initialLng || 76.5878328;

  function handleMessage(event) {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      onLocationSelected(lat, lng);
    } catch (err) {
      console.error("Map message parse failed:", err);
    }
  }

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ html: GOOGLE_MAPS_API_KEY ? mapHtml(GOOGLE_MAPS_API_KEY, lat, lng) : osmHtml(lat, lng) }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />
      <Text style={styles.hint}>Drag the pin, or tap anywhere on the map, to set your exact location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  map: { width: "100%", height: 220, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
  hint: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
  notice: { padding: spacing.sm, backgroundColor: colors.line, borderRadius: 6, marginBottom: spacing.sm },
  noticeText: { fontSize: 12, color: colors.inkFaint },
});
