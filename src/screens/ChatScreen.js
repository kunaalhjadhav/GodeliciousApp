import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const load = useCallback(() => {
    api.myMessages().then((d) => setMessages(d.messages)).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 4000);
      return () => clearInterval(interval);
    }, [load])
  );

  async function send() {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    try {
      await api.sendMessage(body);
      load();
    } catch {
      // chat send failures are non-critical; message stays in composer would be nicer,
      // but keeping this simple for the MVP
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.empty}>Send us a message — our team usually replies within a few hours.</Text>
        }
        renderItem={({ item: m }) => (
          <View style={[styles.bubbleRow, m.senderRole === "CUSTOMER" && styles.bubbleRowRight]}>
            <View style={[styles.bubble, m.senderRole === "CUSTOMER" ? styles.bubbleCustomer : styles.bubbleAdmin]}>
              <Text style={m.senderRole === "CUSTOMER" ? styles.bubbleTextCustomer : styles.bubbleTextAdmin}>
                {m.body}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input} value={text} onChangeText={setText}
          placeholder="Type a message…"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.inkFaint, marginTop: spacing.xl, fontSize: 13 },
  bubbleRow: { marginBottom: spacing.sm, alignItems: "flex-start" },
  bubbleRowRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleCustomer: { backgroundColor: colors.saffron },
  bubbleAdmin: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  bubbleTextCustomer: { color: colors.charcoal, fontSize: 14 },
  bubbleTextAdmin: { color: colors.ink, fontSize: 14 },
  inputRow: {
    flexDirection: "row", padding: spacing.sm, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.white,
  },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, marginRight: spacing.sm, color: colors.ink },
  sendBtn: { backgroundColor: colors.charcoal, borderRadius: 4, paddingHorizontal: 16, justifyContent: "center" },
  sendBtnText: { color: colors.paper, fontWeight: "600" },
});
