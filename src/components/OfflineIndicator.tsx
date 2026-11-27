import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { ViewportFormat } from '../hooks/useViewportFormat';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator({
  viewportFormat = 'mobile',
}: {
  viewportFormat?: ViewportFormat;
}) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const positionClass =
    viewportFormat === 'mobile'
      ? 'bottom-20 left-1/2 -translate-x-1/2'
      : viewportFormat === 'tablet-portrait'
      ? 'bottom-5 left-1/2 -translate-x-1/2'
      : 'bottom-5 right-6';

  return (
    <div
      role="status"
      className={`fixed ${positionClass} z-40 flex items-center gap-2 rounded-xl bg-[#B45309] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-lg whitespace-nowrap`}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Modo offline — usando dados salvos</span>
    </div>
  );
}
