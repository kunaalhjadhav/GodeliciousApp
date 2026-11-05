import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

// Shows a friendly screen with the error instead of the app closing, so problems can be reported.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App error:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 24, paddingTop: 80 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#1B2B22", marginBottom: 8 }}>Something went wrong</Text>
        <Text style={{ fontSize: 14, color: "#5E7066", marginBottom: 16 }}>
          Please take a screenshot of this screen and send it to Godelicious support, then tap Try again.
        </Text>
        <ScrollView style={{ maxHeight: 220, backgroundColor: "#F3F6F4", borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, color: "#B3261E" }}>{String(this.state.error?.message || this.state.error)}</Text>
        </ScrollView>
        <TouchableOpacity
          onPress={() => this.setState({ error: null })}
          style={{ backgroundColor: "#1F7A4D", borderRadius: 12, padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
