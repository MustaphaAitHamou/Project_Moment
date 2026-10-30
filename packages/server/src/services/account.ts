import { AppError, toAppError } from '@tamurt/core';
import type { AuthUser, ServerContext } from '../context';
import { createAnonClient } from '../supabase';
import { enforceRateLimit } from '../reliability';

/**
 * Suppression de compte (droit à l'effacement) :
 *  1. ré-authentification par mot de passe ;
 *  2. refus si l'utilisateur est l'unique propriétaire d'une organisation ayant des événements ;
 *  3. retrait des annonces de revente actives ;
 *  4. suppression du compte Auth (cascade : profil, favoris, préférences, jetons push…) ;
 *     les commandes et billets sont conservés anonymisés (user_id / owner_id -> NULL).
 */
export async function deleteAccount(ctx: ServerContext, user: AuthUser, password: string): Promise<void> {
  await enforceRateLimit(ctx, `account-delete:${user.id}`, 5, 3600);
  const verifier = createAnonClient(ctx.env.SUPABASE_URL, ctx.env.SUPABASE_ANON_KEY);
  const { error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (signInError) throw new AppError('forbidden', 'mot de passe incorrect');
  await verifier.auth.signOut().catch(() => undefined);

  const { data: memberships } = await ctx.admin.from('organizer_members').select('organizer_id').eq('user_id', user.id).eq('role', 'owner');
  for (const membership of memberships ?? []) {
    const [{ count: otherOwners }, { count: events }] = await Promise.all([
      ctx.admin
        .from('organizer_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('organizer_id', membership.organizer_id)
        .eq('role', 'owner')
        .neq('user_id', user.id),
      ctx.admin.from('events').select('id', { count: 'exact', head: true }).eq('organizer_id', membership.organizer_id).is('deleted_at', null),
    ]);
    if ((otherOwners ?? 0) === 0 && (events ?? 0) > 0) throw new AppError('account_has_owned_organizers');
  }

  const { data: activeListings } = await ctx.admin.from('resale_listings').select('id, status').eq('seller_id', user.id).in('status', ['active', 'reserved']);
  if ((activeListings ?? []).some((l) => l.status === 'reserved')) throw new AppError('listing_reserved');
  for (const listing of activeListings ?? []) {
    await ctx.admin.rpc('resale_cancel_listing', { p_seller_id: user.id, p_listing_id: listing.id });
  }

  // Les organisations sans événement dont l'utilisateur est l'unique propriétaire sont supprimées.
  for (const membership of memberships ?? []) {
    const { count } = await ctx.admin
      .from('organizer_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('organizer_id', membership.organizer_id)
      .neq('user_id', user.id);
    if ((count ?? 0) === 0) await ctx.admin.from('organizer_profiles').delete().eq('id', membership.organizer_id);
  }

  await ctx.admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: 'self',
    action: 'account_deleted',
    entity_type: 'auth.users',
    entity_id: user.id,
    changes: {},
  });
  const { error } = await ctx.admin.auth.admin.deleteUser(user.id);
  if (error) throw toAppError(error);
}
