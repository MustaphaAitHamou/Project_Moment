import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { useTheme } from '@/providers/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'caption' | 'label';
const SIZES: Record<TextVariant, TextStyle> = {
  display: { fontSize: 30, fontWeight: '800', lineHeight: 36 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
};

export function AppText({ variant = 'body', style, children, numberOfLines, accessibilityRole }: { variant?: TextVariant; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number; accessibilityRole?: 'header' | 'text' }) {
  const { colors } = useTheme();
  const color = variant === 'muted' ? colors.textMuted : variant === 'caption' ? colors.textSubtle : colors.text;
  return (
    <Text numberOfLines={numberOfLines} accessibilityRole={accessibilityRole ?? (variant === 'title' || variant === 'display' ? 'header' : undefined)} style={[SIZES[variant], { color, writingDirection: 'auto' }, style]}>
      {children}
    </Text>
  );
}

/** Écran défilant avec marges de sécurité (encoche, barre d'onglets). */
export function Screen({ children, scroll = true, padded = true, refreshControl, edges = ['top'] }: { children: ReactNode; scroll?: boolean; padded?: boolean; refreshControl?: ComponentProps<typeof ScrollView>['refreshControl']; edges?: ('top' | 'bottom')[] }) {
  const { colors } = useTheme();
  const content = padded ? { padding: 16, gap: 16 } : undefined;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[content, { paddingBottom: 32 }]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, accessibilityHint }: { title: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string }) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
    secondary: { bg: colors.secondary, fg: '#FFFFFF', border: colors.secondary },
    outline: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.textOnDanger, border: colors.danger },
  };
  const tone = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: tone.bg, borderColor: tone.border, opacity: disabled ? 0.55 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={tone.fg} /> : icon ? <Ionicons name={icon} size={18} color={tone.fg} /> : null}
      <Text style={{ color: tone.fg, fontSize: 15, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 8 }, style]}>{children}</View>;
}

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'demo';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const map: Record<BadgeTone, [string, string]> = {
    neutral: [colors.surfaceSunken, colors.textMuted],
    primary: [colors.primarySoft, colors.primary],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    info: [colors.infoSoft, colors.info],
    demo: [colors.demoSoft, colors.demo],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.text : colors.borderStrong, backgroundColor: selected ? colors.text : colors.surface, paddingHorizontal: 14, paddingVertical: 7 }}>
      <Text style={{ color: selected ? colors.background : colors.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone = 'info', title, text, action }: { tone?: 'info' | 'success' | 'warning' | 'danger' | 'demo'; title?: string; text?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  const map = { info: [colors.infoSoft, colors.info], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger], demo: [colors.demoSoft, colors.demo] } as const;
  const [bg, fg] = map[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={{ flexDirection: 'row', gap: 10, backgroundColor: bg, borderRadius: 12, padding: 12 }}>
      <Ionicons name={tone === 'success' ? 'checkmark-circle' : tone === 'danger' || tone === 'warning' ? 'warning' : 'information-circle'} size={20} color={fg} />
      <View style={{ flex: 1, gap: 4 }}>
        {title ? <AppText variant="label">{title}</AppText> : null}
        {text ? <AppText variant="muted">{text}</AppText> : null}
        {action}
      </View>
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>{title}</AppText>
      {text ? <AppText variant="muted" style={{ textAlign: 'center' }}>{text}</AppText> : null}
      {action}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations('common');
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={{ alignItems: 'center', gap: 12, paddingVertical: 48 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="muted">{label ?? t('loading')}</AppText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useTranslations('common');
  return <EmptyState icon="cloud-offline-outline" title={t('error')} text={message ?? t('unknownError')} action={onRetry ? <Button title={t('retry')} variant="outline" onPress={onRetry} /> : null} />;
}

export function TextField({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        style={{ borderWidth: 1, borderColor: error ? colors.danger : colors.borderStrong, backgroundColor: colors.surface, color: colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: 'auto' }}
        {...props}
      />
      {error ? <AppText variant="caption" style={{ color: colors.danger }}>{error}</AppText> : hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <AppText variant="heading" accessibilityRole="header">{title}</AppText>
      {action}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
});
