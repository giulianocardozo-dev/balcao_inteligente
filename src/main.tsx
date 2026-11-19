import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
