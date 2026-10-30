import { getMessages } from '@tamurt/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import { Badge, Button, EmptyState } from '../src/components/ui';
import { ThemeProvider } from '../src/providers/theme';

function wrap(children: ReactNode, locale: 'fr' | 'en' = 'fr') {
  return (
    <ThemeProvider>
      <IntlProvider locale={locale} messages={getMessages(locale)} timeZone="UTC">
        {children}
      </IntlProvider>
    </ThemeProvider>
  );
}

describe('kit d’interface mobile', () => {
  it('rend un bouton accessible et déclenche l’action', async () => {
    const onPress = jest.fn();
    await render(wrap(<Button title="Réserver" onPress={onPress} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Réserver' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('désactive le bouton pendant le chargement', async () => {
    const onPress = jest.fn();
    await render(wrap(<Button title="Payer" loading onPress={onPress} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Payer' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('affiche un état vide et un badge de démonstration traduits', async () => {
    const messages = getMessages('en');
    await render(wrap(<><EmptyState title={messages.tickets.empty} /><Badge label={messages.app.demoBadge} tone="demo" /></>, 'en'));
    expect(screen.getByText(messages.tickets.empty)).toBeTruthy();
    expect(screen.getByText(messages.app.demoBadge)).toBeTruthy();
  });
});
