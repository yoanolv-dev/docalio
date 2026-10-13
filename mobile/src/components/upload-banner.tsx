import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CircleAlert, CircleCheck, CloudUpload, X } from "lucide-react-native";
import { useUploads } from "~/lib/uploads";
import { colors, radius } from "~/lib/theme";

/** Suivi des envois en cours (bas de l'écran), détail au toucher. */
export function UploadBanner({ bottom = 16 }: { bottom?: number }) {
  const { items, active, clearFinished } = useUploads();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const progress = items.reduce((s, i) => s + (i.status === "error" ? 1 : i.progress), 0) / items.length;
  const title = active
    ? `Envoi de ${items.length - done - failed} fichier${items.length - done - failed > 1 ? "s" : ""}…`
    : failed
      ? `${failed} envoi${failed > 1 ? "s" : ""} en échec`
      : `${done} fichier${done > 1 ? "s" : ""} ajouté${done > 1 ? "s" : ""}`;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.card}>
        <Pressable style={styles.head} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={title}>
          {active ? (
            <CloudUpload size={20} color={colors.primary} />
          ) : failed ? (
            <CircleAlert size={20} color={colors.danger} />
          ) : (
            <CircleCheck size={20} color={colors.success} />
          )}
          <Text style={styles.title}>{title}</Text>
          {!active ? (
            <Pressable accessibilityRole="button" onPress={clearFinished} hitSlop={10} accessibilityLabel="Fermer">
              <X size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </Pressable>
        {active ? (
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        ) : null}
        {open ? (
          <ScrollView style={{ maxHeight: 220 }}>
            {items.map((i) => (
              <View key={i.id} style={styles.item}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={[styles.itemState, i.status === "error" && { color: colors.danger }]} numberOfLines={2}>
                  {i.status === "error"
                    ? i.message
                    : i.status === "done"
                      ? "Ajouté"
                      : i.status === "queued"
                        ? "En attente"
                        : `${Math.round(i.progress * 100)} %`}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 52 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  track: { height: 3, backgroundColor: colors.canvas },
  bar: { height: 3, backgroundColor: colors.primary },
  item: { paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontSize: 14, color: colors.text },
  itemState: { fontSize: 13, color: colors.muted, marginTop: 1 },
});
