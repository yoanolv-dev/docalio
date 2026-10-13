import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { FolderInput, House } from "lucide-react-native";
import { Sheet } from "./sheet";
import { collectDescendantIds } from "~/lib/shared";
import type { FolderNode } from "~/lib/api";
import { colors, radius } from "~/lib/theme";

/** Choix du dossier de destination (même espace), en arborescence. */
export function MoveSheet({
  visible,
  name,
  tree,
  movingFolderId,
  currentParentId,
  onClose,
  onPick,
}: {
  visible: boolean;
  name: string;
  tree: FolderNode[];
  movingFolderId: string | null;
  currentParentId: string | null;
  onClose: () => void;
  onPick: (folderId: string | null) => void;
}) {
  const rows = useMemo(() => {
    const blocked = movingFolderId ? collectDescendantIds(tree, movingFolderId) : new Set<string>();
    const children = new Map<string | null, FolderNode[]>();
    for (const f of tree) {
      const list = children.get(f.parent_id) ?? [];
      list.push(f);
      children.set(f.parent_id, list);
    }
    const out: { node: FolderNode; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const f of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
        if (blocked.has(f.id)) continue;
        out.push({ node: f, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [tree, movingFolderId]);

  return (
    <Sheet visible={visible} onClose={onClose} title={`Déplacer « ${name} »`} subtitle="Choisissez le dossier de destination.">
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        <Pressable accessibilityRole="button"
          disabled={currentParentId === null}
          onPress={() => onPick(null)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed, currentParentId === null && styles.current]}
        >
          <House size={20} color={colors.muted} />
          <Text style={styles.name}>Racine de l&apos;espace</Text>
        </Pressable>
        {rows.map(({ node, depth }) => (
          <Pressable accessibilityRole="button"
            key={node.id}
            disabled={node.id === currentParentId}
            onPress={() => onPick(node.id)}
            style={({ pressed }) => [styles.row, { paddingLeft: 12 + depth * 18 }, pressed && styles.pressed, node.id === currentParentId && styles.current]}
          >
            <FolderInput size={20} color="#0284c7" />
            <Text style={styles.name} numberOfLines={1}>
              {node.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md },
  pressed: { backgroundColor: colors.canvas },
  current: { opacity: 0.4 },
  name: { flex: 1, fontSize: 16, color: colors.text },
});
