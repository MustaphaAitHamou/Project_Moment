import type { Locale } from '@tamurt/i18n';
import type { EmailMessage } from './adapter';

/**
 * Modèles d'e-mails transactionnels (texte + HTML minimal et accessible).
 * Textes rédigés en français et en anglais ; l'arabe reprend un brouillon signalé comme tel.
 */
type Copy = { subject: string; intro: string; cta: string; outro: string };

const BETA_VERIFY: Record<Locale, Copy> = {
  fr: {
    subject: 'Confirmez votre inscription à Tamurt Beta',
    intro: 'Merci de votre intérêt pour Tamurt Beta. Confirmez votre adresse pour rejoindre la liste d’attente.',
    cta: 'Confirmer mon adresse',
    outro: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.',
  },
  en: {
    subject: 'Confirm your Tamurt Beta sign-up',
    intro: 'Thank you for your interest in Tamurt Beta. Confirm your address to join the waitlist.',
    cta: 'Confirm my address',
    outro: 'If you did not request this, please ignore this email.',
  },
  ar: {
    subject: 'أكّد تسجيلك في Tamurt Beta',
    intro: 'شكرًا لاهتمامك بـ Tamurt Beta. أكّد عنوانك للانضمام إلى قائمة الانتظار.',
    cta: 'تأكيد عنواني',
    outro: 'إذا لم تقم بهذا الطلب، فتجاهل هذه الرسالة.',
  },
};

const BETA_INVITE: Record<Locale, Copy> = {
  fr: {
    subject: 'Votre invitation à Tamurt Beta',
    intro: 'Une place de bêta-testeur vous est réservée. Connectez-vous (ou créez un compte) avec cette adresse, puis saisissez votre code :',
    cta: 'Activer mon accès',
    outro: 'Ce code est personnel et expire dans {days} jours.',
  },
  en: {
    subject: 'Your Tamurt Beta invitation',
    intro: 'A beta tester seat is reserved for you. Log in (or create an account) with this address, then enter your code:',
    cta: 'Activate my access',
    outro: 'This code is personal and expires in {days} days.',
  },
  ar: {
    subject: 'دعوتك إلى Tamurt Beta',
    intro: 'لقد حُجز لك مكان كمختبر. سجّل الدخول (أو أنشئ حسابًا) بهذا العنوان، ثم أدخل رمزك:',
    cta: 'تفعيل وصولي',
    outro: 'هذا الرمز شخصي وتنتهي صلاحيته خلال {days} يومًا.',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function layout(locale: Locale, body: string): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;padding:24px;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#14112B"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px"><tr><td><p style="font-size:20px;font-weight:bold;margin:0 0 16px">Tamurt Events</p>${body}</td></tr></table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#E8401A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

export function betaVerificationEmail(to: string, locale: Locale, verifyUrl: string): EmailMessage {
  const copy = BETA_VERIFY[locale];
  return {
    to,
    subject: copy.subject,
    text: `${copy.intro}\n\n${copy.cta} : ${verifyUrl}\n\n${copy.outro}`,
    html: layout(locale, `<p>${escapeHtml(copy.intro)}</p>${button(verifyUrl, copy.cta)}<p style="font-size:12px;color:#5A556F">${escapeHtml(copy.outro)}</p>`),
  };
}

export function betaInvitationEmail(to: string, locale: Locale, code: string, redeemUrl: string, days: number): EmailMessage {
  const copy = BETA_INVITE[locale];
  const outro = copy.outro.replace('{days}', String(days));
  return {
    to,
    subject: copy.subject,
    text: `${copy.intro}\n\n${code}\n\n${copy.cta} : ${redeemUrl}\n\n${outro}`,
    html: layout(
      locale,
      `<p>${escapeHtml(copy.intro)}</p><p style="font-size:22px;font-weight:bold;letter-spacing:2px;margin:16px 0">${escapeHtml(code)}</p>${button(redeemUrl, copy.cta)}<p style="font-size:12px;color:#5A556F">${escapeHtml(outro)}</p>`,
    ),
  };
}

export function notificationEmail(to: string, locale: Locale, title: string, body: string, url: string, cta: string): EmailMessage {
  return {
    to,
    subject: title,
    text: `${title}\n\n${body}\n\n${url}`,
    html: layout(locale, `<p style="font-size:16px;font-weight:bold">${escapeHtml(title)}</p><p>${escapeHtml(body)}</p>${button(url, cta)}`),
  };
}
