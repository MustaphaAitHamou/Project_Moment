import type { EmailOtpType } from '@supabase/supabase-js';
import { isLocale } from '@tamurt/i18n';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeReturnPath } from '@/lib/utils';

const ALLOWED_TYPES: readonly EmailOtpType[] = ['signup', 'recovery', 'email_change', 'invite', 'magiclink', 'email'];

/**
 * Lien de confirmation des e-mails Supabase (inscription, réinitialisation, changement d'adresse).
 * Le jeton est vérifié côté serveur (verifyOtp) puis la session est posée en cookie.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  let next = safeReturnPath(params.get('next'), '/fr/account');

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      // Respecte la langue du profil si le lien a été généré avec la langue par défaut.
      const { data: profile } = await supabase.from('profiles').select('locale').eq('id', data.user.id).maybeSingle();
      const [, first, ...rest] = next.split('/');
      if (profile?.locale && isLocale(profile.locale) && first && isLocale(first)) next = `/${[profile.locale, ...rest].join('/')}`;
      const target = new URL(next, request.url);
      if (type === 'signup' || type === 'email_change') target.searchParams.set('confirmed', '1');
      return NextResponse.redirect(target);
    }
  }
  const [, first] = next.split('/');
  const locale = first && isLocale(first) ? first : 'fr';
  return NextResponse.redirect(new URL(`/${locale}/auth/login?error=confirmation_failed`, request.url));
}
