import React, { useEffect, useState, useRef, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export interface FieldCheckStatus {
  isChecking: boolean;
  available: boolean | null;
  message?: string;
  role?: string;
}

interface BadgeProps {
  status?: FieldCheckStatus;
  className?: string;
}

/**
 * A beautiful, polished micro-badge for displaying real-time uniqueness validation.
 */
export function FieldAvailabilityBadge({ status, className = '' }: BadgeProps) {
  if (!status || (status.available === null && !status.isChecking)) {
    return null;
  }

  if (status.isChecking) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/60 animate-pulse ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Checking...
      </span>
    );
  }

  if (status.available) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs transition-all duration-200 ${className}`}
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
        Available
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/25 shadow-xs transition-all duration-200 ${className}`}
    >
      <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
      <span>{status.message || 'Already in use'}</span>
    </span>
  );
}

interface UseAvailabilityOptions {
  email?: string;
  phone?: string;
  licensePlate?: string;
  licenseNumber?: string;
  excludeUserId?: string;
  excludeDriverId?: string;
  debounceMs?: number;
}

/**
 * Hook to manage real-time debounced uniqueness checking against the backend.
 */
export function useFieldAvailability(options: UseAvailabilityOptions) {
  const {
    email,
    phone,
    licensePlate,
    licenseNumber,
    excludeUserId,
    excludeDriverId,
    debounceMs = 350,
  } = options;

  const [statuses, setStatuses] = useState<Record<string, FieldCheckStatus>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const hasAny = Boolean(
      (email && email.trim().length > 3) ||
      (phone && phone.trim().length >= 4) ||
      (licensePlate && licensePlate.trim().length >= 2) ||
      (licenseNumber && licenseNumber.trim().length >= 2)
    );

    if (!hasAny) {
      setStatuses({});
      return;
    }

    // Set checking state for non-empty fields
    const nextChecking: Record<string, FieldCheckStatus> = {};
    if (email && email.trim().length > 3 && /\S+@\S+\.\S+/.test(email.trim())) {
      nextChecking.email = { isChecking: true, available: null };
    }
    if (phone && phone.trim().length >= 4) {
      nextChecking.phone = { isChecking: true, available: null };
    }
    if (licensePlate && licensePlate.trim().length >= 2) {
      nextChecking.licensePlate = { isChecking: true, available: null };
    }
    if (licenseNumber && licenseNumber.trim().length >= 2) {
      nextChecking.licenseNumber = { isChecking: true, available: null };
    }

    setStatuses((prev) => ({ ...prev, ...nextChecking }));

    timerRef.current = setTimeout(async () => {
      try {
        const query: Record<string, string | undefined> = {
          excludeUserId,
          excludeDriverId,
        };

        if (email && email.trim().length > 3 && /\S+@\S+\.\S+/.test(email.trim())) {
          query.email = email.trim();
        }
        if (phone && phone.trim().length >= 4) {
          query.phone = phone.trim();
        }
        if (licensePlate && licensePlate.trim().length >= 2) {
          query.licensePlate = licensePlate.trim();
        }
        if (licenseNumber && licenseNumber.trim().length >= 2) {
          query.licenseNumber = licenseNumber.trim();
        }

        const res = await api.users.checkAvailability(query);
        const resolved: Record<string, FieldCheckStatus> = {};

        if (res.fields) {
          Object.entries(res.fields).forEach(([key, val]) => {
            resolved[key] = {
              isChecking: false,
              available: val.available,
              message: val.message,
              role: val.role,
            };
          });
        }

        setStatuses(resolved);
      } catch {
        // In case of network check failure, clear checking state
        setStatuses((prev) => {
          const reset: Record<string, FieldCheckStatus> = {};
          Object.keys(prev).forEach((k) => {
            reset[k] = { isChecking: false, available: true };
          });
          return reset;
        });
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email, phone, licensePlate, licenseNumber, excludeUserId, excludeDriverId, debounceMs]);

  // Are any fields currently being checked?
  const isCheckingAny = useMemo(
    () => Object.values(statuses).some((s) => s.isChecking),
    [statuses]
  );

  // Are any fields confirmed unavailable/taken?
  const hasConflict = useMemo(
    () => Object.values(statuses).some((s) => s.available === false),
    [statuses]
  );

  return {
    statuses,
    isCheckingAny,
    hasConflict,
    canSubmit: !isCheckingAny && !hasConflict,
  };
}
