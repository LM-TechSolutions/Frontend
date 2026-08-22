const DEVICE_KEY = 'tokuma.deviceId';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'unknown-device';
  }
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  const browser = ua.includes('Edg/')
    ? 'Edge'
    : ua.includes('Chrome/')
      ? 'Chrome'
      : ua.includes('Firefox/')
        ? 'Firefox'
        : ua.includes('Safari/')
          ? 'Safari'
          : 'Browser';
  const os = ua.includes('Windows')
    ? 'Windows'
    : ua.includes('Mac')
      ? 'macOS'
      : ua.includes('Android')
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : ua.includes('Linux')
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}
