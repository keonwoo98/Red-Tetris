import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Phase 0 stub. Phase 6 wires Provider + BrowserRouter + bindSocketListeners.
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <div>Red Tetris — scaffolding ready.</div>
    </StrictMode>,
  );
}
