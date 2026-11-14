import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  /** Rose néon et son halo. */
  primary: 'bg-primary text-on-primary hover:bg-primary-hover shadow-glow',
  /** Le trait cyan des néons. */
  secondary: 'border-[1.5px] border-accent text-accent hover:bg-accent/10 shadow-glow-cyan',
  outline: 'border border-line-strong bg-surface text-fg hover:bg-sunken',
  ghost: 'text-fg hover:bg-sunken',
  danger: 'bg-danger text-on-danger hover:opacity-90',
  soft: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 p-0',
};

export function buttonClasses(options: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal uppercase tracking-[0.08em] transition-[background-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-55',
    VARIANTS[options.variant ?? 'primary'],
    SIZES[options.size ?? 'md'],
    options.className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant, size, loading, className, children, type = 'button', disabled, ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
