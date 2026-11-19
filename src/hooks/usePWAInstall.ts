import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'android' | 'ios' | 'windows' | 'other';

declare global {
  interface Window {
    __balcaoDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  const navPlatform = (window.navigator.platform || '').toLowerCase();
  const isIPadOS = navPlatform === 'macintel' && window.navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(ua) || isIPadOS) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  if (/windows|win32|win64/.test(ua) || /win/.test(navPlatform)) {
    return 'windows';
  }
  return 'other';
}

function detectInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /whatsapp|instagram|fbav|fban|line\/|micromessenger|wv\)/.test(ua);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__balcaoDeferredInstallPrompt) {
      return window.__balcaoDeferredInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const [isInAppBrowser] = useState<boolean>(() => detectInAppBrowser());

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    if (window.__balcaoDeferredInstallPrompt && !deferredPrompt) {
      setDeferredPrompt(window.__balcaoDeferredInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__balcaoDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__balcaoDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [deferredPrompt]);

  const install = useCallback(async () => {
    const promptToUse = deferredPrompt ?? window.__balcaoDeferredInstallPrompt ?? null;
    if (!promptToUse) return false;

    try {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        window.__balcaoDeferredInstallPrompt = null;
        setDeferredPrompt(null);
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt ?? (typeof window !== 'undefined' ? window.__balcaoDeferredInstallPrompt : null)),
    isInstalled,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWindows: platform === 'windows',
    isInAppBrowser,
    install,
  };
}
