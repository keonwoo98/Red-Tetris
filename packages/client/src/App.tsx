import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GameRoute } from './components/GameRoute';
import { Landing } from './components/Landing';

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/:room/:player" element={<GameRoute />} />
    </Routes>
  </BrowserRouter>
);
