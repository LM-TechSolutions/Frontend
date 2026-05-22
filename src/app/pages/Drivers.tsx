import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Edit, Key, Eye } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { mockDrivers } from '../data/mockData';
import { Driver } from '../types';
import { toast } from 'sonner';

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const navigate = useNavigate();
  const [editDriverOpen, setEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    vehicle: '',
    licensePlate: '',
    couponBalance: 0
  });
  const [editDriver, setEditDriver] = useState({
    name: '',
    phone: '',
    vehicle: '',
    licensePlate: '',
    couponBalance: 0
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      available: 'bg-[#10B981] text-white',
      busy: 'bg-[#EF4444] text-white',
      offline: 'bg-[#6B7280] text-white'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getCouponBadge = (balance: number) => {
    if (balance < 15) return 'bg-[#EF4444] text-white';
    if (balance < 30) return 'bg-[#F59E0B] text-white';
    return 'bg-[#10B981] text-white';
  };

  const filteredDrivers = drivers.filter(driver => {
    return (
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddDriver = () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.vehicle || !newDriver.licensePlate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const driver: Driver = {
      id: `d${drivers.length + 1}`,
      name: newDriver.name,
      phone: newDriver.phone,
      vehicle: newDriver.vehicle,
      licensePlate: newDriver.licensePlate,
      couponBalance: newDriver.couponBalance,
      status: 'offline',
      location: { lat: 9.0320, lng: 38.7469 }
    };

    setDrivers([...drivers, driver]);
    setAddDriverOpen(false);
    setNewDriver({ name: '', phone: '', vehicle: '', licensePlate: '', couponBalance: 0 });
    toast.success('Driver added successfully!');
  };

  const handleEditDriver = () => {
    if (!editingDriver || !editDriver.name || !editDriver.phone || !editDriver.vehicle || !editDriver.licensePlate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setDrivers(drivers.map((driver) => {
      if (driver.id !== editingDriver.id) return driver;
      return {
        ...driver,
        name: editDriver.name,
        phone: editDriver.phone,
        vehicle: editDriver.vehicle,
        licensePlate: editDriver.licensePlate,
        couponBalance: editDriver.couponBalance,
      };
    }));

    setEditDriverOpen(false);
    setEditingDriver(null);
    setEditDriver({ name: '', phone: '', vehicle: '', licensePlate: '', couponBalance: 0 });
    toast.success('Driver updated successfully!');
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDriver({
      name: driver.name,
      phone: driver.phone,
      vehicle: driver.vehicle,
      licensePlate: driver.licensePlate,
      couponBalance: driver.couponBalance,
    });
    setEditDriverOpen(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#111827] mb-1">Driver Management</h2>
        <p className="text-[#6B7280]">Manage your driver fleet</p>
      </div>

      {/* Search and Add */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              placeholder="Search by Name, Phone, Vehicle, License Plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={addDriverOpen} onOpenChange={setAddDriverOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    placeholder="Enter driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="+251 911 234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle Model *</Label>
                  <Input
                    id="vehicle"
                    value={newDriver.vehicle}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicle: e.target.value })}
                    placeholder="e.g., Toyota Corolla"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate *</Label>
                  <Input
                    id="licensePlate"
                    value={newDriver.licensePlate}
                    onChange={(e) => setNewDriver({ ...newDriver, licensePlate: e.target.value })}
                    placeholder="e.g., AA-3-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="couponBalance">Initial Coupon Balance</Label>
                  <Input
                    id="couponBalance"
                    type="number"
                    value={newDriver.couponBalance}
                    onChange={(e) => setNewDriver({ ...newDriver, couponBalance: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAddDriverOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                  onClick={handleAddDriver}
                >
                  Add Driver
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDriverOpen} onOpenChange={setEditDriverOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Full Name *</Label>
                  <Input
                    id="editName"
                    value={editDriver.name}
                    onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })}
                    placeholder="Enter driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone Number *</Label>
                  <Input
                    id="editPhone"
                    value={editDriver.phone}
                    onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
                    placeholder="+251 911 234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editVehicle">Vehicle Model *</Label>
                  <Input
                    id="editVehicle"
                    value={editDriver.vehicle}
                    onChange={(e) => setEditDriver({ ...editDriver, vehicle: e.target.value })}
                    placeholder="e.g., Toyota Corolla"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLicensePlate">License Plate *</Label>
                  <Input
                    id="editLicensePlate"
                    value={editDriver.licensePlate}
                    onChange={(e) => setEditDriver({ ...editDriver, licensePlate: e.target.value })}
                    placeholder="e.g., AA-3-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCouponBalance">Coupon Balance</Label>
                  <Input
                    id="editCouponBalance"
                    type="number"
                    value={editDriver.couponBalance}
                    onChange={(e) => setEditDriver({ ...editDriver, couponBalance: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditDriverOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                  onClick={handleEditDriver}
                >
                  Update Driver
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4">
          <p className="text-sm text-[#6B7280] mb-1">Total Drivers</p>
          <p className="text-3xl font-semibold text-[#111827]">{drivers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4">
          <p className="text-sm text-[#6B7280] mb-1">Available</p>
          <p className="text-3xl font-semibold text-[#10B981]">
            {drivers.filter(d => d.status === 'available').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4">
          <p className="text-sm text-[#6B7280] mb-1">Busy</p>
          <p className="text-3xl font-semibold text-[#EF4444]">
            {drivers.filter(d => d.status === 'busy').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="font-semibold">Driver Name</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Vehicle</TableHead>
              <TableHead className="font-semibold">License Plate</TableHead>
              <TableHead className="font-semibold">Coupon Balance</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrivers.map((driver) => (
              <TableRow key={driver.id} className="hover:bg-[#F9FAFB]">
                <TableCell className="font-medium text-[#111827]">{driver.name}</TableCell>
                <TableCell className="text-sm text-[#6B7280]">{driver.phone}</TableCell>
                <TableCell className="text-sm text-[#6B7280]">{driver.vehicle}</TableCell>
                <TableCell className="text-sm text-[#6B7280]">{driver.licensePlate}</TableCell>
                <TableCell>
                  <Badge className={getCouponBadge(driver.couponBalance)}>
                    {driver.couponBalance} coupons
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(driver.status)}>
                    {driver.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(driver)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/employees/${driver.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredDrivers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6B7280]">No drivers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
