import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Check, ChevronRight, ExternalLink, LogOut, ShieldCheck, Trash2 } from "lucide-react-native";
import { ScreenHeader } from "~/components/screen-header";
import { Card } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { confirm } from "~/lib/confirm";
import { initials } from "~/lib/format";
import { useOrganization } from "~/lib/organization";
import { SITE_URL } from "~/lib/env";
import { colors } from "~/lib/theme";

function Row({ icon, label, detail, onPress, danger }: { icon: ReactNode; label: string; detail?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.canvas }]} accessibilityRole="button">
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {!danger ? <ChevronRight size={18} color={colors.faint} /> : null}
    </Pressable>
  );
}

export default function AccountScreen() {
  const { session, signOut, aal } = useAuth();
  const { memberships, active, switchTo, isGuest } = useOrganization();
  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email || "";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader title="Compte" />
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {session?.user.email}
            </Text>
          </View>
        </View>

        {memberships.length > 1 ? (
          <>
            <Text style={styles.section}>Organisation</Text>
            <Card style={styles.card}>
              {memberships.map((m, i) => (
                <Pressable
                  key={m.organization.id}
                  onPress={() => switchTo(m.organization.id)}
                  style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { backgroundColor: colors.canvas }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: m.organization.id === active?.organization.id }}
                >
                  <View style={{ width: 22 }}>{m.organization.id === active?.organization.id ? <Check size={20} color={colors.primary} /> : null}</View>
                  <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>
                    {m.organization.name}
                  </Text>
                  {m.role === "guest" ? <Text style={styles.rowDetail}>invité</Text> : null}
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={styles.section}>{active?.organization.name}</Text>
        <Card style={styles.card}>
          <Row
            icon={<ShieldCheck size={21} color={colors.muted} />}
            label="Sécurité"
            detail={aal === "aal2" ? "Double authentification active" : "Double authentification"}
            onPress={() => router.push("/security")}
          />
          {!isGuest ? (
            <View style={styles.border}>
              <Row icon={<Trash2 size={21} color={colors.muted} />} label="Corbeille" detail="Restaurer un élément supprimé" onPress={() => router.push("/trash")} />
            </View>
          ) : null}
          <View style={styles.border}>
            <Row
              icon={<ExternalLink size={21} color={colors.muted} />}
              label="Ouvrir Docalio sur le web"
              detail="Équipe, invités, journal, abonnement"
              onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/dashboard`)}
            />
          </View>
        </Card>

        <Card style={[styles.card, { marginTop: 24 }]}>
          <Row
            icon={<LogOut size={21} color={colors.danger} />}
            label="Se déconnecter"
            danger
            onPress={async () => {
              if (await confirm("Se déconnecter ?", "Vos fichiers restent dans Docalio.", "Se déconnecter", false)) await signOut();
            }}
          />
        </Card>

        <Text style={styles.version}>
          Docalio {Constants.expoConfig?.version ?? ""} ·{" "}
          <Text style={{ color: colors.primary }} onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/confidentialite`)}>
            Confidentialité
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 20, marginTop: 8 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  name: { fontSize: 18, fontWeight: "600", color: colors.text },
  email: { marginTop: 2, fontSize: 14, color: colors.muted },
  section: { marginTop: 28, marginBottom: 8, marginHorizontal: 20, fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  card: { marginHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, minHeight: 58, paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowLabel: { fontSize: 16, fontWeight: "500", color: colors.text },
  rowDetail: { marginTop: 1, fontSize: 13, color: colors.muted },
  version: { marginTop: 28, textAlign: "center", fontSize: 13, color: colors.faint },
});
