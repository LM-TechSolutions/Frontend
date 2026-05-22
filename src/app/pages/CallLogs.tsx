import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Search,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';
import { mockCallLogs } from '../data/mockData';
import type { CallLog } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getStatusColor = (status: CallLog['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20';
    case 'missed':
      return 'bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20';
    case 'abandoned':
      return 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20';
  }
};

const getStatusIcon = (status: CallLog['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'missed':
      return <XCircle className="w-4 h-4" />;
    case 'abandoned':
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function CallLogs() {
  const [callLogs] = useState<CallLog[]>(mockCallLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<CallLog['status'] | 'all'>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');

  // Get unique operator names
  const operators = Array.from(new Set(callLogs.map(log => log.operatorName))).sort();

  // Filter call logs
  const filteredLogs = callLogs.filter(log => {
    const matchesSearch = 
      log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.customerPhone.includes(searchQuery) ||
      log.operatorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesOperator = filterOperator === 'all' || log.operatorName === filterOperator;

    return matchesSearch && matchesStatus && matchesOperator;
  });

  // Calculate statistics
  const totalCalls = filteredLogs.length;
  const completedCalls = filteredLogs.filter(c => c.status === 'completed').length;
  const missedCalls = filteredLogs.filter(c => c.status === 'missed').length;
  const totalDuration = filteredLogs.reduce((sum, call) => sum + call.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Call Logs</h1>
          <p className="text-sm text-[#6B7280] mt-1">Detailed history of all customer calls</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Calls</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCalls}</p>
              </div>
              <Phone className="w-8 h-8 text-[#00BDC3]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Completed</p>
                <p className="text-2xl font-semibold text-[#10B981] mt-1">{completedCalls}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Missed</p>
                <p className="text-2xl font-semibold text-[#EF4444] mt-1">{missedCalls}</p>
              </div>
              <XCircle className="w-8 h-8 text-[#EF4444]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Avg Duration</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{formatDuration(avgDuration)}</p>
              </div>
              <Clock className="w-8 h-8 text-[#00BDC3]" />
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
                placeholder="Search by customer, phone, or operator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as CallLog['status'] | 'all')}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOperator} onValueChange={setFilterOperator}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {operators.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Operator</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[#6B7280]">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Ride ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-[#6B7280]" />
                        <span className="text-[#111827]">{formatTime(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-[#111827]">{log.customerName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-[#6B7280]">{log.customerPhone}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-[#111827]">{log.operatorName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(log.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <p className="text-sm font-medium text-[#111827]">{formatDuration(log.duration)}</p>
                    </td>
                    <td className="py-3 px-4">
                      {log.rideId ? (
                        <p className="text-sm font-mono text-[#00BDC3]">{log.rideId}</p>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.notes ? (
                        <p className="text-sm text-[#6B7280] max-w-xs truncate">{log.notes}</p>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-[#6B7280]">No call logs found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
