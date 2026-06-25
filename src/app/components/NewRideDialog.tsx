import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import RideLocationPicker, { type PlaceValue } from './RideLocationPicker';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

/** Shared "Create New Ride" dialog with map-based pickup/destination selection. */
export default function NewRideDialog({ open, onOpenChange, onCreated }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickup, setPickup] = useState<PlaceValue | null>(null);
  const [dropoff, setDropoff] = useState<PlaceValue | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPickup(null);
    setDropoff(null);
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
        <DialogHeader><DialogTitle>Create New Ride</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Customer Name <span className="text-muted-foreground font-normal">(optional)</span></Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Leave blank for Guest" /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0911 234567" /></div>
          </div>
          <RideLocationPicker pickup={pickup} dropoff={dropoff} onChange={handleChange} />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={submit} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Create Ride
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
