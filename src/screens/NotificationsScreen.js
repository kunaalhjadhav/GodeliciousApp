import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.myNotifications().then((d) => setNotifications(d.notifications)).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    Promise.resolve(load()).finally(() => setRefreshing(false));
  }

  async function open(n) {
    if (!n.isRead) {
      await api.markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={notifications}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
      renderItem={({ item: n }) => (
        <TouchableOpacity
          onPress={() => open(n)}
          style={[styles.card, !n.isRead && styles.cardUnread]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{n.title}</Text>
            {!n.isRead && <View style={styles.dot} />}
          </View>
          <Text style={styles.body}>{n.body}</Text>
          <Text style={styles.date}>{new Date(n.createdAt).toLocaleString()}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  cardUnread: { backgroundColor: "rgba(232,163,61,0.08)", borderColor: colors.saffron2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron2, marginTop: 4 },
  body: { fontSize: 13, color: colors.inkFaint, marginTop: 2 },
  date: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
});
