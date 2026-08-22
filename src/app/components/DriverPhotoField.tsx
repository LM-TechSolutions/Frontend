import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Initials } from './coupons/CouponAtoms';
import { compressPhoto } from '../lib/photo';
import { cn } from './ui/utils';

interface DriverPhotoFieldProps {
  name: string;
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export default function DriverPhotoField({
  name,
  value,
  onChange,
  disabled,
  className,
  compact,
}: DriverPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      onChange(await compressPhoto(file));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not read that photo');
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        disabled={disabled || reading}
        onClick={() => inputRef.current?.click()}
        className="relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={value ? 'Change photo' : 'Add photo'}
      >
        <Initials name={name || 'Driver'} src={value} className={compact ? 'h-12 w-12 text-sm' : 'h-16 w-16 text-base'} />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm">
          {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </span>
      </button>
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">Square works best. JPEG or PNG.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={disabled || reading} onClick={() => inputRef.current?.click()}>
              {value ? 'Change' : 'Add photo'}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={disabled || reading}
                onClick={() => onChange(null)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
