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
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 animate-pulse transition-all duration-200 ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
        Checking…
      </span>
    );
  }

  if (status.available) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs transition-all duration-200 animate-in fade-in-50 zoom-in-95 ${className}`}
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
        Available
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-xs transition-all duration-200 animate-in fade-in-50 zoom-in-95 ${className}`}
    >
      <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
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
 * Only the field being actively edited will show "Checking…". All other fields
 * keep their current status without flickering.
 */
export function useFieldAvailability(options: UseAvailabilityOptions) {
  const {
    email,
    phone,
    licensePlate,
    licenseNumber,
    excludeUserId,
    excludeDriverId,
    debounceMs = 300,
  } = options;

  const [statuses, setStatuses] = useState<Record<string, FieldCheckStatus>>({});

  // Keep track of previously checked values to detect WHICH specific field was typed into
  const lastInputRef = useRef<Record<string, string>>({
    email: (email ?? '').trim(),
    phone: (phone ?? '').trim(),
    licensePlate: (licensePlate ?? '').trim(),
    licenseNumber: (licenseNumber ?? '').trim(),
  });

  // Cache verified values: { [field]: { value: string, status: FieldCheckStatus } }
  const cacheRef = useRef<Record<string, { value: string; status: FieldCheckStatus }>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentValues: Record<string, string> = {
      email: (email ?? '').trim(),
      phone: (phone ?? '').trim(),
      licensePlate: (licensePlate ?? '').trim(),
      licenseNumber: (licenseNumber ?? '').trim(),
    };

    const prevValues = lastInputRef.current;

    // Detect ONLY the fields that actually changed in this update
    const changedFields: string[] = [];
    (['email', 'phone', 'licensePlate', 'licenseNumber'] as const).forEach((field) => {
      if (currentValues[field] !== prevValues[field]) {
        changedFields.push(field);
      }
    });

    // Update previous values ref
    lastInputRef.current = currentValues;

    // If no field values changed (e.g. only props like debounceMs or initial mount), do not alter statuses
    if (changedFields.length === 0) {
      return;
    }

    const updates: Record<string, FieldCheckStatus> = {};
    let hasFieldToQuery = false;

    changedFields.forEach((field) => {
      const val = currentValues[field];
      const minLen = field === 'licensePlate' || field === 'licenseNumber' ? 2 : 3;

      // If value is too short, or if email doesn't have '@' yet, clear its badge
      if (val.length < minLen || (field === 'email' && !val.includes('@'))) {
        updates[field] = { isChecking: false, available: null };
        delete cacheRef.current[field];
        return;
      }

      // If this exact value is already in cache, restore it immediately
      const cached = cacheRef.current[field];
      if (cached && cached.value.toLowerCase() === val.toLowerCase()) {
        updates[field] = cached.status;
        return;
      }

      // ONLY THIS changed field enters "isChecking"
      updates[field] = { isChecking: true, available: null };
      hasFieldToQuery = true;
    });

    // Apply updates ONLY to the changed fields. Untouched fields are untouched!
    setStatuses((prev) => ({ ...prev, ...updates }));

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!hasFieldToQuery) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const query: Record<string, string | undefined> = {
          excludeUserId,
          excludeDriverId,
        };

        if (currentValues.email && currentValues.email.length >= 3 && currentValues.email.includes('@')) {
          query.email = currentValues.email;
        }
        if (currentValues.phone && currentValues.phone.length >= 3) {
          query.phone = currentValues.phone;
        }
        if (currentValues.licensePlate && currentValues.licensePlate.length >= 2) {
          query.licensePlate = currentValues.licensePlate;
        }
        if (currentValues.licenseNumber && currentValues.licenseNumber.length >= 2) {
          query.licenseNumber = currentValues.licenseNumber;
        }

        const queryKeys = Object.keys(query).filter(
          (k) => k !== 'excludeUserId' && k !== 'excludeDriverId' && query[k]
        );

        if (queryKeys.length === 0) {
          return;
        }

        const res = await api.users.checkAvailability(query);

        if (res.fields) {
          const resolved: Record<string, FieldCheckStatus> = {};
          Object.entries(res.fields).forEach(([key, val]) => {
            const checkStatus: FieldCheckStatus = {
              isChecking: false,
              available: val.available,
              message: val.message,
              role: val.role,
            };
            resolved[key] = checkStatus;
            cacheRef.current[key] = {
              value: currentValues[key] ?? '',
              status: checkStatus,
            };
          });

          // Merge resolved results into status, keeping untouched fields unchanged
          setStatuses((prev) => ({ ...prev, ...resolved }));
        }
      } catch {
        // In case of network check failure, clear checking state
        setStatuses((prev) => {
          const reset: Record<string, FieldCheckStatus> = { ...prev };
          Object.keys(reset).forEach((k) => {
            if (reset[k]?.isChecking) {
              reset[k] = { isChecking: false, available: true };
            }
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
    availability: statuses,
    isCheckingAny,
    hasConflict,
    canSubmit: !isCheckingAny && !hasConflict,
  };
}
