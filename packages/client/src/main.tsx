import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { bindSocketListeners } from './socket/listeners';
import { store } from './store';
import './styles/theme.css';

// Register inbound socket → redux listeners once.
bindSocketListeners(store.dispatch, store.getState);

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
