import { Redirect } from 'expo-router';

/** Onglet technique : le bouton central ouvre l'écran modal de création. */
export default function CreateTab() {
  return <Redirect href="/create" />;
}
