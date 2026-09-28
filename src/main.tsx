import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyPrefs, loadPrefs } from './lib/a11yPrefs';

// Saved accessibility preferences apply before the first paint, so the page never flashes without them.
applyPrefs(loadPrefs());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
