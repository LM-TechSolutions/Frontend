import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  PhoneCall, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { mockOperators, mockCallLogs, mockDrivers } from '../data/mockData';
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

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('today');

  // Calculate statistics
  const totalCalls = mockCallLogs.length;
  const completedCalls = mockCallLogs.filter(c => c.status === 'completed').length;
  const missedCalls = mockCallLogs.filter(c => c.status === 'missed').length;
  const totalDuration = mockCallLogs.reduce((sum, call) => sum + call.duration, 0);
  const avgCallDuration = totalDuration / totalCalls;

  const activeOperators = mockOperators.filter(op => op.status === 'online').length;
  const totalOperators = mockOperators.length;
  const totalCustomersToday = mockOperators.reduce((sum, op) => sum + op.todayCustomers, 0);

  const activeDrivers = mockDrivers.filter(d => d.status !== 'offline').length;
  const totalDrivers = mockDrivers.length;

  // Top performers
  const topPerformers = [...mockOperators]
    .sort((a, b) => b.todayCalls - a.todayCalls)
    .slice(0, 5);

  // Recent calls
  const recentCalls = [...mockCallLogs]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Analytics & Reports</h1>
          <p className="text-sm text-[#6B7280] mt-1">Overview of call center performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Calls</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCalls}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                  <span className="text-xs text-[#10B981]">+12.5% from yesterday</span>
                </div>
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
                <p className="text-sm text-[#6B7280]">Avg Call Duration</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{formatDuration(Math.round(avgCallDuration))}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                  <span className="text-xs text-[#10B981]">-5s from yesterday</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#00BDC3]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Active Operators</p>
                <p className="text-2xl font-semibold text-[#10B981] mt-1">{activeOperators}/{totalOperators}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-[#6B7280]">{Math.round((activeOperators/totalOperators)*100)}% online</span>
                </div>
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
                <p className="text-sm text-[#6B7280]">Total Customers</p>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCustomersToday}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                  <span className="text-xs text-[#10B981]">+18% from yesterday</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#00BDC3]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Completed Calls</p>
                <p className="text-2xl font-semibold text-[#10B981] mt-1">{completedCalls}</p>
                <p className="text-xs text-[#6B7280] mt-1">{Math.round((completedCalls/totalCalls)*100)}% of total</p>
              </div>
              <CheckCircle className="w-10 h-10 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Missed Calls</p>
                <p className="text-2xl font-semibold text-[#EF4444] mt-1">{missedCalls}</p>
                <p className="text-xs text-[#6B7280] mt-1">{Math.round((missedCalls/totalCalls)*100)}% of total</p>
              </div>
              <XCircle className="w-10 h-10 text-[#EF4444]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Active Drivers</p>
                <p className="text-2xl font-semibold text-[#00BDC3] mt-1">{activeDrivers}/{totalDrivers}</p>
                <p className="text-xs text-[#6B7280] mt-1">{Math.round((activeDrivers/totalDrivers)*100)}% available</p>
              </div>
              <Users className="w-10 h-10 text-[#00BDC3]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performers Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((operator, index) => (
                <div key={operator.id} className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00BDC3]/10 text-[#00BDC3] font-semibold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[#111827]">{operator.name}</p>
                      <p className="text-xs text-[#6B7280]">{operator.shift}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#111827]">{operator.todayCalls} calls</p>
                    <p className="text-xs text-[#6B7280]">{operator.todayCustomers} customers</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Call Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Call Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-start justify-between pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[#111827] text-sm">{call.customerName}</p>
                      <Badge 
                        className={
                          call.status === 'completed' 
                            ? 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20' 
                            : call.status === 'missed'
                            ? 'bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20'
                            : 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20'
                        }
                      >
                        {call.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      Handled by {call.operatorName}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {call.timestamp.toLocaleTimeString()} • {formatDuration(call.duration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operator Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operator Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Operator</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#6B7280]">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[#6B7280]">Calls Today</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[#6B7280]">Customers</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[#6B7280]">Avg Duration</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[#6B7280]">Total Calls</th>
                </tr>
              </thead>
              <tbody>
                {mockOperators.map((operator) => (
                  <tr key={operator.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-[#111827] text-sm">{operator.name}</p>
                        <p className="text-xs text-[#6B7280]">{operator.shift}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        className={
                          operator.status === 'online'
                            ? 'bg-[#10B981] text-white hover:bg-[#10B981]'
                            : operator.status === 'away'
                            ? 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]'
                            : 'bg-[#6B7280] text-white hover:bg-[#6B7280]'
                        }
                      >
                        {operator.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-[#111827]">{operator.todayCalls}</td>
                    <td className="py-3 px-4 text-center font-semibold text-[#111827]">{operator.todayCustomers}</td>
                    <td className="py-3 px-4 text-center text-[#6B7280]">{formatDuration(operator.avgCallDuration)}</td>
                    <td className="py-3 px-4 text-center text-[#6B7280]">{operator.totalCalls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
