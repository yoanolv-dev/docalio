import { Text, View } from "react-native";
import { initials } from "~/lib/format";

const PALETTE = ["#2563eb", "#7c3aed", "#059669", "#ea580c", "#db2777", "#0891b2", "#4f46e5", "#ca8a04"];

/** Pastille d'un espace : couleur de marque, sinon couleur stable dérivée du nom. */
export function SpaceAvatar({ name, color, size = 44 }: { name: string; color?: string | null; size?: number }) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const bg = color || PALETTE[hash % PALETTE.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}
