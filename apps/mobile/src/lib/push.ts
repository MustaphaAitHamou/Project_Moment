import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MobileApi } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type PushSetupResult = 'registered' | 'denied' | 'unsupported' | 'not_configured';

/**
 * Activation des notifications push APRÈS consentement explicite (bouton dans l'application).
 * Le jeton n'est envoyé au serveur que si l'utilisateur a accepté la permission système.
 */
export async function enablePushNotifications(api: MobileApi): Promise<PushSetupResult> {
  if (!Device.isDevice) return 'unsupported';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Tamurt Events', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return 'not_configured';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.pushTokens.register({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android', deviceName: Device.modelName ?? undefined, appVersion: Constants.expoConfig?.version });
  return 'registered';
}
