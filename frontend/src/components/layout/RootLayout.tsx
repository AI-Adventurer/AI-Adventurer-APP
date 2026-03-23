import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

import SettingsPanel from '@/components/common/SettingsPanel';

export default function RootLayout() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="mx-auto w-full max-w-screen-xl mt-8">
      <Toaster position="top-center" richColors closeButton />

      <SettingsPanel showDebug={showDebug} onShowDebugChange={setShowDebug} />

      <Outlet context={{ showDebug }} />
    </div>
  );
}
