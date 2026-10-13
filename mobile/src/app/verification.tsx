import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { Button, ErrorText, Field } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import { colors } from "~/lib/theme";

/** Deuxième étape de connexion : code à 6 chiffres de l'application d'authentification. */
export default function VerificationScreen() {
  const { reload, signOut, session } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp.find((f) => f.status === "verified");
    if (!factor) {
      setBusy(false);
      return setError("Aucune application d'authentification n'est associée à ce compte.");
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\s/g, "") });
    if (err) {
      setBusy(false);
      return setError("Code incorrect ou expiré. Réessayez avec le code affiché.");
    }
    await reload();
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.icon}>
          <ShieldCheck size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Double authentification</Text>
        <Text style={styles.subtitle}>
          Saisissez le code à 6 chiffres affiché par votre application d&apos;authentification
          {session?.user.email ? ` pour ${session.user.email}` : ""}.
        </Text>
        <View style={{ gap: 14, marginTop: 24 }}>
          <Field
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^\d ]/g, ""))}
            placeholder="123 456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={7}
            autoFocus
            style={{ textAlign: "center", fontSize: 22, letterSpacing: 6, fontVariant: ["tabular-nums"] }}
            onSubmitEditing={verify}
            testID="code"
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Vérifier" onPress={verify} loading={busy} disabled={code.replace(/\s/g, "").length < 6} testID="verify" />
          <Pressable accessibilityRole="button" onPress={signOut} style={{ alignSelf: "center", padding: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Utiliser un autre compte</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, maxWidth: 460, width: "100%", alignSelf: "center" },
  icon: { alignSelf: "center", width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 18, textAlign: "center", fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: 8, textAlign: "center", fontSize: 15, lineHeight: 21, color: colors.muted },
});
