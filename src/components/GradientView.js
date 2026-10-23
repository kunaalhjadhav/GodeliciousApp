import React from "react";
import { View } from "react-native";

// Dependency-free linear gradient (no native module, so no rebuild/pod changes):
// a stack of thin bands whose colours are interpolated between the stops.
function hexToRgb(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}
function colorAt(stops, t) {
  const seg = (stops.length - 1) * t;
  const i = Math.min(Math.floor(seg), stops.length - 2);
  return mix(stops[i], stops[i + 1], seg - i);
}

export default function GradientView({ colors, horizontal = false, steps = 28, style, children }) {
  const bands = [];
  for (let i = 0; i < steps; i++) {
    bands.push(<View key={i} style={{ flex: 1, backgroundColor: colorAt(colors, i / (steps - 1)) }} />);
  }
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <View style={{ ...absoluteFill, flexDirection: horizontal ? "row" : "column" }} pointerEvents="none">
        {bands}
      </View>
      {children}
    </View>
  );
}

const absoluteFill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
