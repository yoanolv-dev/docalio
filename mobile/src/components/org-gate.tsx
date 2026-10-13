import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Building2, ShieldCheck } from "lucide-react-native";
import { Button, Loading } from "./ui";
import { useAuth } from "~/lib/auth";
import { useOrganization } from "~/lib/organization";
import { SITE_URL } from "~/lib/env";
import { colors } from "~/lib/theme";

/** Écrans d'attente : chargement, aucune organisation, 2FA exigée par l'entreprise. */
export function OrgGate({ children }: { children: ReactNode }) {
  const { loading, active, mfaRequired } = useOrganization();
  const { signOut } = useAuth();
  if (loading) return <Loading />;

  if (!active) {
    return (
      <Gate
        icon={<Building2 size={28} color={colors.primary} />}
        title="Aucune organisation"
        text="Créez votre organisation sur docalio.app, ou ouvrez l'invitation reçue par e-mail, puis revenez ici."
      >
        <Button label="Continuer sur le web" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/onboarding`)} />
        <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
      </Gate>
    );
  }

  if (mfaRequired) {
    return (
      <Gate
        icon={<ShieldCheck size={28} color={colors.primary} />}
        title="Double authentification requise"
        text={`${active.organization.name} exige la double authentification pour accéder aux fichiers. Activez-la en une minute.`}
      >
        <Button label="Activer la double authentification" onPress={() => router.push("/security")} />
        <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
      </Gate>
    );
  }

  return <>{children}</>;
}

function Gate({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      <View style={{ gap: 10, marginTop: 24, alignSelf: "stretch" }}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.canvas },
  icon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 18, fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
  text: { marginTop: 8, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: "center" },
});
