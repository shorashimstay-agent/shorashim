// Entry for the legal pages (terms/, privacy/, accessibility/ and their en/ versions). Each HTML file
// names its page and language on <html>.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { applyPrefs, loadPrefs } from '../lib/a11yPrefs';
import LegalPage from './LegalPage';
import type { Lang, PageId } from './content';

applyPrefs(loadPrefs());

const root = document.documentElement;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LegalPage page={root.dataset.page as PageId} lang={root.lang as Lang} />
  </StrictMode>
);
