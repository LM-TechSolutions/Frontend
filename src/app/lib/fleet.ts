/** Fleet buckets the dashboard and drivers map actually count. */
export type FleetBucket = 'available' | 'busy' | 'offline';

const BUSY_RIDE = new Set(['accepted', 'arrived', 'in_progress', 'dispatched']);
const FREE_RIDE = new Set(['completed', 'cancelled', 'expired', 'pending', 'unassigned']);

/**
 * Socket `driver:status` sends `online` / `offline` / `on_break`.
 * REST sends `available` / `busy` / `offline`. Map both onto the UI buckets
 * without wiping a driver who is already on a trip.
 */
export function patchDriverDuty(driver: any, payload: any) {
  const isOnline =
    typeof payload.isOnline === 'boolean'
      ? payload.isOnline
      : payload.status !== 'offline' && payload.status !== 'on_break';
  const onBreak = payload.isOnBreak === true || payload.status === 'on_break';

  if (!isOnline || onBreak) {
    return { ...driver, isOnline: false, status: 'offline' as FleetBucket };
  }

  const busy =
    payload.status === 'busy' ||
    driver.status === 'busy' ||
    Boolean(driver.currentRideId);

  return {
    ...driver,
    isOnline: true,
    isAvailable: payload.isAvailable ?? !busy,
    status: (busy ? 'busy' : 'available') as FleetBucket,
  };
}

/** A ride event that names a driver should flip them busy or free immediately. */
export function patchDriverFromRide(driver: any, event: string, payload: any) {
  const driverId = payload?.driverId;
  if (!driverId || driver.id !== driverId) return driver;

  const rideStatus =
    payload?.status ??
    (event === 'ride:accepted'
      ? 'accepted'
      : event === 'ride:arrived'
        ? 'arrived'
        : event === 'ride:started'
          ? 'in_progress'
          : event === 'ride:completed'
            ? 'completed'
            : event === 'ride:cancelled'
              ? 'cancelled'
              : undefined);

  const rideId = payload?.rideId ?? payload?.id;
  const offline = driver.status === 'offline' || driver.isOnline === false;

  if (rideStatus && BUSY_RIDE.has(rideStatus)) {
    return {
      ...driver,
      currentRideId: rideId ?? driver.currentRideId,
      status: offline ? 'offline' : 'busy',
    };
  }

  if (rideStatus && FREE_RIDE.has(rideStatus)) {
    if (driver.currentRideId && rideId && driver.currentRideId !== rideId) return driver;
    return {
      ...driver,
      currentRideId: null,
      status: offline ? 'offline' : 'available',
    };
  }

  return driver;
}

export function impliedRideStatus(event: string, payload: any): string | undefined {
  if (payload?.status) return payload.status;
  if (event === 'ride:accepted') return 'accepted';
  if (event === 'ride:arrived') return 'arrived';
  if (event === 'ride:started') return 'in_progress';
  if (event === 'ride:completed') return 'completed';
  if (event === 'ride:cancelled') return 'cancelled';
  return undefined;
}
