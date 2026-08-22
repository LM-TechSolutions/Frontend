import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { RoadRoute } from '../lib/route';
import RideLocationPicker, { type PlaceValue } from './RideLocationPicker';
import { useAppContext } from '../contexts/AppContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/** Shared "Create New Ride" dialog with map-based pickup/destination selection. */
export default function NewRideDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useAppContext();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickup, setPickup] = useState<PlaceValue | null>(null);
  const [dropoff, setDropoff] = useState<PlaceValue | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPickup(null);
    setDropoff(null);
    setRoute(null);
  };

  const handleChange = (which: 'pickup' | 'dropoff', v: PlaceValue) => {
    if (which === 'pickup') setPickup(v);
    else setDropoff(v);
  };

  const submit = async () => {
    if (!customerPhone) {
      toast.error('Customer phone is required');
      return;
    }
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and destination on the map');
      return;
    }
    setCreating(true);
    try {
      await api.rides.create({
        customerName: customerName.trim() || undefined,
        customerPhone,
        pickupLocation: pickup.address,
        pickupCoordinates: { lat: pickup.lat, lng: pickup.lng },
        dropoffLocation: dropoff.address,
        dropoffCoordinates: { lat: dropoff.lat, lng: dropoff.lng },
        // Hint for ops — backend still recomputes via Gebeta on dispatch.
        estimatedDistanceKm: route?.distanceKm,
        estimatedDurationMinutes: route?.durationMinutes,
      });
      toast.success('Ride created — dispatching to nearby drivers');
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create ride');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-auto">
        <DialogHeader><DialogTitle>{t('rides.createRide', 'Create New Ride')}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{t('rides.customerName', 'Customer Name')} <span className="text-muted-foreground font-normal">({t('common.optional', 'optional')})</span></Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('dashboard.leaveBlankForGuest', 'Leave blank for Guest')} /></div>
            <div className="space-y-2"><Label>{t('rides.customerPhone', 'Phone *')}</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0911 234567" /></div>
          </div>
          <RideLocationPicker
            pickup={pickup}
            dropoff={dropoff}
            onChange={handleChange}
            onRouteChange={setRoute}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={submit} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('rides.createRide', 'Create Ride')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
