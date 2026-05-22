export type DriverStatus = 'available' | 'busy' | 'offline';
export type RideStatus = 'pending' | 'dispatched' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'operator';
export type OperatorStatus = 'online' | 'away' | 'offline';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  couponBalance: number;
  status: DriverStatus;
  location: {
    lat: number;
    lng: number;
  };
  distance?: number; // Distance from pickup (in km)
}

export interface Ride {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupCoordinates: {
    lat: number;
    lng: number;
  };
  dropoffLocation: string;
  dropoffCoordinates: {
    lat: number;
    lng: number;
  };
  driverId?: string;
  driverName?: string;
  status: RideStatus;
  createdAt: Date;
  updatedAt: Date;
  fare?: number;
}

export interface CouponTransaction {
  id: string;
  driverId: string;
  amount: number;
  type: 'purchase' | 'deduction';
  rideId?: string;
  date: Date;
  balance: number;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: OperatorStatus;
  shift: string;
  joinedDate: Date;
  todayCalls: number;
  todayCustomers: number;
  totalCalls: number;
  totalCustomers: number;
  avgCallDuration: number; // in seconds
}

export interface CallLog {
  id: string;
  operatorId: string;
  operatorName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  duration: number; // in seconds
  rideId?: string;
  status: 'completed' | 'missed' | 'abandoned';
  timestamp: Date;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}