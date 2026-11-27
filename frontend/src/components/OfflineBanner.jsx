import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner offline" role="status">
      <WifiOff size={16} />
      <span>You are offline. Cached catalog and cart are still available.</span>
      <a href="/offline.html" className="offline-banner-link">
        Offline help
      </a>
    </div>
  );
}
