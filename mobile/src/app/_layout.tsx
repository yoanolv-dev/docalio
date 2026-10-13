import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "~/lib/auth";
import { OrganizationProvider, useOrganization } from "~/lib/organization";
import { UploadsProvider } from "~/lib/uploads";
import { ToastProvider } from "~/components/toast";
import { colors } from "~/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Cache en mémoire : navigation instantanée entre écrans déjà vus, données
// rafraîchies en arrière-plan au retour dans l'application.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 15 * 60_000, retry: 1, refetchOnWindowFocus: true },
  },
});

if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (s) => setFocused(s === "active"));
    return () => sub.remove();
  });
}

function RootNavigator() {
  const { status } = useAuth();
  const org = useOrganization();
  // Écran de démarrage jusqu'à la session et, une fois connecté, l'organisation.
  const ready = status !== "loading" && !(status === "signedIn" && org.loading);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "600" },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "mfa"}>
        <Stack.Screen name="verification" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="space/[id]" options={{ title: "" }} />
        <Stack.Screen name="file/[id]" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
        <Stack.Screen name="trash" options={{ title: "Corbeille" }} />
        <Stack.Screen name="security" options={{ title: "Sécurité" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrganizationProvider>
            <ToastProvider>
              <UploadsProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </UploadsProvider>
            </ToastProvider>
          </OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
