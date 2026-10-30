import { getMessages } from '@tamurt/i18n';
import { hasLocale, IntlErrorCode } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: getMessages(locale),
    // Les dates d'événements sont toujours formatées explicitement dans le fuseau de l'événement.
    timeZone: 'UTC',
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) console.warn(error.message);
      else console.error(error);
    },
    getMessageFallback: ({ namespace, key }) => [namespace, key].filter(Boolean).join('.'),
  };
});
