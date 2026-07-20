import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

const variantes = {
  primary: 'bg-acento text-fondo hover:bg-acento-hover font-medium',
  secondary: 'bg-panel-alto text-texto hover:bg-borde border border-borde',
  ghost: 'bg-transparent text-texto-secundario hover:text-texto hover:bg-panel-alto',
  danger: 'bg-peligro-suave text-peligro hover:bg-peligro hover:text-texto',
};

const tamanos = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
        variantes[variant],
        tamanos[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
