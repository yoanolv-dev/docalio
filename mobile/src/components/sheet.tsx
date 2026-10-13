import { type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius } from "~/lib/theme";

// Feuille du bas (actions, formulaires courts) : modale native, fermeture au
// toucher du fond ou au geste retour Android.

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface SheetAction {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

export function ActionList({ actions, onDone }: { actions: SheetAction[]; onDone: () => void }) {
  return (
    <View style={{ paddingHorizontal: 8 }}>
      {actions
        .filter((a) => !a.hidden)
        .map((a) => {
          const Icon = a.icon;
          const color = a.destructive ? colors.danger : colors.text;
          return (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onDone();
                // Laisse la feuille se fermer avant d'ouvrir une autre modale.
                setTimeout(a.onPress, Platform.OS === "ios" ? 350 : 0);
              }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.canvas }]}
            >
              <Icon size={21} color={a.destructive ? colors.danger : colors.muted} />
              <Text style={[styles.actionLabel, { color }]}>{a.label}</Text>
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    maxHeight: "88%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: 3, fontSize: 14, color: colors.muted },
  action: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.md },
  actionLabel: { fontSize: 16, fontWeight: "500" },
});
