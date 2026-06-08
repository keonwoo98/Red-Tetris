import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import './styles/theme.css';

// socket.io is fully encapsulated in the store's socketMiddleware (inbound + outbound) — nothing to
// wire up here; importing the store creates it, which registers the inbound listeners once.

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
}
