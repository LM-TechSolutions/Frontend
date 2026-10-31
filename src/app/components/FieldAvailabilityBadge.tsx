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

export interface UseAvailabilityOptions {
  email?: string;
  phone?: string;
  licensePlate?: string;
  licenseNumber?: string;
  excludeUserId?: string;
  excludeDriverId?: string;
  debounceMs?: number;
  /**
   * For edit forms: pass the entity's existing values.
   * If the field's current value is unchanged from initialValues,
   * no backend check is performed and no conflict or badge is shown.
   */
  initialValues?: {
    email?: string | null;
    phone?: string | null;
    licensePlate?: string | null;
    licenseNumber?: string | null;
  };
}

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  let digits = p.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 9 && digits.startsWith('9')) {
    digits = '0' + digits;
  }
  return digits;
}

function normalizeLicense(val?: string | null): string {
  if (!val) return '';
  return val.trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizeEmail(val?: string | null): string {
  if (!val) return '';
  return val.trim().toLowerCase();
}

/**
 * Tests whether a current field value is identical to its initial loaded value in an edit form.
 */
export function isFieldUnchanged(
  field: string,
  currentVal?: string | null,
  initialVal?: string | null
): boolean {
  if (initialVal === undefined || initialVal === null) return false;
  const c = (currentVal ?? '').trim();
  const i = (initialVal ?? '').trim();
  if (!c && !i) return true;

  if (field === 'phone') {
    const normC = normalizePhone(c);
    const normI = normalizePhone(i);
    return normC.length > 0 && normC === normI;
  }
  if (field === 'email') {
    const normC = normalizeEmail(c);
    const normI = normalizeEmail(i);
    return normC.length > 0 && normC === normI;
  }
  if (field === 'licensePlate' || field === 'licenseNumber') {
    const normC = normalizeLicense(c);
    const normI = normalizeLicense(i);
    return normC.length > 0 && normC === normI;
  }
  return c === i;
}

/**
 * Hook to manage real-time debounced uniqueness checking against the backend.
 * - In edit forms, unchanged initial values are NEVER checked and display no badges.
 * - Only fields actively modified away from their initial values are checked.
 * - Returning to the original value immediately clears checking & conflicts.
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
    initialValues,
  } = options;

  const [statuses, setStatuses] = useState<Record<string, FieldCheckStatus>>({});

  // Keep track of previously processed input values
  const lastInputRef = useRef<Record<string, string>>({
    email: (email ?? '').trim(),
    phone: (phone ?? '').trim(),
    licensePlate: (licensePlate ?? '').trim(),
    licenseNumber: (licenseNumber ?? '').trim(),
  });

  // Keep track of previous initial values to detect when editing target changed (e.g. opened new edit modal)
  const lastInitRef = useRef<Record<string, string | null | undefined>>({});

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
    const prevInit = lastInitRef.current;
    const curInit = initialValues ?? {};

    // Check if initial values changed (e.g. edit dialog opened for a different record)
    const initChanged = (['email', 'phone', 'licensePlate', 'licenseNumber'] as const).some(
      (k) => curInit[k] !== prevInit[k]
    );

    // Detect fields that changed in value or context
    const changedFields: string[] = [];
    (['email', 'phone', 'licensePlate', 'licenseNumber'] as const).forEach((field) => {
      if (currentValues[field] !== prevValues[field] || initChanged) {
        changedFields.push(field);
      }
    });

    // Update refs
    lastInputRef.current = currentValues;
    lastInitRef.current = { ...curInit };

    if (changedFields.length === 0) {
      return;
    }

    const updates: Record<string, FieldCheckStatus> = {};
    const fieldsToQuery: string[] = [];

    changedFields.forEach((field) => {
      const val = currentValues[field];
      const initialVal = curInit[field as keyof typeof curInit];

      // 1. If this field is unchanged from initial value in an edit form:
      // DO NOT CHECK IT! Clear any previous badge or conflict.
      if (isFieldUnchanged(field, val, initialVal)) {
        updates[field] = { isChecking: false, available: null };
        delete cacheRef.current[field];
        return;
      }

      const minLen = field === 'licensePlate' || field === 'licenseNumber' ? 2 : 3;

      // 2. If value is too short, or if email doesn't have '@' yet, clear badge
      if (val.length < minLen || (field === 'email' && !val.includes('@'))) {
        updates[field] = { isChecking: false, available: null };
        delete cacheRef.current[field];
        return;
      }

      // 3. If exact value was cached, restore it immediately
      const cached = cacheRef.current[field];
      if (cached && cached.value.toLowerCase() === val.toLowerCase()) {
        updates[field] = cached.status;
        return;
      }

      // 4. Field was modified and needs debounced backend verification
      updates[field] = { isChecking: true, available: null };
      fieldsToQuery.push(field);
    });

    // Apply updates immediately
    setStatuses((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(updates).forEach(([k, v]) => {
        const cur = prev[k];
        if (!cur || cur.isChecking !== v.isChecking || cur.available !== v.available || cur.message !== v.message) {
          next[k] = v;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (fieldsToQuery.length === 0) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const query: Record<string, string | undefined> = {
          excludeUserId,
          excludeDriverId,
        };

        // ONLY include fields that actually need querying (and are not unchanged!)
        fieldsToQuery.forEach((field) => {
          const val = currentValues[field];
          const initVal = curInit[field as keyof typeof curInit];
          if (!isFieldUnchanged(field, val, initVal) && val) {
            query[field] = val;
          }
        });

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
            // If in the meantime the user set it back to initial value, do not overwrite with backend result
            const latestVal = lastInputRef.current[key];
            const initVal = lastInitRef.current[key as keyof typeof lastInitRef.current];
            if (isFieldUnchanged(key, latestVal, initVal)) {
              resolved[key] = { isChecking: false, available: null };
              return;
            }

            const checkStatus: FieldCheckStatus = {
              isChecking: false,
              available: val.available,
              message: val.message,
              role: val.role,
            };
            resolved[key] = checkStatus;
            cacheRef.current[key] = {
              value: latestVal ?? '',
              status: checkStatus,
            };
          });

          setStatuses((prev) => ({ ...prev, ...resolved }));
        }
      } catch {
        // Network check failure: clear checking state
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
  }, [
    email,
    phone,
    licensePlate,
    licenseNumber,
    excludeUserId,
    excludeDriverId,
    debounceMs,
    initialValues?.email,
    initialValues?.phone,
    initialValues?.licensePlate,
    initialValues?.licenseNumber,
  ]);

  // Are any fields currently being checked?
  const isCheckingAny = useMemo(
    () => Object.values(statuses).some((s) => s.isChecking),
    [statuses]
  );

  // Are any fields confirmed unavailable/taken?
  // Double-safeguard: unchanged fields are never treated as conflict
  const hasConflict = useMemo(() => {
    return Object.entries(statuses).some(([field, s]) => {
      if (s.available !== false) return false;
      const cur = (options as any)[field];
      const init = options.initialValues?.[field as keyof typeof options.initialValues];
      if (isFieldUnchanged(field, cur, init)) return false;
      return true;
    });
  }, [statuses, options]);

  return {
    statuses,
    availability: statuses,
    isCheckingAny,
    hasConflict,
    canSubmit: !isCheckingAny && !hasConflict,
  };
}
