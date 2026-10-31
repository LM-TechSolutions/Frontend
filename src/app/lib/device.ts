const DEVICE_KEY = 'tokuma.deviceId';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    let id: string;
    if (
      typeof globalThis.crypto !== 'undefined' &&
      typeof (globalThis.crypto as Crypto).randomUUID === 'function'
    ) {
      id = (globalThis.crypto as Crypto).randomUUID();
    } else {
      // Fallback for environments without crypto.randomUUID (old browsers, Jest, etc.)
      id =
        'web-' +
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).substring(2, 10);
    }
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'web-' + Math.random().toString(36).substring(2, 10);
  }
}

export function getDeviceName(): string {
  try {
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
  } catch {
    return 'Web Browser';
  }
}
