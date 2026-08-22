import { useState } from 'react';
import { format, startOfMonth, subDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

import { useAppContext } from '../contexts/AppContext';

export type { DateRange };

export default function DateRangePicker({
  value,
  onChange,
  className,
  align = 'start',
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
}) {
  const { t } = useAppContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  const presets: Array<{ label: string; build: () => DateRange }> = [
    { label: t('common.today'), build: () => ({ from: new Date(), to: new Date() }) },
    { label: t('common.last7Days'), build: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: t('common.last30Days'), build: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: t('common.thisMonth'), build: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  ];

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'd MMM')} - ${format(value.to, 'd MMM yyyy')}`
      : format(value.from, 'd MMM yyyy')
    : t('common.selectDates');

  const commit = (range: DateRange | undefined) => {
    setDraft(range);
    // Wait for a complete range so a single click doesn't reload the report.
    if (range?.from && range?.to) {
      onChange(range);
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-10 justify-start gap-2 font-normal', !value?.from && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 gap-1 border-b border-border p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start whitespace-nowrap text-xs"
                onClick={() => {
                  const range = preset.build();
                  setDraft(range);
                  onChange(range);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="range"
            defaultMonth={draft?.from ?? new Date()}
            selected={draft}
            onSelect={commit}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
