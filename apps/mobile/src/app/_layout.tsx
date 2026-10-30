import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { AppText, Banner, Screen } from '@/components/ui';
import { isConfigured } from '@/lib/env';
import { ApiProvider } from '@/providers/api';
import { AuthProvider, useAuth } from '@/providers/auth';
import { I18nProvider } from '@/providers/i18n';
import { ThemeProvider, useTheme } from '@/providers/theme';

void SplashScreen.preventAutoHideAsync();

function NavigationStack() {
  const { ready } = useAuth();
  const { colors, dark } = useTheme();
  const t = useTranslations();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="events/[slug]" options={{ title: '' }} />
        <Stack.Screen name="search" options={{ title: t('nav.search') }} />
        <Stack.Screen name="map" options={{ title: t('nav.map') }} />
        <Stack.Screen name="checkout/[reservationId]" options={{ title: t('checkout.cart') }} />
        <Stack.Screen name="checkout/confirmation/[orderId]" options={{ title: '', headerBackVisible: false }} />
        <Stack.Screen name="tickets/[id]" options={{ title: t('tickets.ticketDetails') }} />
        <Stack.Screen name="orders" options={{ title: t('orders.title') }} />
        <Stack.Screen name="resale/index" options={{ title: t('resale.title') }} />
        <Stack.Screen name="resale/sell" options={{ title: t('resale.createListing') }} />
        <Stack.Screen name="resale/[transactionId]" options={{ title: t('resale.purchaseTitle') }} />
        <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
        <Stack.Screen name="beta" options={{ title: t('beta.title') }} />
        <Stack.Screen name="organizer" options={{ title: t('nav.organizer') }} />
        <Stack.Screen name="create" options={{ title: t('eventForm.createTitle'), presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auth/login" options={{ title: t('auth.loginTitle'), presentation: 'modal' }} />
        <Stack.Screen name="auth/register" options={{ title: t('auth.registerTitle'), presentation: 'modal' }} />
        <Stack.Screen name="auth/forgot" options={{ title: t('auth.forgotTitle'), presentation: 'modal' }} />
      </Stack>
    </>
  );
}

function MissingConfiguration() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <Screen>
      <AppText variant="title">Tamurt Events</AppText>
      <Banner tone="warning" title="Configuration manquante" text="Définissez EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY et EXPO_PUBLIC_API_URL (voir apps/mobile/.env.example), puis relancez l’application." />
    </Screen>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          {isConfigured ? (
            <AuthProvider>
              <ApiProvider>
                <NavigationStack />
              </ApiProvider>
            </AuthProvider>
          ) : (
            <MissingConfiguration />
          )}
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
