import 'server-only';
import { createServerContext, type ServerContext } from '@tamurt/server';

let context: ServerContext | null = null;

/** Contexte serveur partagé (client admin, registre des connecteurs, paiements, e-mails). */
export function getServerContext(): ServerContext {
  context ??= createServerContext();
  return context;
}
