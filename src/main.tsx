import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Updates apply cleanly on the next cold launch instead of forcing a mid-session reload
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
