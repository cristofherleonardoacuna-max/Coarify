import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import Sidebar, { MobileNav } from './components/Sidebar';
import PlayerControls from './components/PlayerControls';
import Queue from './components/Queue';
import Onboarding from './components/Onboarding';
import PartyMode from './components/PartyMode';
import HomePage from './components/HomePage';
import FavoritesPage from './components/FavoritesPage';
import HistoryPage from './components/HistoryPage';
import ConfigPage from './components/ConfigPage';
import { PlaylistsPage, PlaylistDetailPage } from './components/PlaylistsPage';
import { LogoMark } from './components/common/Logo';

export default function App() {
  useKeyboardShortcuts();
  const { theme } = useApp();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <PartyMode />

      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />

          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
              <Route path="/favoritos" element={<FavoritesPage />} />
              <Route path="/historial" element={<HistoryPage />} />
              <Route path="/configuracion" element={<ConfigPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
        </div>
      </div>

      <div className="relative z-20 shrink-0">
        <PlayerControls />
        <MobileNav />
      </div>

      <Queue />
      <Onboarding />

      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 130 }}
        toastOptions={{
          duration: 2600,
          style: {
            background: theme === 'light' ? '#ffffff' : '#1a2233',
            color: theme === 'light' ? '#12203a' : '#eef2fb',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 13,
            padding: '10px 14px',
            boxShadow: 'var(--shadow)',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--accent-ink)' } },
        }}
      />
    </div>
  );
}

/** Cabecera compacta con la marca, visible solo en movil. */
function MobileHeader() {
  return (
    <header
      className="flex shrink-0 items-center gap-2.5 px-4 py-3 lg:hidden"
      style={{ background: 'var(--bg-elev)', borderBottom: '1px solid var(--border)' }}
    >
      <LogoMark size={30} />
      <span className="text-base font-extrabold tracking-tight text-ink">
        COAR<span style={{ color: 'var(--accent)' }}>IFY</span>
      </span>
    </header>
  );
}
