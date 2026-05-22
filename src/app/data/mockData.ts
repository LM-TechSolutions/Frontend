import { Driver, Ride, CouponTransaction } from '../types';
import type { Operator, CallLog } from '../types';

// Mock drivers data (Addis Ababa coordinates)
export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'Abebe Kebede',
    phone: '+251 911 234567',
    vehicle: 'Toyota Corolla',
    licensePlate: 'AA-3-12345',
    couponBalance: 45,
    status: 'available',
    location: { lat: 9.0320, lng: 38.7469 }
  },
  {
    id: 'd2',
    name: 'Mekdes Alemu',
    phone: '+251 912 345678',
    vehicle: 'Suzuki Swift',
    licensePlate: 'AA-3-67890',
    couponBalance: 23,
    status: 'available',
    location: { lat: 9.0050, lng: 38.7636 }
  },
  {
    id: 'd3',
    name: 'Dawit Tesfaye',
    phone: '+251 913 456789',
    vehicle: 'Honda Civic',
    licensePlate: 'AA-3-11223',
    couponBalance: 67,
    status: 'busy',
    location: { lat: 9.0125, lng: 38.7517 }
  },
  {
    id: 'd4',
    name: 'Sara Bekele',
    phone: '+251 914 567890',
    vehicle: 'Hyundai Accent',
    licensePlate: 'AA-3-44556',
    couponBalance: 12,
    status: 'available',
    location: { lat: 8.9950, lng: 38.7580 }
  },
  {
    id: 'd5',
    name: 'Yohannes Girma',
    phone: '+251 915 678901',
    vehicle: 'Toyota Yaris',
    licensePlate: 'AA-3-77889',
    couponBalance: 8,
    status: 'offline',
    location: { lat: 9.0280, lng: 38.7390 }
  },
  {
    id: 'd6',
    name: 'Hanan Mohammed',
    phone: '+251 916 789012',
    vehicle: 'Nissan Sunny',
    licensePlate: 'AA-3-99001',
    couponBalance: 89,
    status: 'available',
    location: { lat: 9.0400, lng: 38.7550 }
  },
  {
    id: 'd7',
    name: 'Tadesse Worku',
    phone: '+251 917 890123',
    vehicle: 'Kia Rio',
    licensePlate: 'AA-3-22334',
    couponBalance: 34,
    status: 'busy',
    location: { lat: 8.9900, lng: 38.7700 }
  },
  {
    id: 'd8',
    name: 'Bethlehem Haile',
    phone: '+251 918 901234',
    vehicle: 'Toyota Corolla',
    licensePlate: 'AA-3-55667',
    couponBalance: 56,
    status: 'available',
    location: { lat: 9.0200, lng: 38.7450 }
  }
];

