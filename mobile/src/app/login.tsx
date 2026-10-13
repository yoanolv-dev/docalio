import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Logo } from "~/components/logo";
import { Button, ErrorText, Field } from "~/components/ui";
import { supabase } from "~/lib/supabase";
import { SITE_URL } from "~/lib/env";
import { colors } from "~/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(
        /invalid login/i.test(err.message)
          ? "E-mail ou mot de passe incorrect."
          : /confirm/i.test(err.message)
            ? "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)."
            : "Connexion impossible. Vérifiez votre connexion internet.",
      );
    }
    // Succès : la navigation suit l'état de session (2FA éventuelle comprise).
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={56} />
            <Text style={styles.title}>Connexion à Docalio</Text>
            <Text style={styles.subtitle}>Vos espaces et vos fichiers, partout.</Text>
          </View>
          <View style={{ gap: 14 }}>
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@entreprise.fr"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="email"
            />
            <Field
              ref={passwordRef}
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={signIn}
              testID="password"
            />
            <ErrorText>{error}</ErrorText>
            <Button label="Se connecter" onPress={signIn} loading={busy} disabled={!email.trim() || !password} testID="submit" />
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/forgot-password`)} style={styles.link}>
              <Text style={styles.linkText}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/register`)} hitSlop={8}>
              <Text style={styles.linkText}>Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, maxWidth: 460, width: "100%", alignSelf: "center" },
  brand: { alignItems: "center", marginBottom: 32 },
  title: { marginTop: 18, fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.4 },
  subtitle: { marginTop: 6, fontSize: 15, color: colors.muted },
  link: { alignSelf: "center", padding: 8 },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  footer: { marginTop: 32, flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center" },
  footerText: { color: colors.muted, fontSize: 15 },
});
