import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { GOOGLE_MAPS_API_KEY } from "../config";

function html(apiKey, lat, lng) {
  return `
    <html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
      <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
    </head><body>
      <div id="map"></div>
      <script>
        function initMap() {
          var pos = { lat: ${lat}, lng: ${lng} };
          var map = new google.maps.Map(document.getElementById('map'), {
            center: pos, zoom: 15, disableDefaultUI: true, gestureHandling: 'cooperative',
          });
          new google.maps.Marker({ position: pos, map: map });
        }
      </script>
      <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
    </body></html>`;
}

// Shows where the order is going. (Live driver tracking would need a driver app
// that reports its position; this map only marks the delivery address.)
// Renders nothing if there is no Google Maps key or the order has no coordinates.
export default function TrackingMap({ latitude, longitude, height = 190 }) {
  if (!GOOGLE_MAPS_API_KEY || latitude == null || longitude == null) return null;
  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={["*"]} source={{ html: html(GOOGLE_MAPS_API_KEY, latitude, longitude) }}
        javaScriptEnabled scrollEnabled={false} style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: "100%", backgroundColor: "#DDE3D5" } });
