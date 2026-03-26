import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

export default function RootLayout() {
  return (
    <div className="mx-auto w-full max-w-screen-xl mt-8">
      <Toaster position="top-center" richColors closeButton />
      <Outlet />
    </div>
  );
}
