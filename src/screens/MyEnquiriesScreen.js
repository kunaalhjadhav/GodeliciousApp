import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

const STATUS_COLORS = { PENDING: colors.saffron2, APPROVED: colors.basil, REJECTED: colors.chili };

export default function MyEnquiriesScreen() {
  const [enquiries, setEnquiries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.myEnquiries().then((d) => setEnquiries(d.enquiries)).catch((e) => console.warn(e.message));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    Promise.resolve(load()).finally(() => setRefreshing(false));
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      data={enquiries}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No venue enquiries submitted yet.</Text>}
      renderItem={({ item: enq }) => (
        <View style={styles.card}>
          <Text style={[styles.status, { color: STATUS_COLORS[enq.status] }]}>{enq.status}</Text>
          <Text style={styles.venueName}>{enq.venueName}</Text>
          <Text style={styles.detail}>{enq.location}</Text>
          <Text style={styles.detail}>
            {new Date(enq.eventDate).toLocaleDateString()} · {enq.guestCount} guests
          </Text>
          {!!enq.adminNote && <Text style={styles.adminNote}>Admin note: {enq.adminNote}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  status: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", marginBottom: 4 },
  venueName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  detail: { fontSize: 13, color: colors.inkFaint },
  adminNote: { fontSize: 12, color: colors.ink, marginTop: 6, fontStyle: "italic" },
});
