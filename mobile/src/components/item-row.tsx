import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ellipsis, Link2 } from "lucide-react-native";
import { ItemIcon } from "./item-icon";
import { colors } from "~/lib/theme";

/** Ligne de l'explorateur : dossier ou fichier (miniature pour les images). */
export const ItemRow = memo(function ItemRow({
  kind,
  name,
  mime,
  subtitle,
  thumbnail,
  cacheKey,
  shared,
  onPress,
  onMore,
}: {
  kind: "file" | "folder";
  name: string;
  mime?: string | null;
  subtitle?: string;
  thumbnail?: string;
  /** Clé stable du cache disque des miniatures (l'URL signée change). */
  cacheKey?: string;
  shared?: boolean;
  onPress: () => void;
  onMore?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onMore}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={kind === "folder" ? "Ouvre le dossier" : "Ouvre l'aperçu"}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.canvas }]}
    >
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail, cacheKey }}
          alt=""
          style={styles.thumb}
          contentFit="cover"
          transition={120}
          recyclingKey={cacheKey}
          cachePolicy="memory-disk"
        />
      ) : (
        <ItemIcon kind={kind} name={name} mime={mime} />
      )}
      <View style={styles.text}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {shared ? <Link2 size={14} color={colors.primary} accessibilityLabel="Partagé par lien" /> : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Actions pour ${name}`} style={styles.more}>
          <Ellipsis size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 64, paddingVertical: 10 },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.canvas },
  text: { flex: 1, minWidth: 0 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "500", color: colors.text },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.muted },
  more: { padding: 6 },
});
