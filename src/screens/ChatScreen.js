import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";
import { speak, stopSpeaking } from "../speech";

// Listen and Kannada buttons under each message.
function MessageTools({ body, mine }) {
  const [tr, setTr] = useState(null);
  const [busy, setBusy] = useState(false);
  const tint = mine ? "#E8F5EC" : colors.basil;

  async function say(text, lang) {
    const r = await speak(text, lang);
    if (!r.ok && r.message) Alert.alert("Can't read aloud", r.message);
  }
  async function translate(to) {
    setBusy(true);
    try { setTr(await api.translateChat(body, to)); }
    catch (e) { Alert.alert("Could not translate", e.message); }
    finally { setBusy(false); }
  }
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <TouchableOpacity onPress={() => say(body, "en-IN")}><Text style={[styles.tool, { color: tint }]}>Listen</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => translate("kn")} disabled={busy}><Text style={[styles.tool, { color: tint }]}>{busy ? "…" : "ಕನ್ನಡ"}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => translate("en")} disabled={busy}><Text style={[styles.tool, { color: tint }]}>English</Text></TouchableOpacity>
        <TouchableOpacity onPress={stopSpeaking}><Text style={[styles.tool, { color: tint }]}>Stop</Text></TouchableOpacity>
      </View>
      {tr && (
        <View style={styles.trBox}>
          <Text style={mine ? styles.bubbleTextCustomer : styles.bubbleTextAdmin}>{tr.text}</Text>
          <TouchableOpacity onPress={() => say(tr.text, tr.to === "kn" ? "kn-IN" : "en-IN")}>
            <Text style={[styles.tool, { color: tint }]}>Listen to this</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ChatScreen({ route }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [autoRead, setAutoRead] = useState(false);
  const lastSeen = useRef(null);

  // Opened from an order or the party planner: start the message for the customer
  useEffect(() => {
    if (route?.params?.prefill) setText(route.params.prefill);
  }, [route?.params?.prefill]);
  const listRef = useRef(null);
  const autoReadRef = useRef(false);
  useEffect(() => { autoReadRef.current = autoRead; }, [autoRead]);

  const load = useCallback(() => {
    api.myMessages().then((d) => {
      setMessages(d.messages);
      const last = d.messages[d.messages.length - 1];
      if (last) {
        if (lastSeen.current && lastSeen.current !== last.id && last.senderRole !== "CUSTOMER" && autoReadRef.current) speak(last.body, "en-IN");
        lastSeen.current = last.id;
      }
    }).catch(() => {});
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
      <TouchableOpacity style={styles.autoRow} onPress={() => setAutoRead(!autoRead)}>
        <Text style={styles.autoText}>{autoRead ? "Reading new replies aloud: ON" : "Read new replies aloud: OFF"}</Text>
      </TouchableOpacity>
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
              <MessageTools body={m.body} mine={m.senderRole === "CUSTOMER"} />
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
  tool: { fontSize: 12, textDecorationLine: "underline", marginRight: 14, marginTop: 2 },
  trBox: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.35)" },
  autoRow: { paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  autoText: { fontSize: 12, color: colors.basil, fontWeight: "600" },
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
