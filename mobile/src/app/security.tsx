import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Copy, ExternalLink, KeyRound, Smartphone } from "lucide-react-native";
import { Button, Card, ErrorText, Field, Loading } from "~/components/ui";
import { useToast } from "~/components/toast";
import { useAuth } from "~/lib/auth";
import { confirm } from "~/lib/confirm";
import { shortDate } from "~/lib/format";
import { supabase } from "~/lib/supabase";
import { colors, radius } from "~/lib/theme";

/**
 * Double authentification (TOTP), comme sur le site. Sur un téléphone, la
 * clé s'ajoute directement à l'application d'authentification (lien otpauth)
 * ou se copie ; on confirme ensuite avec le code à 6 chiffres.
 */
export default function SecurityScreen() {
  const toast = useToast();
  const { reload } = useAuth();
  const queryClient = useQueryClient();
  const factors = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      return (data?.totp ?? []).filter((f) => f.status === "verified");
    },
  });
  const [enrolling, setEnrolling] = useState<{ id: string; secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Docalio mobile ${new Date().toLocaleDateString("fr-FR")}`,
    });
    setBusy(false);
    if (err || !data) return setError("Activation impossible pour le moment. Réessayez.");
    setEnrolling({ id: data.id, secret: data.totp.secret, uri: data.totp.uri });
  }

  async function verify() {
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.replace(/\s/g, "") });
    if (err) {
      setBusy(false);
      return setError("Code incorrect. Vérifiez l'heure du téléphone et réessayez avec le code affiché.");
    }
    await reload();
    setBusy(false);
    setEnrolling(null);
    setCode("");
    queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    toast.show("Double authentification activée.");
  }

  async function disable(factorId: string) {
    const ok = await confirm(
      "Désactiver la double authentification ?",
      "Votre mot de passe suffira de nouveau pour vous connecter. Si votre organisation l'exige, l'accès aux fichiers sera bloqué.",
      "Désactiver",
    );
    if (!ok) return;
    setBusy(true);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (err) return toast.error("Désactivation impossible. Reconnectez-vous puis réessayez.");
    await reload();
    queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    toast.show("Double authentification désactivée.");
  }

  if (factors.isPending) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      {enrolling ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Text style={styles.step}>1. Ajoutez Docalio à votre application d&apos;authentification</Text>
          <Text style={styles.muted}>Google Authenticator, Microsoft Authenticator, 1Password…</Text>
          <Button
            label="Ajouter à l'application d'authentification"
            variant="outline"
            icon={<ExternalLink size={18} color={colors.text} />}
            onPress={() => Linking.openURL(enrolling.uri).catch(() => toast.error("Aucune application compatible : copiez la clé."))}
          />
          <Pressable accessibilityRole="button"
            onPress={async () => {
              await Clipboard.setStringAsync(enrolling.secret);
              toast.show("Clé copiée.");
            }}
            style={styles.secret}
            accessibilityLabel="Copier la clé"
          >
            <Text selectable style={styles.secretText}>
              {enrolling.secret.replace(/(.{4})/g, "$1 ").trim()}
            </Text>
            <Copy size={18} color={colors.muted} />
          </Pressable>
          <Text style={styles.step}>2. Saisissez le code à 6 chiffres affiché</Text>
          <Field
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^\d ]/g, ""))}
            placeholder="123 456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={7}
            style={{ textAlign: "center", fontSize: 20, letterSpacing: 5 }}
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Activer" onPress={verify} loading={busy} disabled={code.replace(/\s/g, "").length < 6} />
          <Button label="Annuler" variant="ghost" onPress={() => setEnrolling(null)} disabled={busy} />
        </Card>
      ) : factors.data && factors.data.length > 0 ? (
        <>
          <View style={styles.ok}>
            <CircleCheck size={20} color={colors.success} />
            <Text style={styles.okText}>La double authentification est active sur votre compte.</Text>
          </View>
          <Card>
            {factors.data.map((f) => (
              <View key={f.id} style={styles.factor}>
                <Smartphone size={20} color={colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.factorName}>{f.friendly_name ?? "Application d'authentification"}</Text>
                  <Text style={styles.muted}>Ajoutée le {shortDate(f.created_at)}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => disable(f.id)} disabled={busy} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 15 }}>Désactiver</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <KeyRound size={20} color={colors.muted} />
            <Text style={[styles.muted, { flex: 1, fontSize: 15, lineHeight: 21 }]}>
              En plus de votre mot de passe, un code temporaire généré par votre téléphone vous sera demandé à chaque connexion.
              Même avec votre mot de passe, personne ne pourra accéder à vos fichiers.
            </Text>
          </View>
          <ErrorText>{error}</ErrorText>
          <Button label="Activer la double authentification" onPress={start} loading={busy} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  step: { fontSize: 16, fontWeight: "600", color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  secret: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.canvas, borderRadius: radius.md, padding: 14 },
  secretText: { flex: 1, fontFamily: "monospace", fontSize: 15, color: colors.text, letterSpacing: 1 },
  ok: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.successSubtle, borderRadius: radius.md, padding: 14 },
  okText: { flex: 1, color: "#065f46", fontSize: 15 },
  factor: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  factorName: { fontSize: 16, fontWeight: "500", color: colors.text },
});
