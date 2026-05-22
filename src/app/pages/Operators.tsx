import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Phone, 
  Mail, 
  Clock, 
  PhoneCall, 
  Users, 
  Plus,
  Search,
  Timer,
  UserCog
} from 'lucide-react';
import { mockOperators } from '../data/mockData';
import type { Operator, OperatorStatus } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const getStatusColor = (status: OperatorStatus) => {
  switch (status) {
    case 'online':
      return 'bg-[#10B981] text-white';
    case 'away':
      return 'bg-[#F59E0B] text-white';
    case 'offline':
      return 'bg-[#6B7280] text-white';
  }
};

const getStatusText = (status: OperatorStatus) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export default function Operators() {
  const [operators] = useState<Operator[]>(mockOperators);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OperatorStatus | 'all'>('all');

  // Calculate overall statistics
  const totalOperators = operators.length;
  const onlineOperators = operators.filter(op => op.status === 'online').length;
  const totalCallsToday = operators.reduce((sum, op) => sum + op.todayCalls, 0);
  const totalCustomersToday = operators.reduce((sum, op) => sum + op.todayCustomers, 0);

  // Filter operators
  const filteredOperators = operators.filter(op => {
    const matchesSearch = 
      op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.phone.includes(searchQuery);
    
    const matchesStatus = filterStatus === 'all' || op.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Operators Management</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage call center operators and track performance</p>
        </div>
        <AddOperatorDialog />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Operators</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalOperators}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-[#00BDC3]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Online Now</p>
                <p className="text-2xl font-semibold text-[#10B981] mt-1">{onlineOperators}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Calls Today</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCallsToday}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                <PhoneCall className="w-6 h-6 text-[#00BDC3]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Customers Today</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCustomersToday}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#00BDC3]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as OperatorStatus | 'all')}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="away">Away</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Operators List */}
      <div className="grid grid-cols-2 gap-4">
        {filteredOperators.map((operator) => (
          <Card key={operator.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-[#00BDC3]">
                      {operator.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{operator.name}</CardTitle>
                    <p className="text-xs text-[#6B7280] mt-1">{operator.shift}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(operator.status)}>
                  {getStatusText(operator.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Mail className="w-4 h-4" />
                <span>{operator.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Phone className="w-4 h-4" />
                <span>{operator.phone}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-1">
                      <PhoneCall className="w-3 h-3" />
                      <span>Today</span>
                    </div>
                    <p className="text-lg font-semibold text-[#111827]">{operator.todayCalls}</p>
                    <p className="text-xs text-[#6B7280]">calls</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-1">
                      <Users className="w-3 h-3" />
                      <span>Today</span>
                    </div>
                    <p className="text-lg font-semibold text-[#111827]">{operator.todayCustomers}</p>
                    <p className="text-xs text-[#6B7280]">customers</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-1">
                      <Timer className="w-3 h-3" />
                      <span>Avg Time</span>
                    </div>
                    <p className="text-lg font-semibold text-[#111827]">{formatDuration(operator.avgCallDuration)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B7280]">Total Calls</p>
                    <p className="font-semibold text-[#111827]">{operator.totalCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280]">Total Customers</p>
                    <p className="font-semibold text-[#111827]">{operator.totalCustomers.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-2" size="sm">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOperators.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[#6B7280]">No operators found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

function AddOperatorDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    shift: 'Morning (8AM-4PM)'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Operator added successfully!');
    setOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      shift: 'Morning (8AM-4PM)'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Operator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Operator</DialogTitle>
          <DialogDescription>
            Add a new call center operator to the system
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@tekumma.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+251 911 123456"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={formData.shift} onValueChange={(value) => setFormData({ ...formData, shift: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning (8AM-4PM)">Morning (8AM-4PM)</SelectItem>
                <SelectItem value="Afternoon (4PM-12AM)">Afternoon (4PM-12AM)</SelectItem>
                <SelectItem value="Night (12AM-8AM)">Night (12AM-8AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-[#00BDC3] hover:bg-[#009EA3] text-white">
              Add Operator
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
