import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GameRoute } from './components/GameRoute';
import { HashRedirect } from './components/HashRedirect';
import { Landing } from './components/Landing';

export const App = () => (
  <BrowserRouter>
    {/* accept the legacy hash URL (#room[player]) in addition to the path form */}
    <HashRedirect />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/:room/:player" element={<GameRoute />} />
    </Routes>
  </BrowserRouter>
);
