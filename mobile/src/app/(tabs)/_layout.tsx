import { Tabs } from "expo-router/tabs";
import { CircleUser, Clock, House, Search } from "lucide-react-native";
import { OrgGate } from "~/components/org-gate";
import { colors } from "~/lib/theme";

export default function TabsLayout() {
  return (
    <OrgGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
        <Tabs.Screen name="recents" options={{ title: "Récents", tabBarIcon: ({ color, size }) => <Clock color={color} size={size} /> }} />
        <Tabs.Screen name="search" options={{ title: "Rechercher", tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
        <Tabs.Screen name="account" options={{ title: "Compte", tabBarIcon: ({ color, size }) => <CircleUser color={color} size={size} /> }} />
      </Tabs>
    </OrgGate>
  );
}
