import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyPrefs, loadPrefs } from './lib/a11yPrefs';
import { startMarketing } from './lib/marketingLoaders';

// Saved accessibility preferences apply before the first paint, so the page never flashes without them.
applyPrefs(loadPrefs());
// Marketing tools start only after the visitor accepts the cookie banner (src/consent/).
startMarketing();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