// Mock rides data
export const mockRides: Ride[] = [
  {
    id: 'r1',
    customerId: 'c1',
    customerName: 'Yared Solomon',
    customerPhone: '+251 911 111111',
    pickupLocation: 'Bole, near Edna Mall',
    pickupCoordinates: { lat: 9.0092, lng: 38.7881 },
    dropoffLocation: 'Piassa, Churchill Avenue',
    dropoffCoordinates: { lat: 9.0320, lng: 38.7469 },
    status: 'pending',
    createdAt: new Date('2026-04-04T10:15:00'),
    updatedAt: new Date('2026-04-04T10:15:00')
  },
  {
    id: 'r2',
    customerId: 'c2',
    customerName: 'Rahel Negash',
    customerPhone: '+251 912 222222',
    pickupLocation: '4 Kilo, near Addis Ababa University',
    pickupCoordinates: { lat: 9.0351, lng: 38.7618 },
    dropoffLocation: 'Meskel Square',
    dropoffCoordinates: { lat: 9.0125, lng: 38.7517 },
    status: 'pending',
    createdAt: new Date('2026-04-04T10:20:00'),
    updatedAt: new Date('2026-04-04T10:20:00')
  },
  {
    id: 'r3',
    customerId: 'c3',
    customerName: 'Daniel Amare',
    customerPhone: '+251 913 333333',
    pickupLocation: 'Kazanchis, near Sheraton Hotel',
    pickupCoordinates: { lat: 9.0232, lng: 38.7612 },
    dropoffLocation: 'Bole Atlas',
    dropoffCoordinates: { lat: 8.9950, lng: 38.7850 },
    driverId: 'd3',
    driverName: 'Dawit Tesfaye',
    status: 'in_progress',
    createdAt: new Date('2026-04-04T09:30:00'),
    updatedAt: new Date('2026-04-04T10:00:00'),
    fare: 150
  },
  {
    id: 'r4',
    customerId: 'c4',
    customerName: 'Tigist Mulugeta',
    customerPhone: '+251 914 444444',
    pickupLocation: 'CMC, near Friendship City Center',
    pickupCoordinates: { lat: 9.0125, lng: 38.7680 },
    dropoffLocation: 'Gerji, Mebrat Hail',
    dropoffCoordinates: { lat: 9.0422, lng: 38.7985 },
    driverId: 'd7',
    driverName: 'Tadesse Worku',
    status: 'accepted',
    createdAt: new Date('2026-04-04T10:10:00'),
    updatedAt: new Date('2026-04-04T10:12:00'),
    fare: 180
  },
  {
    id: 'r5',
    customerId: 'c5',
    customerName: 'Solomon Desta',
    customerPhone: '+251 915 555555',
    pickupLocation: 'Arat Kilo',
    pickupCoordinates: { lat: 9.0355, lng: 38.7635 },
    dropoffLocation: 'Lideta, near Merkato',
    dropoffCoordinates: { lat: 9.0330, lng: 38.7380 },
    driverId: 'd1',
    driverName: 'Abebe Kebede',
    status: 'completed',
    createdAt: new Date('2026-04-04T08:00:00'),
    updatedAt: new Date('2026-04-04T08:45:00'),
    fare: 120
  }
];

// Mock coupon transactions
export const mockCouponTransactions: CouponTransaction[] = [
  {
    id: 't1',
    driverId: 'd1',
    amount: 50,
    type: 'purchase',
    date: new Date('2026-04-01T09:00:00'),
    balance: 95
  },
  {
    id: 't2',
    driverId: 'd1',
    amount: -5,
    type: 'deduction',
    rideId: 'r5',
    date: new Date('2026-04-04T08:45:00'),
    balance: 45
  },
  {
    id: 't3',
    driverId: 'd2',
    amount: 30,
    type: 'purchase',
    date: new Date('2026-04-03T14:00:00'),
    balance: 23
  },
  {
    id: 't4',
    driverId: 'd3',
    amount: 100,
    type: 'purchase',
    date: new Date('2026-03-28T10:00:00'),
    balance: 100
  },
  {
    id: 't5',
    driverId: 'd3',
    amount: -7,
    type: 'deduction',
    rideId: 'r3',
    date: new Date('2026-04-04T10:00:00'),
    balance: 67
  }
];

export const getDriverById = (id: string): Driver | undefined => {
  return mockDrivers.find(d => d.id === id);
};

export const getRideById = (id: string): Ride | undefined => {
  return mockRides.find(r => r.id === id);
};

export const getCouponTransactionsByDriver = (driverId: string): CouponTransaction[] => {
  return mockCouponTransactions.filter(t => t.driverId === driverId);
};

