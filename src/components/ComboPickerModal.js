import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { colors, spacing } from "../theme";

export default function ComboPickerModal({ visible, item, onConfirm, onClose }) {
  const [selections, setSelections] = useState({});

  if (!item) return null;

  function selectOption(group, option) {
    setSelections((prev) => ({ ...prev, [group.id]: option }));
  }

  const allGroupsChosen = item.comboGroups.every((g) => selections[g.id]);

  function confirm() {
    const selectedOptions = item.comboGroups.map((g) => ({
      optionId: selections[g.id].id,
      priceDelta: selections[g.id].priceDelta,
      groupName: g.name,
      optionLabel: selections[g.id].label,
    }));
    onConfirm(selectedOptions);
    setSelections({});
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.subtitle}>Customize your combo</Text>

            {item.comboGroups.map((group) => (
              <View key={group.id} style={{ marginBottom: spacing.md }}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.options.map((option) => {
                  const selected = selections[group.id]?.id === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => selectOption(group, option)}
                      style={[styles.option, selected && styles.optionSelected]}
                    >
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {option.priceDelta > 0 && <Text style={styles.optionPrice}>+₹{option.priceDelta}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !allGroupsChosen && { opacity: 0.4 }]}
              onPress={confirm}
              disabled={!allGroupsChosen}
            >
              <Text style={styles.confirmText}>Add to cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(28,27,25,0.6)", justifyContent: "center", padding: spacing.lg },
  sheet: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.lg, maxHeight: "80%" },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkFaint, marginBottom: spacing.md },
  groupName: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  option: {
    flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: colors.line,
    borderRadius: 4, padding: 10, marginBottom: 6,
  },
  optionSelected: { borderColor: colors.saffron2, backgroundColor: "rgba(232,163,61,0.1)" },
  optionLabel: { fontSize: 14, color: colors.ink },
  optionPrice: { fontSize: 13, color: colors.inkFaint },
  actions: { flexDirection: "row", marginTop: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 12, alignItems: "center", marginRight: spacing.sm },
  cancelText: { color: colors.ink, fontSize: 14 },
  confirmBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 4, padding: 12, alignItems: "center" },
  confirmText: { color: colors.paper, fontSize: 14, fontWeight: "600" },
});
