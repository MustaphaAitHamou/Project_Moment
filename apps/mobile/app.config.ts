import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuration Expo. Les identifiants de publication (bundle iOS, package Android, projet EAS,
 * clé Google Maps Android) viennent de l'environnement : aucune valeur secrète n'est codée en dur.
 * Les identifiants par défaut sont à CONFIRMER par Tamurt Services LLC avant la première soumission.
 */
const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'preview' | 'production';
const suffix = APP_ENV === 'production' ? '' : APP_ENV === 'preview' ? '.preview' : '.dev';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.tamurtservices.events';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.tamurtservices.events';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'production' ? 'Tamurt Events' : `Tamurt Events (${APP_ENV})`,
  slug: 'tamurt-events',
  owner: process.env.EXPO_OWNER || undefined,
  scheme: 'tamurt',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    bundleIdentifier: `${IOS_BUNDLE_ID}${suffix}`,
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Votre position est utilisée uniquement, à votre demande, pour trouver des événements proches. Elle n’est pas enregistrée.',
      NSCalendarsUsageDescription: 'Permet d’ajouter un événement à votre calendrier, uniquement lorsque vous le demandez.',
      NSCalendarsWriteOnlyAccessUsageDescription: 'Permet d’ajouter un événement à votre calendrier, uniquement lorsque vous le demandez.',
    },
  },
  android: {
    package: `${ANDROID_PACKAGE}${suffix}`,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#140A2E' },
    permissions: ['ACCESS_COARSE_LOCATION', 'READ_CALENDAR', 'WRITE_CALENDAR', 'POST_NOTIFICATIONS'],
    blockedPermissions: ['ACCESS_BACKGROUND_LOCATION', 'RECORD_AUDIO'],
    ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? { config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } } } : {}),
    intentFilters: process.env.EXPO_PUBLIC_WEB_HOST
      ? [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host: process.env.EXPO_PUBLIC_WEB_HOST, pathPrefix: '/fr/events' }, { scheme: 'https', host: process.env.EXPO_PUBLIC_WEB_HOST, pathPrefix: '/en/events' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ]
      : undefined,
  },
  locales: { fr: './locales/ios/fr.json', en: './locales/ios/en.json' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, resizeMode: 'contain', backgroundColor: '#140A2E', dark: { backgroundColor: '#140A2E' } }],
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#FF4FA3' }],
    ['expo-location', { locationWhenInUsePermission: 'Votre position est utilisée uniquement, à votre demande, pour trouver des événements proches.' }],
    ['expo-calendar', { calendarPermission: 'Permet d’ajouter un événement à votre calendrier, uniquement lorsque vous le demandez.' }],
  ],
  extra: {
    appEnv: APP_ENV,
    hasGoogleMapsKey: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY),
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
});
