export function isIOSStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isIOSDevice =
    /iphone|ipad|ipod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  return isIOSDevice && nav.standalone === true;
}
