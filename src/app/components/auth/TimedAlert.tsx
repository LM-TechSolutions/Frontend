import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../ui/utils';

export interface TimedAlertProps {
  message: string | null | undefined;
  title?: string;
  durationMs?: number;
  variant?: 'error' | 'warning' | 'success' | 'info';
  onDismiss?: () => void;
  className?: string;
}

export function TimedAlert({
  message,
  title,
  durationMs = 6000,
  onDismiss,
  variant = 'error',
  className,
}: TimedAlertProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingMsRef = useRef<number>(durationMs);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!message) {
      setProgress(100);
      return;
    }

    remainingMsRef.current = durationMs;
    startTimeRef.current = Date.now();
    setProgress(100);

    const updateProgress = () => {
      if (isPaused) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingMsRef.current - elapsed);
      const percent = (remaining / durationMs) * 100;
      setProgress(percent);

      if (remaining <= 0) {
        if (onDismiss) onDismiss();
      } else {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [message, durationMs, isPaused, onDismiss]);

  if (!message) return null;

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const variantStyles = {
    error: {
      bg: 'bg-rose-500/10 dark:bg-rose-950/40',
      border: 'border-rose-500/30 dark:border-rose-500/40',
      text: 'text-rose-900 dark:text-rose-200',
      iconColor: 'text-rose-600 dark:text-rose-400',
      bar: 'bg-rose-500',
      Icon: AlertCircle,
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      border: 'border-amber-500/30 dark:border-amber-500/40',
      text: 'text-amber-900 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500',
      Icon: AlertTriangle,
    },
    success: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      border: 'border-emerald-500/30 dark:border-emerald-500/40',
      text: 'text-emerald-900 dark:text-emerald-200',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bar: 'bg-emerald-500',
      Icon: CheckCircle2,
    },
    info: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-950/40',
      border: 'border-cyan-500/30 dark:border-cyan-500/40',
      text: 'text-cyan-900 dark:text-cyan-200',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      bar: 'bg-cyan-500',
      Icon: Info,
    },
  }[variant];

  const IconComponent = variantStyles.Icon;

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-3.5 shadow-sm transition-all duration-200 animate-in fade-in-50 slide-in-from-top-2',
        variantStyles.bg,
        variantStyles.border,
        variantStyles.text,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', variantStyles.iconColor)}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          {title && <p className="font-semibold text-xs uppercase tracking-wider mb-0.5 opacity-90">{title}</p>}
          <p className="text-sm font-medium leading-relaxed break-words">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Timed Drain Progress Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
        <div
          className={cn('h-full transition-all ease-linear', variantStyles.bar)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

