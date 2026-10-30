import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, type ColorValue } from 'react-native';
import { useTranslations } from 'use-intl';
import { isOnboardingDone } from '@/lib/onboarding';
import { useTheme } from '@/providers/theme';

/** Cinq onglets (Découvrir, Agenda, Billets, Favoris, Profil) + bouton central « Créer ». */
export default function TabsLayout() {
  const t = useTranslations('nav');
  const { colors } = useTheme();
  const router = useRouter();
  useEffect(() => {
    void isOnboardingDone().then((done) => {
      if (!done) router.push('/onboarding');
    });
  }, [router]);
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
    function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <Ionicons name={focused ? name : (`${name}-outline` as typeof name)} size={24} color={color as string} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('discover'), tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="agenda" options={{ title: t('agenda'), tabBarIcon: icon('calendar') }} />
      <Tabs.Screen
        name="create"
        options={{
          title: t('create'),
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: t('create'),
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, marginTop: -18, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
              <Ionicons name="add" size={30} color={colors.textOnPrimary} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/create');
          },
        }}
      />
      <Tabs.Screen name="tickets" options={{ title: t('tickets'), tabBarIcon: icon('ticket') }} />
      <Tabs.Screen name="favorites" options={{ title: t('favorites'), tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
