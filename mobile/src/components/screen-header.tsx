import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "~/lib/theme";

/** Grand titre des onglets (style iOS), avec action à droite. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        {subtitle ? <View style={{ marginBottom: 2 }}>{typeof subtitle === "string" ? <Text style={styles.subtitle}>{subtitle}</Text> : subtitle}</View> : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: "700", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, fontWeight: "500", color: colors.muted },
});
