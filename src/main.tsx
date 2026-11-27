import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const hadSWController =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  Boolean(navigator.serviceWorker.controller);

let swReloading = false;
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadSWController && !swReloading) {
      swReloading = true;
      window.location.reload();
    }
  });
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void registration.update().catch(() => {});
      }
    });
  },
  onNeedRefresh() {
    // Updates apply automatically via skipWaiting + controllerchange on upgrades
  },
});

createRoot(document.getElementById('root')!).render(<App />);

const splashEl = document.getElementById('app-splash');
if (splashEl) {
  if (document.documentElement.classList.contains('skip-splash')) {
    splashEl.remove();
  } else {
    window.setTimeout(() => {
      splashEl.classList.add('is-hidden');
      window.setTimeout(() => {
        splashEl.remove();
      }, 340);
    }, 2400);
  }
}
