import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = 'tamurt.onboarding.done';

export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) !== null;
  } catch {
    return true;
  }
}

export async function completeOnboarding(country: string | null): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, country ?? 'all');
}
