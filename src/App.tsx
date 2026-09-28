import { useEffect, useRef, useState } from 'react';
import Sidebar, { type TabId } from '@/components/Sidebar';
import NotesModule from '@/components/NotesModule';
import FlashcardsModule from '@/components/FlashcardsModule';
import MCQModule from '@/components/MCQModule';
import AIAssistant from '@/components/AIAssistant';
import SecretChat from '@/components/SecretChat';
import PinModal from '@/components/PinModal';
import type { UnitId } from '@/data/biology';

// A generous interval makes the hidden three-tap entry point practical on
// phones, where rapid taps are less reliable than with a mouse.
const COPYRIGHT_TAP_WINDOW_MS = 800;
const THEME_STORAGE_KEY = 'neet-biology-theme';

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
  } catch {
    // Fall through to the operating-system preference if storage is blocked.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [selectedUnit, setSelectedUnit] = useState<UnitId | 'all'>('all');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSecretChat, setShowSecretChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // The selected theme still works for this visit if storage is unavailable.
    }
  }, [isDarkMode]);

  const handleCopyrightClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current === 3) {
      clickCountRef.current = 0;
      setShowPinModal(true);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, COPYRIGHT_TAP_WINDOW_MS);
  };

  if (showSecretChat) {
    return <SecretChat onClose={() => setShowSecretChat(false)} />;
  }

  return (
    <div className={`app-theme flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedUnit={selectedUnit}
        onUnitChange={setSelectedUnit}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((current) => !current)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col justify-between">
        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'notes' && <NotesModule selectedUnit={selectedUnit} />}
          {activeTab === 'flashcards' && <FlashcardsModule selectedUnit={selectedUnit} />}
          {activeTab === 'mcq' && <MCQModule selectedUnit={selectedUnit} />}
          {activeTab === 'ai' && (
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">NCERT AI Biology Tutor</h2>
              <AIAssistant isOpen={true} onClose={() => setActiveTab('notes')} />
            </div>
          )}
        </main>

        <footer className="border-t border-slate-200/60 bg-white/50 px-4 py-3 text-center text-xs text-slate-400 select-none">
          <p>
            <button
              onClick={handleCopyrightClick}
              title="Copyright"
              className="relative inline-flex h-5 w-5 touch-manipulation items-center justify-center rounded font-semibold text-slate-400 transition-colors hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 after:absolute after:-inset-3 after:content-['']"
              aria-label="Copyright"
            >
              ©
            </button>{' '}
            {new Date().getFullYear()} NEET Biology Revision. All rights reserved.
          </p>
        </footer>
      </div>

      {showPinModal && (
        <PinModal
          onSuccess={() => {
            setShowPinModal(false);
            setShowSecretChat(true);
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}