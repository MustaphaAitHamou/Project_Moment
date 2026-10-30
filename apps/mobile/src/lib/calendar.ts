import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Ajout au calendrier de l'appareil : la permission n'est demandée qu'au moment où
 * l'utilisateur appuie sur « Ajouter à mon agenda ».
 */
export async function addToDeviceCalendar(input: { title: string; startDate: Date; endDate: Date; location?: string; notes?: string; url?: string; timeZone: string }): Promise<'added' | 'denied' | 'unavailable'> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return 'denied';
  let calendarId: string | undefined;
  if (Platform.OS === 'ios') {
    calendarId = (await Calendar.getDefaultCalendarAsync()).id;
  } else {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    calendarId = (calendars.find((calendar) => calendar.isPrimary && calendar.allowsModifications) ?? calendars.find((calendar) => calendar.allowsModifications))?.id;
  }
  if (!calendarId) return 'unavailable';
  await Calendar.createEventAsync(calendarId, {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location,
    notes: [input.notes, input.url].filter(Boolean).join('\n\n'),
    timeZone: input.timeZone,
  });
  return 'added';
}
