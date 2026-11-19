import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({immediate: true});

createRoot(document.getElementById('root')!).render(<App />);

const splashEl = document.getElementById('app-splash');
if (splashEl) {
  window.setTimeout(() => {
    splashEl.classList.add('is-hidden');
    window.setTimeout(() => {
      splashEl.remove();
    }, 340);
  }, 2400);
}
