import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <HeaderBar />
        <main className="mx-auto w-full max-w-[1400px] p-4 lg:p-6 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
