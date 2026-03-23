import { Navigate, Route, Routes } from 'react-router-dom';

import Home from '@/pages/Home';
import Game from '@/pages/Game';
import Calibration from '@/pages/Calibration';
import HowToPlay from '@/pages/HowToPlay';
import RootLayout from './components/layout/RootLayout';

function App() {
  return (
    <Routes>
      {/* 主要路由 */}
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/calibration" element={<Calibration />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
      </Route>

      {/* 其他路由 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