// Mock operators data
export const mockOperators: Operator[] = [
  {
    id: 'op1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@tekumma.com',
    phone: '+251 911 123456',
    status: 'online',
    shift: 'Morning (8AM-4PM)',
    joinedDate: new Date('2025-01-15'),
    todayCalls: 47,
    todayCustomers: 42,
    totalCalls: 1523,
    totalCustomers: 1401,
    avgCallDuration: 185
  },
  {
    id: 'op2',
    name: 'Michael Chen',
    email: 'michael.chen@tekumma.com',
    phone: '+251 912 234567',
    status: 'online',
    shift: 'Morning (8AM-4PM)',
    joinedDate: new Date('2025-03-10'),
    todayCalls: 38,
    todayCustomers: 35,
    totalCalls: 892,
    totalCustomers: 821,
    avgCallDuration: 192
  },
  {
    id: 'op3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@tekumma.com',
    phone: '+251 913 345678',
    status: 'away',
    shift: 'Afternoon (4PM-12AM)',
    joinedDate: new Date('2024-11-20'),
    todayCalls: 29,
    todayCustomers: 27,
    totalCalls: 2145,
    totalCustomers: 1987,
    avgCallDuration: 178
  },
  {
    id: 'op4',
    name: 'David Thompson',
    email: 'david.thompson@tekumma.com',
    phone: '+251 914 456789',
    status: 'online',
    shift: 'Afternoon (4PM-12AM)',
    joinedDate: new Date('2025-02-01'),
    todayCalls: 52,
    todayCustomers: 48,
    totalCalls: 1234,
    totalCustomers: 1156,
    avgCallDuration: 201
  },
  {
    id: 'op5',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@tekumma.com',
    phone: '+251 915 567890',
    status: 'offline',
    shift: 'Night (12AM-8AM)',
    joinedDate: new Date('2024-09-12'),
    todayCalls: 0,
    todayCustomers: 0,
    totalCalls: 2867,
    totalCustomers: 2634,
    avgCallDuration: 167
  },
  {
    id: 'op6',
    name: 'James Wilson',
    email: 'james.wilson@tekumma.com',
    phone: '+251 916 678901',
    status: 'online',
    shift: 'Morning (8AM-4PM)',
    joinedDate: new Date('2025-04-01'),
    todayCalls: 31,
    todayCustomers: 28,
    totalCalls: 287,
    totalCustomers: 264,
    avgCallDuration: 195
  }
];

// Mock call logs data
export const mockCallLogs: CallLog[] = [
  {
    id: 'cl1',
    operatorId: 'op1',
    operatorName: 'Sarah Johnson',
    customerId: 'c1',
    customerName: 'Yared Solomon',
    customerPhone: '+251 911 111111',
    duration: 156,
    rideId: 'r1',
    status: 'completed',
    timestamp: new Date('2026-04-07T10:15:00'),
    notes: 'Customer requested pickup at Edna Mall'
  },
  {
    id: 'cl2',
    operatorId: 'op1',
    operatorName: 'Sarah Johnson',
    customerId: 'c2',
    customerName: 'Rahel Negash',
    customerPhone: '+251 912 222222',
    duration: 203,
    rideId: 'r2',
    status: 'completed',
    timestamp: new Date('2026-04-07T10:20:00'),
    notes: 'Urgent ride needed'
  },
  {
    id: 'cl3',
    operatorId: 'op2',
    operatorName: 'Michael Chen',
    customerId: 'c10',
    customerName: 'Ahmed Hassan',
    customerPhone: '+251 913 888888',
    duration: 45,
    status: 'missed',
    timestamp: new Date('2026-04-07T09:45:00')
  },
  {
    id: 'cl4',
    operatorId: 'op4',
    operatorName: 'David Thompson',
    customerId: 'c5',
    customerName: 'Solomon Desta',
    customerPhone: '+251 915 555555',
    duration: 178,
    rideId: 'r5',
    status: 'completed',
    timestamp: new Date('2026-04-07T08:00:00'),
    notes: 'Regular customer, prefers Abebe as driver'
  },
  {
    id: 'cl5',
    operatorId: 'op1',
    operatorName: 'Sarah Johnson',
    customerId: 'c12',
    customerName: 'Marta Gebru',
    customerPhone: '+251 917 999999',
    duration: 234,
    rideId: 'r8',
    status: 'completed',
    timestamp: new Date('2026-04-07T11:30:00'),
    notes: 'Multiple stops requested'
  }
];

export const getOperatorById = (id: string): Operator | undefined => {
  return mockOperators.find(o => o.id === id);
};

export const getEmployeeById = (id: string): Driver | Operator | undefined => {
  return getDriverById(id) ?? getOperatorById(id);
};

export const getEmployeeType = (id: string): EmployeeType | undefined => {
  if (mockDrivers.some(d => d.id === id)) {
    return 'driver';
  }
  if (mockOperators.some(o => o.id === id)) {
    return 'operator';
  }
  return undefined;
};

export const getCallLogsByOperator = (operatorId: string): CallLog[] => {
  return mockCallLogs.filter(c => c.operatorId === operatorId);
};