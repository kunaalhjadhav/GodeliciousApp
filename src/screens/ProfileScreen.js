import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      {!!user?.phone && <Text style={styles.email}>{user.phone}</Text>}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: "center", paddingTop: spacing.xl * 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: "700", color: colors.charcoal },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  email: { fontSize: 13, color: colors.inkFaint },
  logoutButton: { marginTop: spacing.xl, borderWidth: 1, borderColor: colors.chili, borderRadius: 4, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  logoutText: { color: colors.chili, fontWeight: "600" },
});
