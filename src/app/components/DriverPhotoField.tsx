import { useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Initials } from './coupons/CouponAtoms';
import { compressPhoto } from '../lib/photo';
import { cn } from './ui/utils';
import { useAppContext } from '../contexts/AppContext';

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
  const { t } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    setReading(true);
    try {
      const compressed = await compressPhoto(file, 600);
      onChange(compressed);
      toast.success('Driver photo attached successfully');
    } catch (e: any) {
      toast.error(e?.message ?? t('common.photoReadFailed', 'Could not process photo'));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !reading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || reading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  if (compact) {
    return (
      <div className={cn('relative inline-flex', className)}>
        <button
          type="button"
          disabled={disabled || reading}
          onClick={() => inputRef.current?.click()}
          className="relative shrink-0 rounded-2xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={value ? t('common.changePhoto', 'Change photo') : t('common.addPhoto', 'Add photo')}
        >
          <Initials name={name || t('common.driver', 'Driver')} src={value} className="h-12 w-12 text-sm shadow-xs transition-transform group-hover:scale-105" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {reading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void processFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-2xl border transition-all duration-200 p-3.5',
        isDragging
          ? 'border-primary bg-primary/10 ring-2 ring-primary/25 shadow-sm'
          : value
          ? 'border-border/80 bg-card/60'
          : 'border-dashed border-border/90 hover:border-primary/50 hover:bg-muted/40 bg-muted/20',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar / Photo preview */}
        <div className="relative shrink-0">
          <div
            onClick={() => !disabled && !reading && inputRef.current?.click()}
            className={cn(
              'relative h-18 w-18 rounded-2xl overflow-hidden cursor-pointer group shadow-sm transition-all',
              'ring-2 ring-offset-2',
              value ? 'ring-primary/40' : 'ring-border/60 hover:ring-primary/50'
            )}
          >
            <Initials
              name={name || t('common.driver', 'Driver')}
              src={value}
              className="h-full w-full text-lg rounded-2xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150">
              <Camera className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">
                {value ? 'Change' : 'Upload'}
              </span>
            </div>
            {reading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Info & action buttons */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t('common.profilePhoto', 'Driver Profile Photo')}
            </p>
            {value && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                Attached
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {value
              ? 'Photo will appear on customer ride screens and driver profile.'
              : 'Drag & drop a photo here, or browse from device (JPG, PNG, WebP up to 5MB).'}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={value ? 'outline' : 'default'}
              disabled={disabled || reading}
              onClick={() => inputRef.current?.click()}
              className="h-8 text-xs font-medium gap-1.5"
            >
              {reading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing…
                </>
              ) : value ? (
                <>
                  <ImagePlus className="h-3.5 w-3.5" />
                  Change photo
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  Choose photo
                </>
              )}
            </Button>

            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || reading}
                onClick={() => onChange(null)}
                className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void processFile(e.target.files?.[0])}
      />
    </div>
  );
}
